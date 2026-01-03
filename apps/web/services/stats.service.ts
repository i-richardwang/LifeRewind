import { getItemCountsBySource, getDailyItemCounts } from '@/db/queries/items';
import type { SourceType } from '@/db/schema';

export interface StatsParams {
  from?: Date;
  to?: Date;
}

export interface StatsOverview {
  totalItems: number;
  gitCommits: number;
  browserVisits: number;
  filesChanged: number;
  chatSessions: number;
}

export interface DailyStats {
  date: string;
  git: number;
  browser: number;
  filesystem: number;
  chatbot: number;
}

export interface StatsResult {
  overview: StatsOverview;
  bySource: { sourceType: SourceType; count: number }[];
  dailyStats: DailyStats[];
}

/**
 * Get statistics for collected items
 */
export async function getStats(params: StatsParams = {}): Promise<StatsResult> {
  const { from, to } = params;

  const [bySource, byDate] = await Promise.all([
    getItemCountsBySource({ from, to }),
    getDailyItemCounts({ from, to }),
  ]);

  // Build overview
  const overview: StatsOverview = {
    totalItems: bySource.reduce((sum, s) => sum + s.count, 0),
    gitCommits: bySource.find((s) => s.sourceType === 'git')?.count ?? 0,
    browserVisits: bySource.find((s) => s.sourceType === 'browser')?.count ?? 0,
    filesChanged: bySource.find((s) => s.sourceType === 'filesystem')?.count ?? 0,
    chatSessions: bySource.find((s) => s.sourceType === 'chatbot')?.count ?? 0,
  };

  // Transform daily stats
  const dateMap = new Map<string, DailyStats>();
  for (const row of byDate) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { date: row.date, git: 0, browser: 0, filesystem: 0, chatbot: 0 });
    }
    const entry = dateMap.get(row.date)!;
    entry[row.sourceType as keyof Omit<DailyStats, 'date'>] = row.count;
  }

  return {
    overview,
    bySource,
    dailyStats: Array.from(dateMap.values()),
  };
}
