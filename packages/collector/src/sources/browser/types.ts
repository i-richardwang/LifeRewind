export type BrowserType = 'chrome' | 'safari' | 'arc' | 'dia' | 'comet';

/** Raw browser history item from SQLite database */
export interface BrowserHistoryItem {
  url: string;
  title: string;
  visitTime: string; // ISO timestamp
  visitCount: number;
  browser: BrowserType;
  profile?: string; // Profile name for Chrome/Arc
}

/** Aggregated browser history item (grouped by URL + browser + date) */
export interface AggregatedBrowserHistoryItem {
  url: string;
  title: string; // Title from the last visit
  browser: BrowserType;
  profiles: string[]; // All profiles that visited this URL on this date
  date: string; // ISO date "YYYY-MM-DD"
  timezone: string; // e.g. "Asia/Shanghai"
  dailyVisitCount: number; // Number of visits on this date
  firstVisitTime: string; // ISO timestamp of first visit
  lastVisitTime: string; // ISO timestamp of last visit
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
