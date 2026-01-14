import { createHash } from 'crypto';
import { insertItems, upsertFilesystemItems } from '@/db/queries/items';
import { createCollectionLog } from '@/db/queries/logs';
import type { NewCollectedItem, SourceType, ChatbotClient, EmailAddress, EmailProvider } from '@/db/schema';
import { GLOBAL_DEVICE_ID } from '@/db/schema';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export interface GitCommitPayload {
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
    files: string[];
  };
}

export interface BrowserHistoryPayload {
  url: string;
  title: string;
  browser: 'chrome' | 'safari' | 'arc' | 'dia' | 'comet';
  profiles: string[];
  date: string;
  timezone: string;
  dailyVisitCount: number;
  firstVisitTime: string;
  lastVisitTime: string;
}

export interface FilesystemPayload {
  filePath: string;
  fileName: string;
  eventType: 'create' | 'modify' | 'delete';
  modifiedAt: string;
  fileSize: number;
  extension: string;
  mimeType?: string;
  contentPreview?: string;
  parentDirectory: string;
}

export interface ChatbotMessagePayload {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  createdAt: string;
  files?: string[];
  reasoningContent?: string;
}

export interface ChatbotPayload {
  client: ChatbotClient;
  session: {
    id: string;
    title: string;
    model?: string;
    createdAt: string;
    lastReplyAt: string;
    messageCount: number;
  };
  messages: ChatbotMessagePayload[];
}

export interface EmailPayload {
  provider: EmailProvider;
  messageId: string;
  threadId: string;
  labels: string[];
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  snippet: string;
  hasAttachments: boolean;
  attachmentCount?: number;
  isRead: boolean;
  isStarred: boolean;
}

export interface CollectedItemPayload {
  sourceType: SourceType;
  timestamp: string;
  data: GitCommitPayload | BrowserHistoryPayload | FilesystemPayload | ChatbotPayload | EmailPayload;
}

export interface IngestParams {
  deviceId: string;
  deviceName?: string;
  sourceType: SourceType;
  collectedAt: Date;
  items: CollectedItemPayload[];
}

export interface IngestResult {
  itemsReceived: number;
  itemsInserted: number;
}

/**
 * Ingest collected items from collector
 */
export async function ingestItems(params: IngestParams): Promise<IngestResult> {
  const { deviceId, deviceName, sourceType, collectedAt, items } = params;

  const transformedItems = items.map((item) =>
    transformItem(item, collectedAt, deviceId, deviceName)
  );

  let itemsInserted = 0;
  if (transformedItems.length > 0) {
    let results;

    if (sourceType === 'filesystem') {
      // Filesystem uses special upsert with conditional dailyModifyCount increment
      results = await upsertFilesystemItems(transformedItems);
    } else if (sourceType === 'browser' || sourceType === 'chatbot') {
      // Browser and chatbot use standard upsert (update on conflict)
      results = await insertItems(transformedItems, 'update');
    } else if (sourceType === 'email') {
      // Email uses ignore (skip on conflict, emails don't change)
      results = await insertItems(transformedItems, 'ignore');
    } else {
      // Git uses ignore (skip on conflict)
      results = await insertItems(transformedItems, 'ignore');
    }

    itemsInserted = results.length;
  }

  // Log the collection
  await createCollectionLog({
    sourceType,
    itemsCount: items.length,
    collectedAt,
  });

  return {
    itemsReceived: items.length,
    itemsInserted,
  };
}

function transformItem(
  item: CollectedItemPayload,
  collectedAt: Date,
  deviceId: string,
  deviceName?: string
): NewCollectedItem {
  switch (item.sourceType) {
    case 'git':
      return transformGitItem(item, collectedAt);
    case 'browser':
      return transformBrowserItem(item, collectedAt, deviceId, deviceName);
    case 'filesystem':
      return transformFilesystemItem(item, collectedAt, deviceId, deviceName);
    case 'chatbot':
      return transformChatbotItem(item, collectedAt, deviceId, deviceName);
    case 'email':
      return transformEmailItem(item, collectedAt, deviceId, deviceName);
  }
}

function transformGitItem(item: CollectedItemPayload, collectedAt: Date): NewCollectedItem {
  const data = item.data as GitCommitPayload;
  const lines = data.message.split('\n');
  const title = lines[0] ?? '';
  const messageBody = lines.slice(1).join('\n').trim() || undefined;

  return {
    sourceType: 'git',
    deviceId: GLOBAL_DEVICE_ID,
    deviceName: null,
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

function transformBrowserItem(
  item: CollectedItemPayload,
  collectedAt: Date,
  deviceId: string,
  deviceName?: string
): NewCollectedItem {
  const data = item.data as BrowserHistoryPayload;

  return {
    sourceType: 'browser',
    deviceId,
    deviceName,
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

function transformFilesystemItem(
  item: CollectedItemPayload,
  collectedAt: Date,
  deviceId: string,
  deviceName?: string
): NewCollectedItem {
  const data = item.data as FilesystemPayload;
  const modifiedTimestamp = new Date(data.modifiedAt);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = modifiedTimestamp.toLocaleDateString('en-CA', { timeZone: timezone });

  return {
    sourceType: 'filesystem',
    deviceId,
    deviceName,
    sourceKey: sha256(`${data.filePath}|${date}`),
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
      date,
      dailyModifyCount: 1,
      firstModifiedTime: data.modifiedAt,
      lastModifiedTime: data.modifiedAt,
    },
    collectedAt,
  };
}

function transformChatbotItem(
  item: CollectedItemPayload,
  collectedAt: Date,
  deviceId: string,
  deviceName?: string
): NewCollectedItem {
  const data = item.data as ChatbotPayload;

  return {
    sourceType: 'chatbot',
    deviceId,
    deviceName,
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

function transformEmailItem(
  item: CollectedItemPayload,
  collectedAt: Date,
  deviceId: string,
  deviceName?: string
): NewCollectedItem {
  const data = item.data as EmailPayload;

  return {
    sourceType: 'email',
    deviceId,
    deviceName,
    sourceKey: `${data.provider}:${data.messageId}`,
    timestamp: new Date(item.timestamp),
    title: data.subject,
    url: null,
    data: {
      provider: data.provider,
      messageId: data.messageId,
      threadId: data.threadId,
      labels: data.labels,
      from: data.from,
      to: data.to,
      cc: data.cc,
      snippet: data.snippet,
      hasAttachments: data.hasAttachments,
      attachmentCount: data.attachmentCount,
      isRead: data.isRead,
      isStarred: data.isStarred,
    },
    collectedAt,
  };
}
