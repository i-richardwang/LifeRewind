import { Command } from 'commander';
import { execSync } from 'node:child_process';
import pc from 'picocolors';
import { findConfigPath, loadConfig } from '../../config/loader.js';
import { detectInstalledBrowsers, detectGitInstalled, detectChatbotClients } from '../detect/index.js';
import { printSuccess, printError, printInfo } from '../utils/output.js';

interface CheckResult {
  ok: boolean;
  message: string;
  suggestion?: string;
}

function checkNodeVersion(): CheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0] ?? '0', 10);
  if (major >= 20) {
    return { ok: true, message: `Node.js ${version}` };
  }
  return {
    ok: false,
    message: `Node.js ${version} (requires >= 20)`,
    suggestion: 'Upgrade to Node.js 20 or later',
  };
}

function checkConfigExists(customPath?: string): CheckResult {
  const configPath = findConfigPath(customPath);
  if (configPath) {
    return { ok: true, message: `Found at ${configPath}` };
  }
  return {
    ok: false,
    message: 'No config file found',
    suggestion: "Run 'liferewind init' to create one",
  };
}

async function checkApiConnection(customPath?: string): Promise<CheckResult> {
  try {
    const config = loadConfig(customPath);
    const healthUrl = new URL('/api/health', config.api.baseUrl).toString();

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { ok: true, message: `API reachable at ${config.api.baseUrl}` };
    }
    return {
      ok: false,
      message: `API returned ${response.status}`,
      suggestion: 'Check if the web server is running',
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('No configuration')) {
      return { ok: false, message: 'Cannot check - no config', suggestion: "Run 'liferewind init' first" };
    }
    // Special handling for timeout errors
    if (error instanceof Error && (error.name === 'TimeoutError' || error.message.includes('timeout'))) {
      return {
        ok: false,
        message: 'Connection timeout (5s)',
        suggestion: 'Check if the web server is running and accessible',
      };
    }
    return {
      ok: false,
      message: `Cannot reach API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestion: 'Check if the web server is running and accessible',
    };
  }
}

function checkGitCommand(): CheckResult {
  if (detectGitInstalled()) {
    try {
      const version = execSync('git --version', { encoding: 'utf-8' }).trim();
      return { ok: true, message: version };
    } catch {
      return { ok: true, message: 'Git installed' };
    }
  }
  return {
    ok: false,
    message: 'Git not found',
    suggestion: 'Install Git if you want to collect git commits',
  };
}

function checkBrowserAccess(): CheckResult {
  const browsers = detectInstalledBrowsers();
  if (browsers.length > 0) {
    return { ok: true, message: `Detected: ${browsers.join(', ')}` };
  }
  return {
    ok: false,
    message: 'No supported browsers found',
    suggestion: 'Install Chrome, Safari, or Arc for browser history collection',
  };
}

function checkChatbotAccess(): CheckResult {
  const clients = detectChatbotClients();
  if (clients.length > 0) {
    return { ok: true, message: `Detected: ${clients.join(', ')}` };
  }
  return {
    ok: false,
    message: 'No chatbot clients found',
    suggestion: 'Install ChatWise for chatbot history collection',
  };
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose environment and configuration issues')
  .action(async (_options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const customPath = globalOpts.config as string | undefined;

    console.log('Running diagnostics...\n');

    // Synchronous checks
    const syncChecks: { name: string; result: CheckResult }[] = [
      { name: 'Node.js version', result: checkNodeVersion() },
      { name: 'Configuration file', result: checkConfigExists(customPath) },
      { name: 'Git availability', result: checkGitCommand() },
      { name: 'Browser databases', result: checkBrowserAccess() },
      { name: 'Chatbot clients', result: checkChatbotAccess() },
    ];

    let hasIssues = false;

    for (const { name, result } of syncChecks) {
      if (result.ok) {
        printSuccess(`${name}: ${result.message}`);
      } else {
        printError(`${name}: ${result.message}`);
        if (result.suggestion) {
          console.log(`  ${pc.dim('Suggestion:')} ${result.suggestion}`);
        }
        hasIssues = true;
      }
    }

    // Async check for API
    const apiResult = await checkApiConnection(customPath);
    if (apiResult.ok) {
      printSuccess(`API connectivity: ${apiResult.message}`);
    } else {
      printError(`API connectivity: ${apiResult.message}`);
      if (apiResult.suggestion) {
        console.log(`  ${pc.dim('Suggestion:')} ${apiResult.suggestion}`);
      }
      hasIssues = true;
    }

    console.log();
    if (hasIssues) {
      printInfo('Some issues were found. Address them for full functionality.');
    } else {
      printSuccess('All checks passed! The collector is ready to run.');
    }
  });
