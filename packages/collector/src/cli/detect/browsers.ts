import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type BrowserType = 'chrome' | 'safari' | 'arc' | 'dia' | 'comet';

const BROWSER_PATHS: Record<BrowserType, string> = {
  chrome: join(homedir(), 'Library/Application Support/Google/Chrome'),
  arc: join(homedir(), 'Library/Application Support/Arc/User Data'),
  safari: join(homedir(), 'Library/Safari'),
  dia: join(homedir(), 'Library/Application Support/Dia/User Data'),
  comet: join(homedir(), 'Library/Application Support/Comet'),
};

export function detectInstalledBrowsers(): BrowserType[] {
  const detected: BrowserType[] = [];

  for (const [browser, path] of Object.entries(BROWSER_PATHS)) {
    if (existsSync(path)) {
      detected.push(browser as BrowserType);
    }
  }

  return detected;
}
