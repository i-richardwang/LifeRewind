import { Command } from 'commander';
import { loadConfig, findConfigPath } from '../../config/loader.js';
import { printInfo, printSuccess, printError, printDim } from '../utils/output.js';

export const statusCommand = new Command('status')
  .description('Show collector status')
  .option('--json', 'output as JSON')
  .action((options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();

    try {
      const configPath = findConfigPath(globalOpts.config);

      if (!configPath) {
        printError('No configuration found.');
        printInfo("Run 'liferewind init' to create one.");
        process.exit(1);
      }

      const config = loadConfig(globalOpts.config);

      const enabledSources = Object.entries(config.sources)
        .filter(([, cfg]) => cfg.enabled)
        .map(([name, cfg]) => ({ name, schedule: cfg.schedule }));

      const status = {
        configPath,
        apiUrl: config.api.baseUrl,
        logLevel: config.logging.level,
        sources: enabledSources,
      };

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }

      printSuccess('Configuration loaded');
      printDim(`  Config: ${configPath}`);
      printDim(`  API: ${config.api.baseUrl}`);
      printDim(`  Log level: ${config.logging.level}`);
      console.log();

      if (enabledSources.length === 0) {
        printInfo('No data sources enabled.');
      } else {
        printInfo(`Enabled sources (${enabledSources.length}):`);
        for (const src of enabledSources) {
          console.log(`    - ${src.name} (${src.schedule})`);
        }
      }
    } catch (error) {
      printError(`Failed to load status: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
