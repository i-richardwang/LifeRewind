import { existsSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { homedir } from 'node:os';
import { BrowserReader, type ReaderContext } from './base.js';
import type { BrowserType } from '../types.js';

// Chromium timestamp: microseconds since 1601-01-01
// Conversion: timestamp / 1000000 - 11644473600 = unix timestamp
const CHROMIUM_EPOCH_OFFSET = 11644473600;

export type ChromiumBrowserType = 'chrome' | 'arc' | 'dia' | 'comet';

const BROWSER_PATHS: Record<ChromiumBrowserType, string> = {
  chrome: join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome'),
  arc: join(homedir(), 'Library', 'Application Support', 'Arc', 'User Data'),
  dia: join(homedir(), 'Library', 'Application Support', 'Dia', 'User Data'),
  comet: join(homedir(), 'Library', 'Application Support', 'Comet'),
};

export class ChromiumReader extends BrowserReader {
  readonly browserType: BrowserType;
  private readonly browserPath: string;

  constructor(browserType: ChromiumBrowserType, context: ReaderContext) {
    super(context);
    this.browserType = browserType;
    this.browserPath = BROWSER_PATHS[browserType];
  }

  getDbPaths(): string[] {
    if (!existsSync(this.browserPath)) {
      return [];
    }

    return this.discoverProfiles()
      .map((profile) => join(this.browserPath, profile, 'History'))
      .filter((path) => existsSync(path));
  }

  getQuery(): string {
    return `
      SELECT
        urls.url,
        urls.title,
        urls.visit_count,
        CAST((visits.visit_time / 1000000 - ${CHROMIUM_EPOCH_OFFSET}) AS INTEGER) as visit_unix
      FROM urls
      JOIN visits ON urls.id = visits.url
      WHERE visit_unix > ?
      ORDER BY visits.visit_time DESC
    `;
  }

  getProfileName(dbPath: string): string | undefined {
    const parts = dbPath.split(sep);
    const historyIndex = parts.findIndex((p) => p === 'History');
    if (historyIndex > 0) {
      const profile = parts[historyIndex - 1];
      return profile === 'Default' ? undefined : profile;
    }
    return undefined;
  }

  private discoverProfiles(): string[] {
    try {
      const entries = readdirSync(this.browserPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .filter((e) => e.name === 'Default' || e.name.startsWith('Profile '))
        .map((e) => e.name);
    } catch {
      return [];
    }
  }
}
