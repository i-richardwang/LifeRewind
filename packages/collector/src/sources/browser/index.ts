import { DataSource } from '../base.js';
import type { CollectionResult } from '../../core/types.js';
import type {
  BrowserHistoryItem,
  BrowserSourceOptions,
  BrowserType,
  AggregatedBrowserHistoryItem,
} from './types.js';
import type { BrowserReader, ReaderContext } from './readers/base.js';
import { ChromiumReader } from './readers/chromium.js';
import { SafariReader } from './readers/safari.js';

export class BrowserSource extends DataSource<BrowserSourceOptions> {
  readonly type = 'browser' as const;
  readonly name = 'Browser History';

  private readers: BrowserReader[] = [];

  async validate(): Promise<boolean> {
    const readerContext: ReaderContext = {
      logger: this.context.logger,
      sinceDays: this.options.sinceDays,
      excludeDomains: this.options.excludeDomains,
    };

    // Create readers for enabled browsers
    for (const browser of this.options.browsers) {
      const reader = this.createReader(browser, readerContext);
      if (reader && reader.hasValidDatabases()) {
        this.readers.push(reader);
        this.context.logger.info(`Browser ${browser} validated and ready`);
      } else {
        this.context.logger.warn(`Browser ${browser} has no accessible history database`);
      }
    }

    if (this.readers.length === 0) {
      this.context.logger.error('No valid browser history databases found');
      return false;
    }

    return true;
  }

  async collect(): Promise<CollectionResult> {
    const allItems: BrowserHistoryItem[] = [];

    for (const reader of this.readers) {
      try {
        const items = reader.read();
        allItems.push(...items);
        this.context.logger.debug(`Collected ${items.length} items from ${reader.browserType}`);
      } catch (error) {
        this.context.logger.error(`Failed to collect from ${reader.browserType}`, error);
      }
    }

    // Aggregate by URL + browser + date
    const aggregated = this.aggregateByDay(allItems);
    this.context.logger.info(
      `Aggregated ${allItems.length} raw visits into ${aggregated.length} daily records`
    );

    // Sort by last visit time descending
    aggregated.sort(
      (a, b) => new Date(b.lastVisitTime).getTime() - new Date(a.lastVisitTime).getTime()
    );

    return {
      sourceType: this.type,
      success: true,
      itemsCollected: aggregated.length,
      items: aggregated.map((item) => ({
        sourceType: this.type,
        timestamp: new Date(item.lastVisitTime),
        data: item,
      })),
      collectedAt: new Date(),
    };
  }

  /** Aggregate raw browser history items by URL + browser + date */
  private aggregateByDay(items: BrowserHistoryItem[]): AggregatedBrowserHistoryItem[] {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const grouped = new Map<string, BrowserHistoryItem[]>();

    for (const item of items) {
      // Get local date string in YYYY-MM-DD format
      const date = new Date(item.visitTime).toLocaleDateString('en-CA', { timeZone: timezone });
      const key = `${item.url}|${item.browser}|${date}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }

    return Array.from(grouped.entries()).map(([key, visits]) => {
      const parts = key.split('|');
      // Key format is guaranteed: `${url}|${browser}|${date}`
      if (parts.length < 3) {
        throw new Error(`Invalid aggregation key format: ${key}`);
      }
      const url = parts[0] as string;
      const browser = parts[1] as BrowserType;
      const date = parts[2] as string;

      // Sort visits by time ascending to get first and last
      const sorted = visits.sort(
        (a, b) => new Date(a.visitTime).getTime() - new Date(b.visitTime).getTime()
      );

      // Collect unique profiles
      const profiles = [...new Set(visits.map((v) => v.profile).filter((p): p is string => !!p))];

      // sorted is guaranteed non-empty since visits came from grouping
      const firstVisit = sorted[0] as BrowserHistoryItem;
      const lastVisit = sorted[sorted.length - 1] as BrowserHistoryItem;

      return {
        url,
        title: lastVisit.title, // Use title from last visit
        browser,
        profiles,
        date,
        timezone,
        dailyVisitCount: visits.length,
        firstVisitTime: firstVisit.visitTime,
        lastVisitTime: lastVisit.visitTime,
      };
    });
  }

  private createReader(browser: BrowserType, context: ReaderContext): BrowserReader | null {
    switch (browser) {
      case 'chrome':
      case 'arc':
      case 'dia':
      case 'comet':
        return new ChromiumReader(browser, context);
      case 'safari':
        return new SafariReader(context);
      default:
        this.context.logger.warn(`Unknown browser type: ${browser}`);
        return null;
    }
  }
}
