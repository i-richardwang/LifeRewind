import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { collectedItems, collectionLogs, type NewCollectedItem } from '@/db/schema';
import { validateApiKey } from '@/lib/auth';

const MAX_ITEMS_PER_REQUEST = 1000;
const BATCH_SIZE = 50;

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

interface ApiSuccessResponse<T = null> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
    requestId?: string;
  };
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: string[],
  requestId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: { code, message, details, requestId },
    },
    { status }
  );
}

function createSuccessResponse<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true as const,
    data,
  });
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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
    files: z.array(z.string()),
  }),
});

const browserHistorySchema = z.object({
  url: z.string(),
  title: z.string(),
  browser: z.enum(['chrome', 'safari', 'arc', 'dia', 'comet']),
  profiles: z.array(z.string()).max(100),
  date: z.string(),
  timezone: z.string(),
  dailyVisitCount: z.number(),
  firstVisitTime: z.string(),
  lastVisitTime: z.string(),
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
  items: z.array(collectedItemSchema).max(MAX_ITEMS_PER_REQUEST),
});

type GitCommitPayload = z.infer<typeof gitCommitSchema>;
type BrowserHistoryPayload = z.infer<typeof browserHistorySchema>;
type FilesystemPayload = z.infer<typeof filesystemSchema>;
type ChatbotPayload = z.infer<typeof chatbotSchema>;
type CollectedItemPayload = z.infer<typeof collectedItemSchema>;

function transformGitItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as GitCommitPayload;
  const lines = data.message.split('\n');
  const title = lines[0] ?? '';
  const messageBody = lines.slice(1).join('\n').trim() || undefined;

  return {
    sourceType: 'git',
    sourceKey: data.hash,
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
    collectedAt,
  };
}

function transformBrowserItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as BrowserHistoryPayload;

  return {
    sourceType: 'browser',
    sourceKey: sha256(`${data.url}|${data.browser}|${data.date}`),
    timestamp: new Date(data.lastVisitTime),
    title: data.title,
    url: data.url,
    data: {
      browser: data.browser,
      profiles: data.profiles,
      date: data.date,
      timezone: data.timezone,
      dailyVisitCount: data.dailyVisitCount,
      firstVisitTime: data.firstVisitTime,
      lastVisitTime: data.lastVisitTime,
    },
    collectedAt,
  };
}

function transformFilesystemItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as FilesystemPayload;
  const modifiedTimestamp = new Date(data.modifiedAt);

  return {
    sourceType: 'filesystem',
    sourceKey: sha256(`${data.filePath}|${modifiedTimestamp.toISOString()}`),
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
    collectedAt,
  };
}

function transformChatbotItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as ChatbotPayload;

  return {
    sourceType: 'chatbot',
    sourceKey: `${data.client}:${data.session.id}`,
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
  }
}

async function upsertItems(items: NewCollectedItem[]): Promise<number> {
  if (items.length === 0) return 0;

  let totalCount = 0;

  for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
    const batch = items.slice(offset, offset + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((item) =>
        db
          .insert(collectedItems)
          .values(item)
          .onConflictDoUpdate({
            target: [collectedItems.sourceType, collectedItems.sourceKey],
            set: {
              title: sql`EXCLUDED.title`,
              timestamp: sql`EXCLUDED.timestamp`,
              data: sql`EXCLUDED.data`,
              collectedAt: sql`EXCLUDED.collected_at`,
            },
          })
          .returning({ id: collectedItems.id })
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalCount += result.value.length;
      } else {
        console.error('Upsert failed:', result.reason);
      }
    }
  }

  return totalCount;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  if (!validateApiKey(request)) {
    return createErrorResponse('UNAUTHORIZED', 'Invalid or missing API key', 401, undefined, requestId);
  }

  try {
    const rawBody: unknown = await request.json();
    const parseResult = ingestRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return createErrorResponse('VALIDATION_ERROR', 'Request validation failed', 400, details, requestId);
    }

    const { sourceType, collectedAt, items } = parseResult.data;
    const collectedAtDate = new Date(collectedAt);
    const transformedItems = items.map((item) => transformItem(item, collectedAtDate));

    let itemsInserted = 0;
    if (transformedItems.length > 0) {
      switch (sourceType) {
        case 'browser':
        case 'chatbot':
          itemsInserted = await upsertItems(transformedItems);
          break;
        default: {
          const result = await db
            .insert(collectedItems)
            .values(transformedItems)
            .onConflictDoNothing({
              target: [collectedItems.sourceType, collectedItems.sourceKey],
            })
            .returning({ id: collectedItems.id });
          itemsInserted = result.length;
        }
      }
    }

    await db.insert(collectionLogs).values({
      sourceType,
      itemsCount: items.length,
      collectedAt: collectedAtDate,
    });

    return createSuccessResponse({
      itemsReceived: items.length,
      itemsInserted,
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Ingest error:`, error);

    if (error instanceof SyntaxError) {
      return createErrorResponse('INVALID_JSON', 'Request body is not valid JSON', 400, undefined, requestId);
    }

    if (error instanceof Error && error.message.includes('connect')) {
      return createErrorResponse('DATABASE_ERROR', 'Database connection failed', 503, undefined, requestId);
    }

    return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500, undefined, requestId);
  }
}
