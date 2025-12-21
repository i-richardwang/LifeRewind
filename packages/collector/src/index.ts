// Library exports for programmatic usage
export { Collector } from './core/collector.js';
export { loadConfig, findConfigPath } from './config/loader.js';
export { writeConfig } from './config/writer.js';
export { getUserConfigPath, getUserConfigDir, getAllConfigPaths } from './config/paths.js';
export { createLogger } from './utils/logger.js';
export { registerBuiltinSources, sourceRegistry } from './sources/index.js';
export type { CollectorConfig } from './config/schema.js';
export type { SourceType, CollectedItem } from './core/types.js';
