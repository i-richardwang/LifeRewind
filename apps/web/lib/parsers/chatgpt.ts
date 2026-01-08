import type { ChatbotPayload, ChatbotMessagePayload } from '@/services/ingest.service';

// ChatGPT export format types
interface ChatGPTExportConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, ChatGPTNode>;
  current_node: string;
}

interface ChatGPTNode {
  id: string;
  message?: ChatGPTMessage;
  parent?: string;
  children: string[];
}

interface ChatGPTMessage {
  id: string;
  author: {
    role: string;
    name?: string;
    metadata?: Record<string, unknown>;
  };
  create_time?: number;
  update_time?: number;
  content: {
    content_type: string;
    parts?: (string | Record<string, unknown>)[];
  };
  status?: string;
  metadata?: {
    message_type?: string;
    model_slug?: string;
    request_id?: string;
    [key: string]: unknown;
  };
}

export interface ParsedConversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  model?: string;
}

export interface ParseResult {
  conversations: ChatbotPayload[];
  summary: ParsedConversation[];
  errors: string[];
}

/**
 * Parse ChatGPT conversations.json export file
 */
export function parseChatGPTExport(jsonContent: string): ParseResult {
  const errors: string[] = [];
  const conversations: ChatbotPayload[] = [];
  const summary: ParsedConversation[] = [];

  let rawData: unknown;
  try {
    rawData = JSON.parse(jsonContent);
  } catch {
    return {
      conversations: [],
      summary: [],
      errors: ['Invalid JSON format'],
    };
  }

  // ChatGPT export is an array of conversations
  if (!Array.isArray(rawData)) {
    return {
      conversations: [],
      summary: [],
      errors: ['Expected an array of conversations'],
    };
  }

  for (let i = 0; i < rawData.length; i++) {
    const conv = rawData[i] as ChatGPTExportConversation;

    try {
      const result = parseConversation(conv);
      if (result) {
        conversations.push(result.payload);
        summary.push(result.summary);
      }
    } catch (error) {
      errors.push(
        `Conversation ${i + 1} (${conv?.title || 'unknown'}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return { conversations, summary, errors };
}

function parseConversation(
  conv: ChatGPTExportConversation
): { payload: ChatbotPayload; summary: ParsedConversation } | null {
  if (!conv.id || !conv.mapping) {
    return null;
  }

  // Extract messages by walking the tree from root to current_node
  const messages = extractMessages(conv.mapping);

  if (messages.length === 0) {
    return null;
  }

  // Find model from assistant messages
  const model = findModel(conv.mapping);

  const createdAt = new Date(conv.create_time * 1000);
  const updatedAt = new Date(conv.update_time * 1000);

  const payload: ChatbotPayload = {
    client: 'chatgpt',
    session: {
      id: conv.id,
      title: conv.title || 'Untitled',
      model,
      createdAt: createdAt.toISOString(),
      lastReplyAt: updatedAt.toISOString(),
      messageCount: messages.length,
    },
    messages,
  };

  const summaryItem: ParsedConversation = {
    id: conv.id,
    title: conv.title || 'Untitled',
    messageCount: messages.length,
    createdAt,
    updatedAt,
    model,
  };

  return { payload, summary: summaryItem };
}

function extractMessages(mapping: Record<string, ChatGPTNode>): ChatbotMessagePayload[] {
  const messages: ChatbotMessagePayload[] = [];

  // Find root node (node with no parent or parent is null)
  const rootNode = Object.values(mapping).find(
    (node) => !node.parent || !mapping[node.parent]
  );

  if (!rootNode) {
    return messages;
  }

  // BFS to traverse the tree in order
  const queue: string[] = [rootNode.id];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = mapping[nodeId];
    if (!node) continue;

    // Process message if it exists and is from user or assistant
    if (node.message) {
      const msg = parseMessage(node.message);
      if (msg) {
        messages.push(msg);
      }
    }

    // Add children to queue
    if (node.children) {
      for (const childId of node.children) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }
  }

  return messages;
}

function parseMessage(msg: ChatGPTMessage): ChatbotMessagePayload | null {
  const role = msg.author?.role;

  // Only include user and assistant messages
  if (role !== 'user' && role !== 'assistant') {
    return null;
  }

  // Extract text content from parts
  const content = extractTextContent(msg.content);

  // Skip empty messages
  if (!content.trim()) {
    return null;
  }

  const createdAt = msg.create_time
    ? new Date(msg.create_time * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: msg.id,
    chatId: msg.id, // ChatGPT doesn't separate chatId, use message id
    role: role as 'user' | 'assistant',
    content,
    model: msg.metadata?.model_slug,
    createdAt,
  };
}

function extractTextContent(content: ChatGPTMessage['content']): string {
  if (!content?.parts) {
    return '';
  }

  return content.parts
    .filter((part): part is string => typeof part === 'string')
    .join('\n');
}

function findModel(mapping: Record<string, ChatGPTNode>): string | undefined {
  for (const node of Object.values(mapping)) {
    if (node.message?.author?.role === 'assistant') {
      const model = node.message.metadata?.model_slug;
      if (model) {
        return model;
      }
    }
  }
  return undefined;
}
