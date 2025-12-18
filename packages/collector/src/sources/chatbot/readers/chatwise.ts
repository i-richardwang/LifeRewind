import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ChatbotReader } from './base.js';
import type { ChatbotType, ChatSession, ChatMessage } from '../types.js';

const CHATWISE_DB_PATH = join(homedir(), 'Library', 'Application Support', 'app.chatwise', 'app.db');

interface RawChatRow {
  id: string;
  title: string | null;
  model: string | null;
  createdAt: number;
  lastReplyAt: number;
  assistantId: string | null;
}

interface RawMessageRow {
  id: string;
  chatId: string;
  role: string;
  content: string | null;
  model: string | null;
  createdAt: number;
  files: string | null;
  reasoningContent: string | null;
}

export class ChatWiseReader extends ChatbotReader {
  readonly clientType: ChatbotType = 'chatwise';

  getDbPath(): string | null {
    if (existsSync(CHATWISE_DB_PATH)) {
      return CHATWISE_DB_PATH;
    }
    return null;
  }

  getChatQuery(): string {
    // lastReplyAt is stored as Unix milliseconds
    return `
      SELECT
        id,
        title,
        model,
        createdAt,
        lastReplyAt,
        assistantId
      FROM chat
      WHERE lastReplyAt > ?
      ORDER BY lastReplyAt DESC
    `;
  }

  getMessageQuery(): string {
    return `
      SELECT
        id,
        chatId,
        role,
        content,
        model,
        createdAt,
        files,
        reasoningContent
      FROM message
      WHERE chatId = ?
      ORDER BY createdAt ASC
    `;
  }

  parseChatRow(row: unknown): ChatSession | null {
    if (!this.isValidChatRow(row)) {
      return null;
    }

    return {
      id: row.id,
      title: row.title ?? 'Untitled',
      model: row.model ?? undefined,
      createdAt: new Date(row.createdAt).toISOString(),
      lastReplyAt: new Date(row.lastReplyAt).toISOString(),
      assistantId: row.assistantId ?? undefined,
      messageCount: 0, // Will be updated after fetching messages
    };
  }

  parseMessageRow(row: unknown): ChatMessage | null {
    if (!this.isValidMessageRow(row)) {
      return null;
    }

    let files: string[] | undefined;
    if (row.files) {
      try {
        const parsed: unknown = JSON.parse(row.files);
        if (Array.isArray(parsed) && parsed.every((f) => typeof f === 'string')) {
          files = parsed;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    const role = this.normalizeRole(row.role);
    if (!role) {
      return null;
    }

    return {
      id: row.id,
      chatId: row.chatId,
      role,
      content: row.content ?? '',
      model: row.model ?? undefined,
      createdAt: new Date(row.createdAt).toISOString(),
      files,
      reasoningContent: row.reasoningContent ?? undefined,
    };
  }

  private isValidChatRow(row: unknown): row is RawChatRow {
    if (typeof row !== 'object' || row === null) return false;
    const r = row as Record<string, unknown>;
    return (
      typeof r['id'] === 'string' &&
      typeof r['createdAt'] === 'number' &&
      typeof r['lastReplyAt'] === 'number'
    );
  }

  private isValidMessageRow(row: unknown): row is RawMessageRow {
    if (typeof row !== 'object' || row === null) return false;
    const r = row as Record<string, unknown>;
    return (
      typeof r['id'] === 'string' &&
      typeof r['chatId'] === 'string' &&
      typeof r['role'] === 'string' &&
      typeof r['createdAt'] === 'number'
    );
  }

  private normalizeRole(role: string): 'user' | 'assistant' | 'system' | null {
    const normalized = role.toLowerCase();
    if (normalized === 'user') return 'user';
    if (normalized === 'assistant') return 'assistant';
    if (normalized === 'system') return 'system';
    return null;
  }
}
