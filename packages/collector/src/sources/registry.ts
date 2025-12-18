import type { DataSource, DataSourceContext } from './base.js';
import type { SourceConfig, SourceType } from '../core/types.js';

type SourceFactory = (config: SourceConfig, context: DataSourceContext) => DataSource;

class SourceRegistry {
  private factories = new Map<SourceType, SourceFactory>();

  register(type: SourceType, factory: SourceFactory): void {
    this.factories.set(type, factory);
  }

  create(type: SourceType, config: SourceConfig, context: DataSourceContext): DataSource | null {
    const factory = this.factories.get(type);
    if (!factory) return null;
    return factory(config, context);
  }

  getRegisteredTypes(): SourceType[] {
    return Array.from(this.factories.keys());
  }

  has(type: SourceType): boolean {
    return this.factories.has(type);
  }
}

export const sourceRegistry = new SourceRegistry();
