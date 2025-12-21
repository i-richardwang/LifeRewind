import { Command } from 'commander';
import { Collector } from '../../core/collector.js';
import { loadConfig } from '../../config/loader.js';
import { createLogger } from '../../utils/logger.js';
import { registerBuiltinSources } from '../../sources/index.js';
import { printError, printInfo, printSuccess } from '../utils/output.js';

export const startCommand = new Command('start')
  .description('Start the collector service')
  .option('--run-once', 'collect once and exit')
  .option('--run-on-start', 'run collection immediately on start')
  .action(async (options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();

    try {
      const config = loadConfig(globalOpts.config);

      let logLevel = config.logging.level;
      if (globalOpts.verbose) logLevel = 'debug';
      if (globalOpts.quiet) logLevel = 'error';

      const logger = createLogger({ level: logLevel });

      registerBuiltinSources();

      const collector = new Collector(config, logger);
      await collector.validateSources();

      const enabledSources = collector.getEnabledSources();
      if (enabledSources.length === 0) {
        printError('No data sources enabled or validated.');
        process.exit(1);
      }

      printInfo(`Enabled sources: ${enabledSources.join(', ')}`);

      if (options.runOnce) {
        printInfo('Running one-time collection...');
        await collector.collectAll();
        printSuccess('Collection complete.');
        return;
      }

      // Setup graceful shutdown
      const shutdown = async (signal: string) => {
        printInfo(`Received ${signal}, shutting down...`);
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

      if (options.runOnStart) {
        await collector.collectAll();
      }

      printSuccess('Collector started. Press Ctrl+C to stop.');
    } catch (error) {
      printError(`Failed to start: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
