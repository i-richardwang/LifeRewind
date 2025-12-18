import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { collectedItems, collectionLogs, type SourceType, type NewCollectedItem } from '@/db/schema';
import { validateApiKey } from '@/lib/auth';

interface GitCommitPayload {
  hash: string;
  repository: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

interface BrowserHistoryPayload {
  url: string;
  title: string;
  visitTime: string;
  visitCount: number;
  browser: 'chrome' | 'safari' | 'arc' | 'dia' | 'comet';
  profile?: string;
}

interface CollectedItemPayload {
  sourceType: SourceType;
  timestamp: string;
  data: GitCommitPayload | BrowserHistoryPayload;
}

interface IngestRequestBody {
  sourceType: SourceType;
  collectedAt: string;
  items: CollectedItemPayload[];
}

function transformGitItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as GitCommitPayload;
  const lines = data.message.split('\n');
  const title = lines[0];
  const messageBody = lines.slice(1).join('\n').trim() || undefined;

  return {
    sourceType: 'git',
    timestamp: new Date(data.date),
    title,
    url: null,
    data: {
      hash: data.hash,
      repository: data.repository,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      messageBody,
      stats: data.stats,
    },
    uniqueKey: `git:${data.hash}`,
    collectedAt,
  };
}

function transformBrowserItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as BrowserHistoryPayload;
  const visitTimestamp = new Date(data.visitTime);

  return {
    sourceType: 'browser',
    timestamp: visitTimestamp,
    title: data.title,
    url: data.url,
    data: {
      browser: data.browser,
      profile: data.profile,
      visitCount: data.visitCount,
    },
    uniqueKey: `browser:${data.url}:${data.browser}:${visitTimestamp.toISOString()}`,
    collectedAt,
  };
}

function transformItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  switch (item.sourceType) {
    case 'git':
      return transformGitItem(item, collectedAt);
    case 'browser':
      return transformBrowserItem(item, collectedAt);
    default: {
      // For future data sources, generate a generic unique key
      const itemTimestamp = new Date(item.timestamp);
      return {
        sourceType: item.sourceType,
        timestamp: itemTimestamp,
        title: null,
        url: null,
        data: item.data as never,
        uniqueKey: `${item.sourceType}:${itemTimestamp.toISOString()}:${JSON.stringify(item.data)}`,
        collectedAt,
      };
    }
  }
}

export async function POST(request: NextRequest) {
  // Validate API Key
  if (!validateApiKey(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: IngestRequestBody = await request.json();
    const { sourceType, collectedAt, items } = body;

    if (!sourceType || !collectedAt || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const collectedAtDate = new Date(collectedAt);
    const transformedItems = items.map((item) => transformItem(item, collectedAtDate));

    // Batch insert with conflict handling
    let itemsInserted = 0;
    if (transformedItems.length > 0) {
      const result = await db
        .insert(collectedItems)
        .values(transformedItems)
        .onConflictDoNothing()
        .returning({ id: collectedItems.id });

      itemsInserted = result.length;
    }

    // Log the collection
    await db.insert(collectionLogs).values({
      sourceType,
      itemsCount: items.length,
      collectedAt: collectedAtDate,
    });

    return NextResponse.json({
      success: true,
      itemsReceived: items.length,
      itemsInserted,
      message: 'Data ingested successfully',
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
