import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ingestItems, type ChatbotPayload } from '@/services/ingest.service';

const WEB_IMPORT_DEVICE_ID = 'web-import';

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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

const chatbotPayloadSchema = z.object({
  client: z.enum(['chatwise', 'chatgpt']),
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

const importRequestSchema = z.object({
  conversations: z.array(chatbotPayloadSchema).min(1).max(1000),
});

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const rawBody: unknown = await request.json();
    const parseResult = importRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const details = parseResult.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`
      );
      return NextResponse.json(
        { success: false, error: 'Validation failed', details, requestId },
        { status: 400 }
      );
    }

    const { conversations } = parseResult.data;

    // Convert to CollectedItemPayload format
    const items = conversations.map((conv: ChatbotPayload) => ({
      sourceType: 'chatbot' as const,
      timestamp: conv.session.lastReplyAt,
      data: conv,
    }));

    const result = await ingestItems({
      deviceId: WEB_IMPORT_DEVICE_ID,
      deviceName: 'Web Import',
      sourceType: 'chatbot',
      collectedAt: new Date(),
      items,
    });

    return NextResponse.json({
      success: true,
      data: {
        conversationsReceived: conversations.length,
        conversationsImported: result.itemsInserted,
        requestId,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Import error:`, error);

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
