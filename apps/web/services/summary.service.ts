import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { AppError } from '@/lib/api/errors';
import { findItems } from '@/db/queries/items';
import { findSummaries, createSummary } from '@/db/queries/summaries';
import type {
  CollectedItem,
  GitData,
  BrowserData,
  FilesystemData,
  ChatbotData,
  SummaryPeriod,
  Summary,
} from '@/db/schema';

// Lazy-loaded LLM provider
function getLLM() {
  return createOpenAICompatible({
    name: 'liferewind-llm',
    baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.LLM_API_KEY || '',
  });
}

export interface ListSummariesParams {
  period?: SummaryPeriod;
  limit?: number;
}

export interface GenerateSummaryParams {
  period: SummaryPeriod;
  date: Date;
}

/**
 * List existing summaries
 */
export async function listSummaries(params: ListSummariesParams = {}): Promise<Summary[]> {
  return findSummaries({
    period: params.period,
    limit: Math.min(params.limit ?? 10, 50),
  });
}

/**
 * Generate a new AI summary for a given period
 */
export async function generateSummary(params: GenerateSummaryParams): Promise<Summary> {
  const { period, date } = params;
  const { periodStart, periodEnd } = getPeriodRange(period, date);

  // Fetch all items in the period
  const items = await findItems({
    from: periodStart,
    to: periodEnd,
    limit: 5000,
  });

  if (items.length === 0) {
    throw AppError.badRequest('No data found for the specified period');
  }

  // Aggregate data
  const aggregatedData = aggregateData(items);

  // Generate AI summary
  const { title, content, highlights } = await generateAIContent(
    period,
    periodStart,
    periodEnd,
    aggregatedData
  );

  // Save to database
  return createSummary({
    period,
    periodStart,
    periodEnd,
    title,
    content,
    highlights,
    dataStats: {
      gitCommits: aggregatedData.git.commits.length,
      browserVisits: aggregatedData.browser.totalVisits,
      filesChanged: aggregatedData.filesystem.files.length,
      chatSessions: aggregatedData.chatbot.sessions.length,
    },
  });
}

// Helper functions

function getPeriodRange(period: SummaryPeriod, date: Date) {
  if (period === 'week') {
    return {
      periodStart: startOfWeek(date, { weekStartsOn: 1 }),
      periodEnd: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }
  return {
    periodStart: startOfMonth(date),
    periodEnd: endOfMonth(date),
  };
}

interface AggregatedData {
  git: {
    commits: Array<{
      repo: string;
      message: string;
      date: string;
      files: string[];
      stats: { insertions: number; deletions: number };
    }>;
    repoStats: Record<string, { commits: number; insertions: number; deletions: number }>;
  };
  browser: {
    totalVisits: number;
    topDomains: Array<{ domain: string; visits: number }>;
    topPages: Array<{ title: string; url: string; visits: number }>;
  };
  filesystem: {
    files: Array<{ name: string; path: string; type: string }>;
    byExtension: Record<string, number>;
    byDirectory: Record<string, number>;
  };
  chatbot: {
    sessions: Array<{ title: string; messageCount: number }>;
    totalMessages: number;
  };
}

function aggregateData(items: CollectedItem[]): AggregatedData {
  const result: AggregatedData = {
    git: { commits: [], repoStats: {} },
    browser: { totalVisits: 0, topDomains: [], topPages: [] },
    filesystem: { files: [], byExtension: {}, byDirectory: {} },
    chatbot: { sessions: [], totalMessages: 0 },
  };

  const domainCounts: Record<string, number> = {};
  const pageCounts: Record<string, { title: string; url: string; visits: number }> = {};

  for (const item of items) {
    switch (item.sourceType) {
      case 'git': {
        const data = item.data as GitData;
        result.git.commits.push({
          repo: data.repository,
          message: item.title || data.hash,
          date: item.timestamp.toISOString(),
          files: data.stats.files || [],
          stats: { insertions: data.stats.insertions, deletions: data.stats.deletions },
        });

        if (!result.git.repoStats[data.repository]) {
          result.git.repoStats[data.repository] = { commits: 0, insertions: 0, deletions: 0 };
        }
        const repoStat = result.git.repoStats[data.repository]!;
        repoStat.commits++;
        repoStat.insertions += data.stats.insertions;
        repoStat.deletions += data.stats.deletions;
        break;
      }

      case 'browser': {
        const data = item.data as BrowserData;
        result.browser.totalVisits += data.dailyVisitCount;

        try {
          const url = new URL(item.url || '');
          domainCounts[url.hostname] = (domainCounts[url.hostname] || 0) + data.dailyVisitCount;

          // Track individual pages with titles
          const pageKey = item.url || '';
          if (pageKey && item.title) {
            if (!pageCounts[pageKey]) {
              pageCounts[pageKey] = { title: item.title, url: pageKey, visits: 0 };
            }
            pageCounts[pageKey].visits += data.dailyVisitCount;
          }
        } catch {
          // Invalid URL, skip
        }
        break;
      }

      case 'filesystem': {
        const data = item.data as FilesystemData;
        const fileName = data.filePath.split('/').pop() || data.filePath;
        result.filesystem.files.push({
          name: fileName,
          path: data.filePath,
          type: data.eventType,
        });

        const ext = data.extension || 'unknown';
        result.filesystem.byExtension[ext] = (result.filesystem.byExtension[ext] || 0) + 1;

        // Track by parent directory
        const dir = data.parentDirectory || data.filePath.split('/').slice(0, -1).join('/') || '/';
        result.filesystem.byDirectory[dir] = (result.filesystem.byDirectory[dir] || 0) + 1;
        break;
      }

      case 'chatbot': {
        const data = item.data as ChatbotData;
        result.chatbot.sessions.push({
          title: data.sessionTitle,
          messageCount: data.messages.length,
        });
        result.chatbot.totalMessages += data.messages.length;
        break;
      }
    }
  }

  // Sort domains by visit count
  result.browser.topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, visits]) => ({ domain, visits }));

  // Sort pages by visit count
  result.browser.topPages = Object.values(pageCounts)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 15);

  return result;
}

async function generateAIContent(
  period: SummaryPeriod,
  periodStart: Date,
  periodEnd: Date,
  data: AggregatedData
): Promise<{ title: string; content: string; highlights: string[] }> {
  const periodLabel = period === 'week' ? 'Weekly' : 'Monthly';
  const dateRange = `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;
  const context = buildPromptContext(data);
  const language = process.env.LLM_LANGUAGE || 'English';

  const prompt = `You are analyzing a user's digital footprints to create a ${periodLabel.toLowerCase()} life review summary.

Period: ${dateRange}

<digital-footprints>
${context}
</digital-footprints>

Based on the data above, generate a thoughtful, personal summary that:
1. Highlights the main activities and focus areas
2. Identifies patterns or themes in work and learning
3. Provides gentle insights or reflections
4. Uses a warm, encouraging tone

IMPORTANT: Write all content values in ${language}. Keep JSON keys in English exactly as shown.

Respond in JSON format (keys must be exactly "title", "content", "highlights"):
{
  "title": "A short, engaging title in ${language}",
  "content": "A 2-3 paragraph summary in markdown format, written in ${language}. Be specific about projects, topics, and activities.",
  "highlights": ["3-5 key highlights in ${language}"]
}`;

  const llm = getLLM();
  const { text } = await generateText({
    model: llm(process.env.LLM_MODEL || 'gpt-4o'),
    prompt,
    maxOutputTokens: 1000,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || `${periodLabel} Review`,
      content: parsed.content || 'Summary generation failed.',
      highlights: parsed.highlights || [],
    };
  } catch {
    return {
      title: `${periodLabel} Review (${dateRange})`,
      content: text,
      highlights: [],
    };
  }
}

function buildPromptContext(data: AggregatedData): string {
  const sections: string[] = [];

  if (data.git.commits.length > 0) {
    const repoSummary = Object.entries(data.git.repoStats)
      .map(([repo, stats]) => `- ${repo}: ${stats.commits} commits (+${stats.insertions}/-${stats.deletions})`)
      .join('\n');

    const commitDetails = data.git.commits
      .map((c) => {
        let filesStr = '';
        if (c.files.length > 0) {
          const shownFiles = c.files.slice(0, 5);
          const remaining = c.files.length - 5;
          filesStr = ` [files: ${shownFiles.join(', ')}${remaining > 0 ? `, +${remaining} more` : ''}]`;
        }
        return `- [${c.repo}] ${c.message} (+${c.stats.insertions}/-${c.stats.deletions})${filesStr}`;
      })
      .join('\n');

    sections.push(`<git-activity>
Total commits: ${data.git.commits.length}

Repositories:
${repoSummary}

Commits:
${commitDetails}
</git-activity>`);
  }

  if (data.browser.totalVisits > 0) {
    const topPages = data.browser.topPages
      .slice(0, 50)
      .map((p) => `- "${p.title}" (${p.visits} visits)`)
      .join('\n');

    sections.push(`<web-browsing>
Total page visits: ${data.browser.totalVisits}

Top visited pages:
${topPages}
</web-browsing>`);
  }

  if (data.filesystem.files.length > 0) {
    const byDir = Object.entries(data.filesystem.byDirectory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dir, count]) => `- ${dir}: ${count} files`)
      .join('\n');

    const fileList = data.filesystem.files
      .slice(0, 50)
      .map((f) => `- [${f.type}] ${f.name}`)
      .join('\n');

    sections.push(`<file-activity>
Files modified: ${data.filesystem.files.length}

By directory:
${byDir}

Modified files:
${fileList}
</file-activity>`);
  }

  if (data.chatbot.sessions.length > 0) {
    const allSessions = data.chatbot.sessions
      .map((s) => `- "${s.title}" (${s.messageCount} messages)`)
      .join('\n');

    sections.push(`<ai-chat-sessions>
Total sessions: ${data.chatbot.sessions.length}
Total messages: ${data.chatbot.totalMessages}

All chat sessions:
${allSessions}
</ai-chat-sessions>`);
  }

  return sections.join('\n\n');
}
