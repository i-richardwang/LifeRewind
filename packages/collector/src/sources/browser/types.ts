export type BrowserType = 'chrome' | 'safari' | 'arc' | 'dia' | 'comet';

export interface BrowserHistoryItem {
  url: string;
  title: string;
  visitTime: string; // ISO timestamp
  visitCount: number;
  browser: BrowserType;
  profile?: string; // Profile name for Chrome/Arc
}

export interface BrowserSourceOptions {
  browsers: BrowserType[];
  excludeDomains: string[];
  sinceDays: number;
}

/** Internal representation of a raw history row from SQLite */
export interface RawHistoryRow {
  url: string;
  title: string | null;
  visit_count: number;
  visit_unix: number;
}
