import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  collectedItems,
  collectionLogs,
  type SourceType,
  type NewCollectedItem,
  type CollectedItemData,
} from '@/db/schema';
import { validateApiKey } from '@/lib/auth';

// Zod schemas for request validation
const gitCommitSchema = z.object({
  hash: z.string(),
  repository: z.string(),
  authorName: z.string(),
  authorEmail: z.string(),
  date: z.string(),
  message: z.string(),
  stats: z.object({
    filesChanged: z.number(),
    insertions: z.number(),
    deletions: z.number(),
  }),
});

const browserHistorySchema = z.object({
  url: z.string(),
  title: z.string(),
  visitTime: z.string(),
  visitCount: z.number(),
  browser: z.enum(['chrome', 'safari', 'arc', 'dia', 'comet']),
  profile: z.string().optional(),
});

const filesystemSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
  eventType: z.enum(['create', 'modify', 'delete']),
  modifiedAt: z.string(),
  fileSize: z.number(),
  extension: z.string(),
  mimeType: z.string().optional(),
  contentPreview: z.string().optional(),
  parentDirectory: z.string(),
});

const chatbotMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  model: z.string().optional(),
  createdAt: z.string(),
  files: z.array(z.string()).optional(),
  reasoningContent: z.string().optional(),
});

const chatbotSchema = z.object({
  client: z.literal('chatwise'),
  session: z.object({
    id: z.string(),
    title: z.string(),
    model: z.string().optional(),
    createdAt: z.string(),
    lastReplyAt: z.string(),
    messageCount: z.number(),
  }),
  messages: z.array(chatbotMessageSchema),
});

const sourceTypeSchema = z.enum(['git', 'browser', 'filesystem', 'chatbot']);

const collectedItemSchema = z.object({
  sourceType: sourceTypeSchema,
  timestamp: z.string(),
  data: z.union([gitCommitSchema, browserHistorySchema, filesystemSchema, chatbotSchema]),
});

const ingestRequestSchema = z.object({
  sourceType: sourceTypeSchema,
  collectedAt: z.string(),
  items: z.array(collectedItemSchema),
});

type GitCommitPayload = z.infer<typeof gitCommitSchema>;
type BrowserHistoryPayload = z.infer<typeof browserHistorySchema>;
type FilesystemPayload = z.infer<typeof filesystemSchema>;
type ChatbotMessagePayload = z.infer<typeof chatbotMessageSchema>;
type ChatbotPayload = z.infer<typeof chatbotSchema>;
type CollectedItemPayload = z.infer<typeof collectedItemSchema>;

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

function transformFilesystemItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as FilesystemPayload;
  const modifiedTimestamp = new Date(data.modifiedAt);

  return {
    sourceType: 'filesystem',
    timestamp: modifiedTimestamp,
    title: data.fileName,
    url: `file://${data.filePath}`,
    data: {
      filePath: data.filePath,
      eventType: data.eventType,
      fileSize: data.fileSize,
      extension: data.extension,
      mimeType: data.mimeType,
      contentPreview: data.contentPreview,
      parentDirectory: data.parentDirectory,
    },
    uniqueKey: `filesystem:${data.filePath}:${modifiedTimestamp.toISOString()}`,
    collectedAt,
  };
}

function transformChatbotItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as ChatbotPayload;

  return {
    sourceType: 'chatbot',
    timestamp: new Date(data.session.lastReplyAt),
    title: data.session.title,
    url: null,
    data: {
      client: data.client,
      sessionId: data.session.id,
      sessionTitle: data.session.title,
      model: data.session.model,
      messages: data.messages.map((msg) => ({
        id: msg.id,
        chatId: msg.chatId,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        createdAt: msg.createdAt,
        files: msg.files,
        reasoningContent: msg.reasoningContent,
      })),
    },
    uniqueKey: `chatbot:${data.client}:${data.session.id}`,
    collectedAt,
  };
}

function transformItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  switch (item.sourceType) {
    case 'git':
      return transformGitItem(item, collectedAt);
    case 'browser':
      return transformBrowserItem(item, collectedAt);
    case 'filesystem':
      return transformFilesystemItem(item, collectedAt);
    case 'chatbot':
      return transformChatbotItem(item, collectedAt);
    default: {
      // Fallback for future data sources
      const itemTimestamp = new Date(item.timestamp);
      return {
        sourceType: item.sourceType,
        timestamp: itemTimestamp,
        title: null,
        url: null,
        data: item.data as CollectedItemData,
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
    const rawBody: unknown = await request.json();
    const parseResult = ingestRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { sourceType, collectedAt, items } = parseResult.data;
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
