import { Scheduler } from './scheduler.js';
import { ApiClient } from '../api/client.js';
import { sourceRegistry } from '../sources/registry.js';
import type { CollectorConfig } from '../config/schema.js';
import type { DataSource } from '../sources/base.js';
import type { CollectionResult, SourceType } from './types.js';
import type { Logger } from '../utils/logger.js';

export class Collector {
  private config: CollectorConfig;
  private logger: Logger;
  private scheduler: Scheduler;
  private apiClient: ApiClient;
  private sources: Map<SourceType, DataSource> = new Map();

  constructor(config: CollectorConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.scheduler = new Scheduler(logger);
    this.apiClient = new ApiClient(
      {
        ...config.api,
        device: config.device,
      },
      logger
    );
  }

  async validateSources(): Promise<void> {
    const context = { logger: this.logger };

    for (const [sourceType, sourceConfig] of Object.entries(this.config.sources)) {
      if (!sourceConfig.enabled) {
        this.logger.debug(`Source ${sourceType} is disabled, skipping`);
        continue;
      }

      const source = sourceRegistry.create(sourceType as SourceType, sourceConfig, context)!;

      const isValid = await source.validate();
      if (!isValid) {
        this.logger.warn(`Source ${sourceType} validation failed, disabling`);
        continue;
      }

      this.sources.set(sourceType as SourceType, source);
      this.logger.info(`Source ${sourceType} validated and ready`);
    }
  }

  async start(): Promise<void> {
    const apiHealthy = await this.apiClient.healthCheck();
    if (!apiHealthy) {
      this.logger.warn('API health check failed, will retry on first push');
    }

    for (const [sourceType, source] of this.sources) {
      this.scheduler.schedule(sourceType, source.getSchedule(), () =>
        this.collectAndPush(sourceType)
      );
    }

    this.scheduler.startAll();

    if (process.env['COLLECTOR_RUN_ON_START'] === 'true') {
      this.logger.info('Running initial collection...');
      await this.collectAll();
    }
  }

  async stop(): Promise<void> {
    this.scheduler.stopAll();
    this.logger.info('Collector stopped');
  }

  async collectAndPush(sourceType: SourceType): Promise<CollectionResult | undefined> {
    const source = this.sources.get(sourceType)!;

    try {
      this.logger.info(`Collecting from ${sourceType}...`);
      const result = await source.collect();

      if (!result.success) {
        this.logger.error(`Collection failed for ${sourceType}`, result.error);
        return result;
      }

      if (result.itemsCollected === 0) {
        this.logger.info(`No new items from ${sourceType}`);
        return result;
      }

      this.logger.info(`Collected ${result.itemsCollected} items from ${sourceType}`);

      const response = await this.apiClient.pushData(result);
      this.logger.info(`Pushed to API: ${response.data.itemsReceived} received, ${response.data.itemsInserted} inserted`);
      return result;
    } catch (error) {
      this.logger.error(`Error in collect/push cycle for ${sourceType}`, error);
      return undefined;
    }
  }

  async collectAll(): Promise<void> {
    for (const sourceType of this.sources.keys()) {
      await this.collectAndPush(sourceType);
    }
  }

  async triggerCollection(sourceType: SourceType): Promise<CollectionResult | undefined> {
    return this.collectAndPush(sourceType);
  }

  getEnabledSources(): SourceType[] {
    return Array.from(this.sources.keys());
  }
}
