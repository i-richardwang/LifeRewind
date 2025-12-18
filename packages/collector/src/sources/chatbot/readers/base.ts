import { copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import type { ChatbotType, ChatSession, ChatMessage, ChatHistoryItem } from '../types.js';
import type { Logger } from '../../../utils/logger.js';

export interface ReaderContext {
  logger: Logger;
  sinceDays: number;
  includeContent: boolean;
  maxMessagesPerChat?: number;
  excludeModels?: string[];
}

export abstract class ChatbotReader {
  abstract readonly clientType: ChatbotType;

  protected context: ReaderContext;

  constructor(context: ReaderContext) {
    this.context = context;
  }

  abstract getDbPath(): string | null;
  abstract getChatQuery(): string;
  abstract getMessageQuery(): string;
  abstract parseChatRow(row: unknown): ChatSession | null;
  abstract parseMessageRow(row: unknown): ChatMessage | null;

  read(): ChatHistoryItem[] {
    const dbPath = this.getDbPath();
    if (!dbPath) {
      this.context.logger.debug(`No ${this.clientType} database found`);
      return [];
    }

    return this.readFromDb(dbPath);
  }

  hasValidDatabase(): boolean {
    const dbPath = this.getDbPath();
    return dbPath !== null && existsSync(dbPath);
  }

  private readFromDb(dbPath: string): ChatHistoryItem[] {
    const tempPath = join(
      tmpdir(),
      `chatbot-history-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
    );
    let db: InstanceType<typeof Database> | null = null;

    try {
      // Copy database to avoid locking issues
      copyFileSync(dbPath, tempPath);

      db = new Database(tempPath, { readonly: true });
      const sinceTimestamp = Date.now() - this.context.sinceDays * 24 * 60 * 60 * 1000;

      // Get chat sessions
      const chatStmt = db.prepare(this.getChatQuery());
      const chatRows = chatStmt.all(sinceTimestamp) as unknown[];

      const results: ChatHistoryItem[] = [];

      for (const chatRow of chatRows) {
        const session = this.parseChatRow(chatRow);
        if (!session) continue;

        // Check model exclusion
        if (session.model && this.isModelExcluded(session.model)) {
          continue;
        }

        // Get messages for this chat
        const messages = this.getMessagesForChat(db, session.id);

        // Update message count
        session.messageCount = messages.length;

        results.push({
          client: this.clientType,
          session,
          messages,
        });
      }

      this.context.logger.debug(`Read ${results.length} chats from ${this.clientType}`);

      return results;
    } finally {
      // Close database connection
      if (db) {
        try {
          db.close();
        } catch (error) {
          this.context.logger.debug('Failed to close database connection', error);
        }
      }
      // Clean up temp file
      if (existsSync(tempPath)) {
        try {
          unlinkSync(tempPath);
        } catch (error) {
          this.context.logger.debug(`Failed to clean up temp file: ${tempPath}`, error);
        }
      }
    }
  }

  private getMessagesForChat(db: InstanceType<typeof Database>, chatId: string): ChatMessage[] {
    const stmt = db.prepare(this.getMessageQuery());
    const rows = stmt.all(chatId) as unknown[];

    let messages = rows
      .map((row) => this.parseMessageRow(row))
      .filter((msg): msg is ChatMessage => msg !== null);

    // Filter by model exclusion
    messages = messages.filter((msg) => {
      if (msg.model && this.isModelExcluded(msg.model)) {
        return false;
      }
      return true;
    });

    // Strip content if not included
    if (!this.context.includeContent) {
      messages = messages.map((msg) => ({
        ...msg,
        content: '',
        reasoningContent: undefined,
      }));
    }

    // Limit message count (keep most recent)
    if (this.context.maxMessagesPerChat && messages.length > this.context.maxMessagesPerChat) {
      messages = messages.slice(-this.context.maxMessagesPerChat);
    }

    return messages;
  }

  private isModelExcluded(model: string): boolean {
    if (!this.context.excludeModels || this.context.excludeModels.length === 0) {
      return false;
    }
    return this.context.excludeModels.some((excluded) =>
      model.toLowerCase().includes(excluded.toLowerCase())
    );
  }
}
