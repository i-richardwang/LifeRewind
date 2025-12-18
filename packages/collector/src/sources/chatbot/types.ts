export type ChatbotType = 'chatwise';

export interface ChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  createdAt: string;
  files?: string[];
  reasoningContent?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  model?: string;
  createdAt: string;
  lastReplyAt: string;
  assistantId?: string;
  messageCount: number;
}

export interface ChatHistoryItem {
  client: ChatbotType;
  session: ChatSession;
  messages: ChatMessage[];
}

export interface ChatbotSourceOptions {
  clients: ChatbotType[];
  sinceDays: number;
  includeContent: boolean;
  maxMessagesPerChat?: number;
  excludeModels?: string[];
}
