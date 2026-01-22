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

export type SourceType = 'git' | 'browser' | 'filesystem' | 'chatbot' | 'email' | 'calendar' | 'todoist';

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
  date: string;
  dailyModifyCount: number;
  firstModifiedTime: string;
  lastModifiedTime: string;
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

export type ChatbotClient = 'chatwise' | 'chatgpt';

export interface ChatbotData {
  client: ChatbotClient;
  sessionId: string;
  sessionTitle: string;
  model?: string;
  messages: ChatbotMessage[];
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export type EmailProvider = 'gmail';

export interface EmailData {
  provider: EmailProvider;
  messageId: string;
  threadId: string;
  labels: string[];
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  snippet: string;
  hasAttachments: boolean;
  attachmentCount?: number;
  isRead: boolean;
  isStarred: boolean;
}

export interface CalendarAttendee {
  name?: string;
  email: string;
  type: 'required' | 'optional' | 'resource';
  status: 'none' | 'accepted' | 'declined' | 'tentative';
}

export type CalendarProvider = 'outlook' | 'exchange';

export interface CalendarData {
  provider: CalendarProvider;
  eventId: string;
  iCalUId: string;
  subject: string;
  calendarId: string;
  calendarName: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  organizer: { name?: string; email: string };
  attendees: CalendarAttendee[];
  isOrganizer: boolean;
  status: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere';
  responseStatus: 'none' | 'organizer' | 'accepted' | 'declined' | 'tentative';
  isCancelled: boolean;
  bodyPreview?: string;
  location?: string;
  categories: string[];
  importance: 'low' | 'normal' | 'high';
  sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
  isOnlineMeeting: boolean;
  onlineMeetingProvider?: string;
  onlineMeetingUrl?: string;
  type: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  seriesMasterId?: string;
  webLink: string;
  hasAttachments: boolean;
  lastModifiedDateTime: string;
}

export interface TodoistDue {
  date: string;
  isRecurring: boolean;
  datetime?: string;
  timezone?: string;
  string?: string;
}

export interface TodoistData {
  taskId: string;
  projectId: string;
  projectName: string;
  sectionId?: string;
  content: string;
  description?: string;
  priority: 1 | 2 | 3 | 4;
  labels: string[];
  due?: TodoistDue;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  url: string;
}

export type CollectedItemData = GitData | BrowserData | FilesystemData | ChatbotData | EmailData | CalendarData | TodoistData;

// Special device ID for globally unique data sources (e.g., git commits)
export const GLOBAL_DEVICE_ID = 'global';

export const collectedItems = pgTable(
  'collected_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceType: varchar('source_type', { length: 20 }).$type<SourceType>().notNull(),
    deviceId: varchar('device_id', { length: 64 }).notNull(),
    deviceName: varchar('device_name', { length: 100 }),
    sourceKey: varchar('source_key', { length: 64 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    title: text('title'),
    url: text('url'),
    data: jsonb('data').$type<CollectedItemData>().notNull(),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_collected_items_source_device_key').on(
      table.sourceType,
      table.deviceId,
      table.sourceKey
    ),
    index('idx_collected_items_timestamp').on(table.timestamp),
    index('idx_collected_items_source_type').on(table.sourceType),
    index('idx_collected_items_source_timestamp').on(table.sourceType, table.timestamp),
    index('idx_collected_items_device_id').on(table.deviceId),
  ]
);

export type CollectedItem = typeof collectedItems.$inferSelect;
export type NewCollectedItem = typeof collectedItems.$inferInsert;
