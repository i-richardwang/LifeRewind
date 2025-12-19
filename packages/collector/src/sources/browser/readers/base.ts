import { copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import type { BrowserHistoryItem, BrowserType, RawHistoryRow } from '../types.js';
import type { Logger } from '../../../utils/logger.js';

export interface ReaderContext {
  logger: Logger;
  sinceDays: number;
  excludeDomains: string[];
}

export abstract class BrowserReader {
  abstract readonly browserType: BrowserType;

  protected context: ReaderContext;

  constructor(context: ReaderContext) {
    this.context = context;
  }

  /** Get all database paths for this browser */
  abstract getDbPaths(): string[];

  /** Get the SQL query for this browser's history format */
  abstract getQuery(): string;

  /** Get profile name from database path (if applicable) */
  abstract getProfileName(dbPath: string): string | undefined;

  /** Read history from all available databases */
  read(): BrowserHistoryItem[] {
    const items: BrowserHistoryItem[] = [];
    const dbPaths = this.getDbPaths();

    if (dbPaths.length === 0) {
      this.context.logger.debug(`No ${this.browserType} history databases found`);
      return items;
    }

    for (const dbPath of dbPaths) {
      try {
        const profileItems = this.readFromDb(dbPath);
        items.push(...profileItems);
        this.context.logger.debug(
          `Read ${profileItems.length} items from ${this.browserType} (${this.getProfileName(dbPath) ?? 'default'})`
        );
      } catch (error) {
        this.context.logger.warn(`Failed to read from ${dbPath}`, error);
      }
    }

    return items;
  }

  /** Check if any history databases exist */
  hasValidDatabases(): boolean {
    return this.getDbPaths().length > 0;
  }

  private readFromDb(dbPath: string): BrowserHistoryItem[] {
    const tempPath = join(tmpdir(), `browser-history-${randomUUID()}.db`);
    let db: InstanceType<typeof Database> | null = null;

    try {
      // Copy database to avoid locking issues
      copyFileSync(dbPath, tempPath);

      db = new Database(tempPath, { readonly: true });
      const sinceTimestamp = Math.floor(Date.now() / 1000) - this.context.sinceDays * 24 * 60 * 60;

      const stmt = db.prepare(this.getQuery());
      const rows = stmt.all(sinceTimestamp) as unknown[];

      const profile = this.getProfileName(dbPath);

      return rows
        .filter((row): row is RawHistoryRow => this.isValidRow(row))
        .filter((row) => this.isValidUrl(row.url))
        .filter((row) => !this.isExcluded(row.url))
        .map((row) => ({
          url: row.url,
          title: row.title ?? '',
          visitTime: new Date(row.visit_unix * 1000).toISOString(),
          visitCount: row.visit_count,
          browser: this.browserType,
          ...(profile && { profile }),
        }));
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

  /** Type guard to validate raw SQL row structure */
  private isValidRow(row: unknown): row is RawHistoryRow {
    if (typeof row !== 'object' || row === null) return false;
    const record = row as Record<string, unknown>;
    return (
      typeof record['url'] === 'string' &&
      (typeof record['title'] === 'string' || record['title'] === null) &&
      typeof record['visit_count'] === 'number' &&
      typeof record['visit_unix'] === 'number'
    );
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isExcluded(url: string): boolean {
    if (this.context.excludeDomains.length === 0) return false;

    try {
      const hostname = new URL(url).hostname;
      return this.context.excludeDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }
}
