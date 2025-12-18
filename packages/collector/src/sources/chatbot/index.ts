import { DataSource } from '../base.js';
import type { CollectionResult } from '../../core/types.js';
import type { ChatbotSourceOptions, ChatbotType, ChatHistoryItem } from './types.js';
import type { ChatbotReader, ReaderContext } from './readers/base.js';
import { ChatWiseReader } from './readers/chatwise.js';

export class ChatbotSource extends DataSource<ChatbotSourceOptions> {
  readonly type = 'chatbot' as const;
  readonly name = 'Chatbot History';

  private readers: ChatbotReader[] = [];

  async validate(): Promise<boolean> {
    const readerContext: ReaderContext = {
      logger: this.context.logger,
      sinceDays: this.options.sinceDays,
      includeContent: this.options.includeContent,
      maxMessagesPerChat: this.options.maxMessagesPerChat,
      excludeModels: this.options.excludeModels,
    };

    // Create readers for enabled clients
    for (const client of this.options.clients) {
      const reader = this.createReader(client, readerContext);
      if (reader && reader.hasValidDatabase()) {
        this.readers.push(reader);
        this.context.logger.info(`Chatbot client ${client} validated and ready`);
      } else {
        this.context.logger.warn(`Chatbot client ${client} has no accessible database`);
      }
    }

    if (this.readers.length === 0) {
      this.context.logger.error('No valid chatbot databases found');
      return false;
    }

    return true;
  }

  async collect(): Promise<CollectionResult> {
    const allItems: ChatHistoryItem[] = [];

    for (const reader of this.readers) {
      try {
        const items = reader.read();
        allItems.push(...items);
        this.context.logger.debug(`Collected ${items.length} chats from ${reader.clientType}`);
      } catch (error) {
        this.context.logger.error(`Failed to collect from ${reader.clientType}`, error);
      }
    }

    // Sort by last reply time descending
    allItems.sort(
      (a, b) => new Date(b.session.lastReplyAt).getTime() - new Date(a.session.lastReplyAt).getTime()
    );

    return {
      sourceType: this.type,
      success: true,
      itemsCollected: allItems.length,
      items: allItems.map((item) => ({
        sourceType: this.type,
        timestamp: new Date(item.session.lastReplyAt),
        data: item,
      })),
      collectedAt: new Date(),
    };
  }

  private createReader(client: ChatbotType, context: ReaderContext): ChatbotReader | null {
    switch (client) {
      case 'chatwise':
        return new ChatWiseReader(context);
      default:
        this.context.logger.warn(`Unknown chatbot client: ${client}`);
        return null;
    }
  }
}
