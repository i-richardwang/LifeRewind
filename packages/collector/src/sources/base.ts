import type { CollectionResult, SourceConfig, SourceType } from '../core/types.js';
import type { Logger } from '../utils/logger.js';

export interface DataSourceContext {
  logger: Logger;
  lastCollectionTime?: Date;
}

export abstract class DataSource<TOptions = unknown> {
  abstract readonly type: SourceType;
  abstract readonly name: string;

  protected config: SourceConfig;
  protected context: DataSourceContext;

  constructor(config: SourceConfig, context: DataSourceContext) {
    this.config = config;
    this.context = context;
  }

  /** Source-specific options, cast to the concrete type */
  protected get options(): TOptions {
    return this.config.options as TOptions;
  }

  /** Validate that this source can run on the current system */
  abstract validate(): Promise<boolean>;

  /** Collect data from this source */
  abstract collect(): Promise<CollectionResult>;

  /** Get the schedule for this source */
  getSchedule() {
    return this.config.schedule;
  }

  /** Check if this source is enabled */
  isEnabled() {
    return this.config.enabled;
  }
}
