import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export type SourceType = 'git' | 'browser' | 'filesystem' | 'chatbot';

export interface GitData {
  hash: string;
  repository: string;
  authorName: string;
  authorEmail: string;
  messageBody?: string;
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
    files: string[];
  };
}

export interface BrowserData {
  browser: 'chrome' | 'safari' | 'arc' | 'dia' | 'comet';
  profiles: string[];
  date: string;
  timezone: string;
  dailyVisitCount: number;
  firstVisitTime: string;
  lastVisitTime: string;
}

export interface FilesystemData {
  filePath: string;
  eventType: 'create' | 'modify' | 'delete';
  fileSize: number;
  extension: string;
  mimeType?: string;
  contentPreview?: string;
  parentDirectory: string;
}

export interface ChatbotMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  createdAt: string;
  files?: string[];
  reasoningContent?: string;
}

export interface ChatbotData {
  client: 'chatwise';
  sessionId: string;
  sessionTitle: string;
  model?: string;
  messages: ChatbotMessage[];
}

export type CollectedItemData = GitData | BrowserData | FilesystemData | ChatbotData;

export const collectedItems = pgTable(
  'collected_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceType: varchar('source_type', { length: 20 }).$type<SourceType>().notNull(),
    sourceKey: varchar('source_key', { length: 64 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    title: text('title'),
    url: text('url'),
    data: jsonb('data').$type<CollectedItemData>().notNull(),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_collected_items_source_key').on(table.sourceType, table.sourceKey),
    index('idx_collected_items_timestamp').on(table.timestamp),
    index('idx_collected_items_source_type').on(table.sourceType),
    index('idx_collected_items_source_timestamp').on(table.sourceType, table.timestamp),
  ]
);

export type CollectedItem = typeof collectedItems.$inferSelect;
export type NewCollectedItem = typeof collectedItems.$inferInsert;
