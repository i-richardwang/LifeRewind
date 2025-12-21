import { Command } from 'commander';
import ora from 'ora';
import { Collector } from '../../core/collector.js';
import { loadConfig } from '../../config/loader.js';
import { createLogger } from '../../utils/logger.js';
import { registerBuiltinSources } from '../../sources/index.js';
import { printError, printSuccess, printInfo } from '../utils/output.js';
import { SOURCE_TYPES, type SourceType, type CollectionResult } from '../../core/types.js';

function showSkippedInfo(result: CollectionResult | undefined, verbose: boolean): void {
  if (!verbose || !result?.skipped?.count) return;

  printInfo(`Skipped ${result.skipped.count} items:`);
  for (const item of result.skipped.items) {
    console.log(`  - ${item.path} (${item.reason})`);
  }
}

export const collectCommand = new Command('collect')
  .description('Manually trigger data collection')
  .argument('[source]', 'specific source to collect (git, browser, filesystem, chatbot)')
  .action(async (source: string | undefined, _options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const verbose = !!globalOpts.verbose;

    if (source && !SOURCE_TYPES.includes(source as SourceType)) {
      printError(`Invalid source: ${source}`);
      console.log(`Valid sources: ${SOURCE_TYPES.join(', ')}`);
      process.exit(1);
    }

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

      const spinner = ora();

      if (source) {
        if (!enabledSources.includes(source as SourceType)) {
          printError(`Source '${source}' is not enabled or not validated.`);
          process.exit(1);
        }
        spinner.start(`Collecting from ${source}...`);
        const result = await collector.triggerCollection(source as SourceType);
        spinner.succeed(`Collection from ${source} complete`);
        showSkippedInfo(result, verbose);
      } else {
        for (const src of enabledSources) {
          spinner.start(`Collecting from ${src}...`);
          const result = await collector.triggerCollection(src);
          spinner.succeed(`Collection from ${src} complete`);
          showSkippedInfo(result, verbose);
        }
      }

      printSuccess('All collections complete.');
    } catch (error) {
      printError(`Collection failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
