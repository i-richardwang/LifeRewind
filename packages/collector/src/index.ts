import { Collector } from './core/collector.js';
import { loadConfig } from './config/loader.js';
import { createLogger } from './utils/logger.js';
import { sourceRegistry } from './sources/registry.js';
import { GitSource } from './sources/git/index.js';

function registerBuiltinSources(): void {
  sourceRegistry.register('git', (config, ctx) => new GitSource(config, ctx));
  // Future sources will be registered here:
  // sourceRegistry.register('browser', (config, ctx) => new BrowserSource(config, ctx));
  // sourceRegistry.register('filesystem', (config, ctx) => new FilesystemSource(config, ctx));
  // sourceRegistry.register('ai-chat', (config, ctx) => new AIChatSource(config, ctx));
}

async function main(): Promise<void> {
  const configPath = process.env['COLLECTOR_CONFIG_PATH'];
  const config = loadConfig(configPath);

  const logger = createLogger(config.logging);
  logger.info('Starting LifeRewind Collector...');

  registerBuiltinSources();

  const collector = new Collector(config, logger);

  await collector.validateSources();

  const enabledSources = collector.getEnabledSources();
  if (enabledSources.length === 0) {
    logger.error('No data sources enabled or validated. Exiting.');
    process.exit(1);
  }

  logger.info(`Enabled sources: ${enabledSources.join(', ')}`);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await collector.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(console.error);
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT').catch(console.error);
  });

  await collector.start();

  logger.info('Collector started successfully. Press Ctrl+C to stop.');
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
