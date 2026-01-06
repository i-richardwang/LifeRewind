import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { printDim } from './output.js';
import { directoryBrowser } from './directory-browser.js';

/**
 * Mask an API key for display (show first 8 and last 4 chars)
 */
export function maskApiKey(key: string): string {
  return key.length > 12 ? key.slice(0, 8) + '***...' + key.slice(-4) : '***';
}

/**
 * Show masked API key confirmation
 */
export function showMaskedKey(key: string): void {
  printDim(`  Saved as: ${maskApiKey(key)}`);
}

/**
 * Standard schedule choices for select prompts
 */
export const SCHEDULE_CHOICES = [
  { name: 'Hourly', value: 'hourly' as const },
  { name: 'Daily', value: 'daily' as const },
  { name: 'Weekly', value: 'weekly' as const },
  { name: 'Monthly', value: 'monthly' as const },
  { name: 'Manual only', value: 'manual' as const },
];

/**
 * Schedule choices with (recommended) hint for init wizard
 */
export const SCHEDULE_CHOICES_WITH_HINT = [
  { name: 'Hourly', value: 'hourly' as const },
  { name: 'Daily (recommended)', value: 'daily' as const },
  { name: 'Weekly', value: 'weekly' as const },
  { name: 'Manual only', value: 'manual' as const },
];

const home = homedir();

interface PathPresetsConfig {
  roots: string[];
  defaultSelected: string[];
}

/** Preset paths for Git repository scanning */
export const GIT_PATH_PRESETS: PathPresetsConfig = {
  roots: [home],
  defaultSelected: [`${home}/Documents`],
};

/** Preset paths for Filesystem monitoring */
export const FILESYSTEM_PATH_PRESETS: PathPresetsConfig = {
  roots: [home],
  defaultSelected: [`${home}/Documents`, `${home}/Downloads`],
};

/**
 * Interactive directory browser for path selection
 * Uses ↑↓ to navigate, Space to select, →/Enter to expand, ← to collapse
 */
export async function selectPaths(
  message: string,
  presets: PathPresetsConfig,
  currentPaths?: string[]
): Promise<string[]> {
  // Filter to existing root paths
  const rootPaths = presets.roots.filter((p) => existsSync(p));

  if (rootPaths.length === 0) {
    printDim('  No valid paths to browse');
    return [];
  }

  // Determine default selected paths (filter to existing)
  const defaultSelected = currentPaths
    ? currentPaths.filter((p) => existsSync(p))
    : presets.defaultSelected.filter((p) => existsSync(p));

  const selected = await directoryBrowser({
    message,
    rootPaths,
    defaultSelected,
  });

  return selected;
}
