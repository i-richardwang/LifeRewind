/** Unique identifier for each data source type */
export type SourceType = 'git' | 'browser' | 'filesystem' | 'chatbot';

/** List of all valid source types */
export const SOURCE_TYPES: readonly SourceType[] = ['git', 'browser', 'filesystem', 'chatbot'] as const;

/** Schedule frequency for data collection */
export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';

/** Base structure for all collected data items */
export interface CollectedItem {
  sourceType: SourceType;
  timestamp: Date;
  data: unknown;
}

/** Result from a collection operation */
export interface CollectionResult {
  sourceType: SourceType;
  success: boolean;
  itemsCollected: number;
  items: CollectedItem[];
  error?: Error;
  collectedAt: Date;
}

/** Configuration for a specific data source */
export interface SourceConfig {
  enabled: boolean;
  schedule: ScheduleFrequency;
  /** Source-specific options, type checked at runtime by Zod schema */
  options: unknown;
}
