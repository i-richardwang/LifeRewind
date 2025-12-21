import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { loadConfig, findConfigPath } from '../../config/loader.js';
import { getUserConfigPath, getAllConfigPaths } from '../../config/paths.js';
import { printError, printSuccess, printInfo, printDim } from '../utils/output.js';

export const configCommand = new Command('config').description('Manage configuration');

function printConfigSummary(config: ReturnType<typeof loadConfig>, revealSecrets = false): void {
  console.log(pc.bold('\nAPI Configuration'));
  console.log(`  Base URL: ${config.api.baseUrl}`);

  const apiKey = revealSecrets
    ? config.api.apiKey
    : config.api.apiKey.length > 12
      ? config.api.apiKey.slice(0, 8) + '...' + config.api.apiKey.slice(-4)
      : '***';
  console.log(`  API Key:  ${apiKey}`);

  console.log(`  Timeout:  ${config.api.timeout}ms`);
  console.log(`  Retries:  ${config.api.retryAttempts}`);

  console.log(pc.bold('\nData Sources'));
  const sources = ['git', 'browser', 'filesystem', 'chatbot'] as const;
  for (const name of sources) {
    const src = config.sources[name];
    const status = src.enabled ? pc.green('enabled') : pc.dim('disabled');
    const schedule = src.enabled ? ` (${src.schedule})` : '';
    console.log(`  ${name}: ${status}${schedule}`);
  }

  console.log(pc.bold('\nLogging'));
  console.log(`  Level: ${config.logging.level}`);
}

configCommand
  .command('show')
  .description('Display current configuration')
  .option('--json', 'output as JSON')
  .option('--reveal-secrets', 'show API keys (hidden by default)')
  .action((options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();

    try {
      const config = loadConfig(globalOpts.config);
      const configPath = findConfigPath(globalOpts.config);

      if (configPath) {
        printDim(`Loaded from: ${configPath}`);
      }

      // Helper to mask API key
      const maskApiKey = (key: string) =>
        key.length > 12 ? key.slice(0, 8) + '...' + key.slice(-4) : '***';

      if (options.json) {
        const output = {
          ...config,
          api: {
            ...config.api,
            apiKey: options.revealSecrets ? config.api.apiKey : maskApiKey(config.api.apiKey),
          },
        };
        console.log(JSON.stringify(output, null, 2));
      } else {
        printConfigSummary(config, options.revealSecrets);
      }
    } catch (error) {
      printError(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

configCommand
  .command('path')
  .description('Show configuration file paths')
  .action(() => {
    const paths = getAllConfigPaths();
    console.log('Configuration file search order:');
    paths.forEach((p, i) => {
      const exists = existsSync(p);
      const status = exists ? '(exists)' : '';
      console.log(`  ${i + 1}. ${p} ${status}`);
    });
    console.log(`\nPrimary user config: ${getUserConfigPath()}`);
  });

configCommand
  .command('edit')
  .description('Open configuration in default editor')
  .action((_options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const configPath = findConfigPath(globalOpts.config);

    if (!configPath) {
      printError('No config file found.');
      printInfo("Run 'liferewind init' to create one.");
      process.exit(1);
    }

    const editor = process.env['EDITOR'] || process.env['VISUAL'] || (process.platform === 'darwin' ? 'open' : 'vi');

    try {
      execSync(`${editor} "${configPath}"`, { stdio: 'inherit' });
    } catch (error) {
      printError(`Failed to open editor: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

configCommand
  .command('validate')
  .description('Validate configuration file')
  .action((_options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();

    try {
      loadConfig(globalOpts.config);
      const configPath = findConfigPath(globalOpts.config);
      printSuccess(`Configuration is valid: ${configPath}`);
    } catch (error) {
      printError(`Configuration invalid: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
