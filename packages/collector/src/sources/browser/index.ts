import { DataSource } from '../base.js';
import type { CollectionResult } from '../../core/types.js';
import type { BrowserHistoryItem, BrowserSourceOptions, BrowserType } from './types.js';
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

    // Sort by visit time descending
    allItems.sort((a, b) => new Date(b.visitTime).getTime() - new Date(a.visitTime).getTime());

    return {
      sourceType: this.type,
      success: true,
      itemsCollected: allItems.length,
      items: allItems.map((item) => ({
        sourceType: this.type,
        timestamp: new Date(item.visitTime),
        data: item,
      })),
      collectedAt: new Date(),
    };
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
