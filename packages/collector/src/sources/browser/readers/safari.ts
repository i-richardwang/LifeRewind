import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { BrowserReader, type ReaderContext } from './base.js';
import type { BrowserType } from '../types.js';

// Safari timestamp: seconds since 2001-01-01 (Apple Cocoa epoch)
// Conversion: timestamp + 978307200 = unix timestamp
const SAFARI_EPOCH_OFFSET = 978307200;

const SAFARI_HISTORY_PATH = join(homedir(), 'Library', 'Safari', 'History.db');

export class SafariReader extends BrowserReader {
  readonly browserType: BrowserType = 'safari';

  getDbPaths(): string[] {
    if (existsSync(SAFARI_HISTORY_PATH)) {
      return [SAFARI_HISTORY_PATH];
    }
    return [];
  }

  getQuery(): string {
    return `
      SELECT
        i.url,
        v.title,
        i.visit_count,
        CAST((v.visit_time + ${SAFARI_EPOCH_OFFSET}) AS INTEGER) as visit_unix
      FROM history_items i
      JOIN history_visits v ON i.id = v.history_item
      WHERE visit_unix > ?
      ORDER BY v.visit_time DESC
    `;
  }

  getProfileName(): string | undefined {
    // Safari doesn't have profiles
    return undefined;
  }
}
