import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { confirm, select, checkbox, input } from '@inquirer/prompts';
import { detectInstalledBrowsers, detectGitInstalled, detectChatbotClients, getGitUserInfo } from '../detect/index.js';
import { writeConfig } from '../../config/writer.js';
import { getUserConfigPath } from '../../config/paths.js';
import { printBanner, printSection, printSuccess, printInfo, printDim, printWarning } from '../utils/output.js';
import {
  SCHEDULE_CHOICES_WITH_HINT,
  GIT_PATH_PRESETS,
  FILESYSTEM_PATH_PRESETS,
  selectPaths,
} from '../utils/prompts.js';
import { inputApiUrl, inputApiKey } from '../utils/api.js';
import { DEFAULT_SOURCES, type CollectorConfig } from '../../config/schema.js';

/** Create initial config with all sources disabled */
function createInitialConfig(): CollectorConfig {
  return {
    device: {
      id: randomUUID(),
      name: undefined,
    },
    api: { baseUrl: '', apiKey: '', timeout: 30000, retryAttempts: 3 },
    sources: {
      git: { ...DEFAULT_SOURCES.git, enabled: false, options: { ...DEFAULT_SOURCES.git.options, scanPaths: [] } },
      browser: { ...DEFAULT_SOURCES.browser, enabled: false, options: { ...DEFAULT_SOURCES.browser.options, browsers: [] } },
      filesystem: { ...DEFAULT_SOURCES.filesystem, enabled: false, options: { ...DEFAULT_SOURCES.filesystem.options, watchPaths: [] } },
      chatbot: { ...DEFAULT_SOURCES.chatbot, enabled: false, options: { ...DEFAULT_SOURCES.chatbot.options, clients: [] } },
    },
    logging: { level: 'info' },
  };
}

export const initCommand = new Command('init')
  .description('Initialize configuration with interactive wizard')
  .option('--force', 'overwrite existing configuration')
  .action(async (options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const configPath = globalOpts.config || getUserConfigPath();

    if (existsSync(configPath) && !options.force) {
      printInfo(`Configuration already exists at ${configPath}`);
      const overwrite = await confirm({
        message: 'Overwrite existing configuration?',
        default: false,
      });
      if (!overwrite) {
        printInfo('Aborted.');
        return;
      }
    }

    printBanner();

    const config = createInitialConfig();

    // Step 1: Device Configuration
    printSection('Step 1/7: Device Configuration');
    printDim(`  Device ID: ${config.device.id}`);
    printDim(`  Hostname: ${hostname()}`);
    console.log();

    const deviceName = await input({
      message: 'Device name (for identification):',
      default: hostname(),
    });
    if (deviceName.trim()) {
      config.device.name = deviceName.trim();
    }

    // Step 2: API Configuration
    printSection('Step 2/7: API Configuration');
    config.api.baseUrl = await inputApiUrl();
    config.api.apiKey = await inputApiKey();

    // Step 3: Browser History
    printSection('Step 3/7: Browser History');
    const detectedBrowsers = detectInstalledBrowsers();
    if (detectedBrowsers.length > 0) {
      printDim(`  Detected: ${detectedBrowsers.join(', ')}`);
    } else {
      printDim('  No supported browsers detected');
    }

    const enableBrowser = await confirm({
      message: 'Enable browser history collection?',
      default: true,
    });

    if (enableBrowser) {
      const selectedBrowsers = await checkbox({
        message: 'Select browsers to collect:',
        loop: false,
        choices: [
          { name: 'Chrome', value: 'chrome' as const, checked: detectedBrowsers.includes('chrome') },
          { name: 'Safari', value: 'safari' as const, checked: detectedBrowsers.includes('safari') },
          { name: 'Arc', value: 'arc' as const, checked: detectedBrowsers.includes('arc') },
          { name: 'Dia', value: 'dia' as const, checked: detectedBrowsers.includes('dia') },
          { name: 'Comet', value: 'comet' as const, checked: detectedBrowsers.includes('comet') },
        ],
      });

      if (selectedBrowsers.length === 0) {
        printWarning('No browsers selected, browser collection will be disabled.');
      } else {
        const browserSchedule = await select({
          message: 'Collection schedule:',
          choices: SCHEDULE_CHOICES_WITH_HINT,
          loop: false,
          default: 'daily',
        });

        config.sources.browser = {
          enabled: true,
          schedule: browserSchedule,
          options: {
            ...DEFAULT_SOURCES.browser.options,
            browsers: selectedBrowsers,
            excludeDomains: ['localhost', '127.0.0.1'],
          },
        };
      }
    }

    // Step 4: Git Commits
    printSection('Step 4/7: Git Commits');
    const gitInstalled = detectGitInstalled();
    const gitUser = getGitUserInfo();
    printDim(gitInstalled ? '  Git is installed' : '  Git not found');
    if (gitUser.email) {
      printDim(`  User: ${gitUser.name || 'unknown'} <${gitUser.email}>`);
    }

    const enableGit = await confirm({
      message: 'Enable git commit collection?',
      default: true,
    });

    if (enableGit) {
      const scanPaths = await selectPaths('Select paths to scan for git repositories:', GIT_PATH_PRESETS);

      if (scanPaths.length === 0) {
        printWarning('No paths selected, git collection will be disabled.');
      } else {
        // Ask about author filtering
        let authors: string[] | undefined;
        if (gitUser.email) {
          const filterByAuthor = await confirm({
            message: `Only collect your commits? (filter by ${gitUser.email})`,
            default: true,
          });
          if (filterByAuthor) {
            authors = [gitUser.email];
          }
        }

        const gitSchedule = await select({
          message: 'Collection schedule:',
          choices: SCHEDULE_CHOICES_WITH_HINT,
          loop: false,
          default: 'daily',
        });

        config.sources.git = {
          enabled: true,
          schedule: gitSchedule,
          options: {
            ...DEFAULT_SOURCES.git.options,
            scanPaths,
            ...(authors && { authors }),
          },
        };
      }
    }

    // Step 5: Filesystem
    printSection('Step 5/7: Filesystem Changes');
    const enableFilesystem = await confirm({
      message: 'Enable filesystem monitoring?',
      default: true,
    });

    if (enableFilesystem) {
      const watchPaths = await selectPaths('Select paths to monitor:', FILESYSTEM_PATH_PRESETS);

      if (watchPaths.length === 0) {
        printWarning('No paths selected, filesystem monitoring will be disabled.');
      } else {
        const fsSchedule = await select({
          message: 'Collection schedule:',
          choices: SCHEDULE_CHOICES_WITH_HINT,
          loop: false,
          default: 'daily',
        });

        config.sources.filesystem = {
          enabled: true,
          schedule: fsSchedule,
          options: {
            ...DEFAULT_SOURCES.filesystem.options,
            watchPaths,
          },
        };
      }
    }

    // Step 6: Chatbot
    printSection('Step 6/7: Chatbot History');
    const detectedChatbots = detectChatbotClients();
    if (detectedChatbots.length > 0) {
      printDim(`  Detected: ${detectedChatbots.join(', ')}`);
    } else {
      printDim('  No supported chatbot clients detected');
    }

    const enableChatbot = await confirm({
      message: 'Enable chatbot history collection?',
      default: true,
    });

    if (enableChatbot) {
      config.sources.chatbot = {
        enabled: true,
        schedule: 'daily',
        options: {
          ...DEFAULT_SOURCES.chatbot.options,
          clients: detectedChatbots.length > 0 ? detectedChatbots : ['chatwise'],
        },
      };
    }

    // Step 7: Initial Collection Settings
    printSection('Step 7/7: Initial Collection');
    printDim('  Configure how far back to collect data on the first run.');
    printDim('  Daily collection uses a shorter range (2 days by default).');
    console.log();

    const customizeInitial = await confirm({
      message: 'Customize initial collection range?',
      default: false,
    });

    if (customizeInitial) {
      const initialDaysInput = await input({
        message: 'Days to collect on first run (applies to all sources):',
        default: '90',
        validate: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 365) {
            return 'Please enter a number between 1 and 365';
          }
          return true;
        },
      });

      const initialDays = parseInt(initialDaysInput, 10);

      // Apply to all enabled sources
      if (config.sources.git.enabled) {
        config.sources.git.options.initialSinceDays = initialDays;
      }
      if (config.sources.browser.enabled) {
        config.sources.browser.options.initialSinceDays = initialDays;
      }
      if (config.sources.filesystem.enabled) {
        config.sources.filesystem.options.initialSinceDays = initialDays;
      }
      if (config.sources.chatbot.enabled) {
        config.sources.chatbot.options.initialSinceDays = initialDays;
      }
    }

    printSection('Configuration Summary');
    console.log(`  Device: ${config.device.name || 'unnamed'} (${config.device.id.slice(0, 8)}...)`);
    console.log(`  API: ${config.api.baseUrl}`);
    console.log('  Sources enabled:');
    console.log(`    ${config.sources.browser.enabled ? '✓' : '✗'} Browser`);
    const gitAuthors = config.sources.git.options.authors;
    const gitAuthorInfo = gitAuthors?.length ? ` (author: ${gitAuthors[0]})` : '';
    console.log(`    ${config.sources.git.enabled ? '✓' : '✗'} Git${config.sources.git.enabled ? gitAuthorInfo : ''}`);
    console.log(`    ${config.sources.filesystem.enabled ? '✓' : '✗'} Filesystem`);
    console.log(`    ${config.sources.chatbot.enabled ? '✓' : '✗'} Chatbot`);

    const shouldSave = await confirm({
      message: `Save configuration to ${configPath}?`,
      default: true,
    });

    if (shouldSave) {
      writeConfig(config, configPath);
      printSuccess('Configuration saved!');

      const runInitialCollection = await confirm({
        message: 'Run initial collection now? (uses extended time range)',
        default: true,
      });

      if (runInitialCollection) {
        console.log();
        printInfo('Starting initial collection...');
        console.log();

        const result = spawnSync(process.execPath, [process.argv[1] as string, 'collect', '--initial'], {
          stdio: 'inherit',
          cwd: process.cwd(),
        });

        if (result.status !== 0) {
          printWarning('Initial collection encountered issues. You can retry with: liferewind collect --initial');
        }
      } else {
        console.log(`
  Next steps:
    Run 'liferewind collect --initial' for first-time collection (extended range)
    Run 'liferewind start' to begin scheduled collection
    Run 'liferewind config edit' to modify settings
`);
      }
    } else {
      printInfo('Configuration not saved.');
    }
  });
