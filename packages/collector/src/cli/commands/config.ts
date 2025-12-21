import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import pc from 'picocolors';
import { input, confirm, select, checkbox } from '@inquirer/prompts';
import { loadConfig, findConfigPath } from '../../config/loader.js';
import { writeConfig } from '../../config/writer.js';
import { getUserConfigPath, getAllConfigPaths } from '../../config/paths.js';
import { printError, printSuccess, printInfo, printDim } from '../utils/output.js';
import { detectInstalledBrowsers, detectGitInstalled, detectChatbotClients } from '../detect/index.js';
import { parsePaths } from '../utils/path.js';
import { maskApiKey, warnMissingPaths, showMaskedKey, SCHEDULE_CHOICES } from '../utils/prompts.js';
import type { CollectorConfig } from '../../config/schema.js';
import type { BrowserType } from '../../sources/browser/types.js';

export const configCommand = new Command('config').description('Manage configuration');

function printConfigSummary(config: ReturnType<typeof loadConfig>, revealSecrets = false): void {
  console.log(pc.bold('\nAPI Configuration'));
  console.log(`  Base URL: ${config.api.baseUrl}`);
  console.log(`  API Key:  ${revealSecrets ? config.api.apiKey : maskApiKey(config.api.apiKey)}`);
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
  .description('Interactive configuration editor')
  .action(async (_options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const configPath = findConfigPath(globalOpts.config) || getUserConfigPath();

    let config: CollectorConfig;
    try {
      config = loadConfig(globalOpts.config);
      printDim(`Editing: ${configPath}`);
    } catch {
      printError('No valid config file found.');
      printInfo("Run 'liferewind init' to create one.");
      process.exit(1);
    }

    let hasChanges = false;

    // Main menu loop
    while (true) {
      const choice = await select({
        message: 'What would you like to configure?',
        choices: [
          { name: `API Settings ${pc.dim(`(${config.api.baseUrl})`)}`, value: 'api' },
          {
            name: `Browser Collection ${config.sources.browser.enabled ? pc.green('✓') : pc.dim('✗')}`,
            value: 'browser',
          },
          { name: `Git Collection ${config.sources.git.enabled ? pc.green('✓') : pc.dim('✗')}`, value: 'git' },
          {
            name: `Filesystem Collection ${config.sources.filesystem.enabled ? pc.green('✓') : pc.dim('✗')}`,
            value: 'filesystem',
          },
          {
            name: `Chatbot Collection ${config.sources.chatbot.enabled ? pc.green('✓') : pc.dim('✗')}`,
            value: 'chatbot',
          },
          { name: `Logging ${pc.dim(`(${config.logging.level})`)}`, value: 'logging' },
          { name: pc.dim('─────────────'), value: 'separator', disabled: true },
          { name: hasChanges ? pc.green('Save and Exit') : 'Exit', value: 'exit' },
        ],
      });

      if (choice === 'exit') {
        if (hasChanges) {
          const shouldSave = await confirm({ message: 'Save changes?', default: true });
          if (shouldSave) {
            writeConfig(config, configPath);
            printSuccess('Configuration saved!');
          } else {
            printInfo('Changes discarded.');
          }
        }
        break;
      }

      // Handle each section
      if (choice === 'api') {
        const newUrl = await input({
          message: 'API Base URL:',
          default: config.api.baseUrl,
          validate: (value) => {
            try {
              new URL(value);
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          },
        });

        const changeKey = await confirm({ message: 'Change API Key?', default: false });
        let newKey = config.api.apiKey;
        if (changeKey) {
          newKey = await input({
            message: 'New API Key:',
            validate: (value) => (value.length > 0 ? true : 'API Key is required'),
          });
          showMaskedKey(newKey);
        }

        if (newUrl !== config.api.baseUrl || newKey !== config.api.apiKey) {
          config.api.baseUrl = newUrl;
          config.api.apiKey = newKey;
          hasChanges = true;
        }
      }

      if (choice === 'browser') {
        const detectedBrowsers = detectInstalledBrowsers();
        if (detectedBrowsers.length > 0) {
          printDim(`  Detected: ${detectedBrowsers.join(', ')}`);
        }

        const enabled = await confirm({
          message: 'Enable browser history collection?',
          default: config.sources.browser.enabled,
        });

        if (enabled) {
          const currentBrowsers = config.sources.browser.options.browsers || [];
          const selectedBrowsers = await checkbox({
            message: 'Select browsers:',
            choices: (['chrome', 'safari', 'arc', 'dia', 'comet'] as const).map((b) => ({
              name: b.charAt(0).toUpperCase() + b.slice(1),
              value: b,
              checked: currentBrowsers.includes(b),
            })),
          });

          const schedule = await select({
            message: 'Collection schedule:',
            choices: SCHEDULE_CHOICES,
            default: config.sources.browser.schedule,
          });

          config.sources.browser = {
            enabled: true,
            schedule,
            options: { ...config.sources.browser.options, browsers: selectedBrowsers as BrowserType[] },
          };
        } else {
          config.sources.browser.enabled = false;
        }
        hasChanges = true;
      }

      if (choice === 'git') {
        const gitInstalled = detectGitInstalled();
        printDim(gitInstalled ? '  Git is installed' : '  Git not found');

        const enabled = await confirm({
          message: 'Enable git commit collection?',
          default: config.sources.git.enabled,
        });

        if (enabled) {
          const currentPaths = config.sources.git.options.scanPaths || [];
          const pathsInput = await input({
            message: 'Paths to scan (comma-separated):',
            default: currentPaths.join(',') || `${homedir()}/Projects`,
          });
          const scanPaths = parsePaths(pathsInput);
          warnMissingPaths(scanPaths);

          const schedule = await select({
            message: 'Collection schedule:',
            choices: SCHEDULE_CHOICES,
            default: config.sources.git.schedule,
          });

          config.sources.git = {
            enabled: true,
            schedule,
            options: { ...config.sources.git.options, scanPaths },
          };
        } else {
          config.sources.git.enabled = false;
        }
        hasChanges = true;
      }

      if (choice === 'filesystem') {
        const enabled = await confirm({
          message: 'Enable filesystem monitoring?',
          default: config.sources.filesystem.enabled,
        });

        if (enabled) {
          const currentPaths = config.sources.filesystem.options.watchPaths || [];
          const pathsInput = await input({
            message: 'Paths to monitor (comma-separated):',
            default: currentPaths.join(',') || `${homedir()}/Documents`,
          });
          const watchPaths = parsePaths(pathsInput);
          warnMissingPaths(watchPaths);

          const schedule = await select({
            message: 'Collection schedule:',
            choices: SCHEDULE_CHOICES,
            default: config.sources.filesystem.schedule,
          });

          config.sources.filesystem = {
            enabled: true,
            schedule,
            options: { ...config.sources.filesystem.options, watchPaths },
          };
        } else {
          config.sources.filesystem.enabled = false;
        }
        hasChanges = true;
      }

      if (choice === 'chatbot') {
        const detectedChatbots = detectChatbotClients();
        if (detectedChatbots.length > 0) {
          printDim(`  Detected: ${detectedChatbots.join(', ')}`);
        }

        const enabled = await confirm({
          message: 'Enable chatbot history collection?',
          default: config.sources.chatbot.enabled,
        });

        if (enabled) {
          const schedule = await select({
            message: 'Collection schedule:',
            choices: SCHEDULE_CHOICES,
            default: config.sources.chatbot.schedule,
          });

          config.sources.chatbot = {
            enabled: true,
            schedule,
            options: {
              ...config.sources.chatbot.options,
              clients: detectedChatbots.length > 0 ? detectedChatbots : ['chatwise'],
            },
          };
        } else {
          config.sources.chatbot.enabled = false;
        }
        hasChanges = true;
      }

      if (choice === 'logging') {
        const level = await select({
          message: 'Log level:',
          choices: [
            { name: 'Debug (verbose)', value: 'debug' as const },
            { name: 'Info (default)', value: 'info' as const },
            { name: 'Warn', value: 'warn' as const },
            { name: 'Error (quiet)', value: 'error' as const },
          ],
          default: config.logging.level,
        });

        if (level !== config.logging.level) {
          config.logging.level = level;
          hasChanges = true;
        }
      }
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
