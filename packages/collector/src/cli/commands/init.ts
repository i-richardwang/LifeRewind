import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { confirm, select, checkbox } from '@inquirer/prompts';
import { detectInstalledBrowsers, detectGitInstalled, detectChatbotClients } from '../detect/index.js';
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
import type { CollectorConfig } from '../../config/schema.js';

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

    const config: CollectorConfig = {
      api: { baseUrl: '', apiKey: '', timeout: 30000, retryAttempts: 3 },
      sources: {
        git: { enabled: false, schedule: 'daily', options: { scanPaths: [], sinceDays: 30 } },
        browser: { enabled: false, schedule: 'daily', options: { browsers: [], excludeDomains: [], sinceDays: 7 } },
        filesystem: {
          enabled: false,
          schedule: 'daily',
          options: {
            watchPaths: [],
            excludePatterns: ['**/node_modules/**', '**/.git/**', '**/Library/**'],
            sinceDays: 7,
            includeContent: true,
          },
        },
        chatbot: { enabled: false, schedule: 'daily', options: { clients: [], sinceDays: 30, includeContent: true } },
      },
      logging: { level: 'info' },
    };

    // Step 1: API Configuration
    printSection('Step 1/5: API Configuration');
    config.api.baseUrl = await inputApiUrl();
    config.api.apiKey = await inputApiKey();

    // Step 2: Browser History
    printSection('Step 2/5: Browser History');
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
            browsers: selectedBrowsers,
            excludeDomains: ['localhost', '127.0.0.1'],
            sinceDays: 7,
          },
        };
      }
    }

    // Step 3: Git Commits
    printSection('Step 3/5: Git Commits');
    const gitInstalled = detectGitInstalled();
    printDim(gitInstalled ? '  Git is installed' : '  Git not found');

    const enableGit = await confirm({
      message: 'Enable git commit collection?',
      default: true,
    });

    if (enableGit) {
      const scanPaths = await selectPaths('Select paths to scan for git repositories:', GIT_PATH_PRESETS);

      if (scanPaths.length === 0) {
        printWarning('No paths selected, git collection will be disabled.');
      } else {
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
            scanPaths,
            sinceDays: 30,
          },
        };
      }
    }

    // Step 4: Filesystem
    printSection('Step 4/5: Filesystem Changes');
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
            watchPaths,
            excludePatterns: ['**/node_modules/**', '**/.git/**', '**/Library/**'],
            sinceDays: 7,
            includeContent: true,
          },
        };
      }
    }

    // Step 5: Chatbot
    printSection('Step 5/5: Chatbot History');
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
          clients: detectedChatbots.length > 0 ? detectedChatbots : ['chatwise'],
          sinceDays: 30,
          includeContent: true,
        },
      };
    }

    printSection('Configuration Summary');
    console.log(`  API: ${config.api.baseUrl}`);
    console.log('  Sources enabled:');
    console.log(`    ${config.sources.browser.enabled ? '✓' : '✗'} Browser`);
    console.log(`    ${config.sources.git.enabled ? '✓' : '✗'} Git`);
    console.log(`    ${config.sources.filesystem.enabled ? '✓' : '✗'} Filesystem`);
    console.log(`    ${config.sources.chatbot.enabled ? '✓' : '✗'} Chatbot`);

    const shouldSave = await confirm({
      message: `Save configuration to ${configPath}?`,
      default: true,
    });

    if (shouldSave) {
      writeConfig(config, configPath);
      printSuccess('Configuration saved!');
      console.log(`
  Next steps:
    Run 'liferewind start' to begin collecting data
    Run 'liferewind collect' for immediate collection
    Run 'liferewind config edit' to modify settings
`);
    } else {
      printInfo('Configuration not saved.');
    }
  });
