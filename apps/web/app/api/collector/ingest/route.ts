import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiKey } from '@/lib/auth';
import { ingestItems } from '@/services/ingest.service';

const MAX_ITEMS_PER_REQUEST = 1000;

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Validation schemas
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
  deviceId: z.string().uuid(),
  deviceName: z.string().optional(),
  sourceType: sourceTypeSchema,
  collectedAt: z.string(),
  items: z.array(collectedItemSchema).max(MAX_ITEMS_PER_REQUEST),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing API key', requestId },
      { status: 401 }
    );
  }

  try {
    const rawBody: unknown = await request.json();
    const parseResult = ingestRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      return NextResponse.json(
        { success: false, error: 'Validation failed', details, requestId },
        { status: 400 }
      );
    }

    const { deviceId, deviceName, sourceType, collectedAt, items } = parseResult.data;

    const result = await ingestItems({
      deviceId,
      deviceName,
      sourceType,
      collectedAt: new Date(collectedAt),
      items,
    });

    return NextResponse.json({
      success: true,
      data: { ...result, requestId },
    });
  } catch (error) {
    console.error(`[${requestId}] Ingest error:`, error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON', requestId },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', requestId },
      { status: 500 }
    );
  }
}
