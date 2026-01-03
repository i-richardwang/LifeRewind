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

/** Preset paths for Git repository scanning */
export const GIT_PATH_PRESETS = [
  { path: `${home}/Documents`, defaultChecked: true },
  { path: `${home}/Desktop`, defaultChecked: false },
  { path: `${home}/Developer`, defaultChecked: false },
];

/** Preset paths for Filesystem monitoring */
export const FILESYSTEM_PATH_PRESETS = [
  { path: `${home}/Documents`, defaultChecked: true },
  { path: `${home}/Desktop`, defaultChecked: true },
  { path: `${home}/Downloads`, defaultChecked: true },
];

interface PathPreset {
  path: string;
  defaultChecked: boolean;
}

/**
 * Interactive directory browser for path selection
 * Uses ↑↓ to navigate, Space to select, →/Enter to expand, ← to collapse
 */
export async function selectPaths(
  message: string,
  presets: PathPreset[],
  currentPaths?: string[]
): Promise<string[]> {
  // Filter to existing paths
  const existingPresets = presets.filter((p) => existsSync(p.path));

  // Determine default selected paths
  const defaultSelected = existingPresets
    .filter((preset) => (currentPaths ? currentPaths.includes(preset.path) : preset.defaultChecked))
    .map((p) => p.path);

  // Use all preset paths as root paths for browsing
  const rootPaths = existingPresets.map((p) => p.path);

  if (rootPaths.length === 0) {
    printDim('  No valid paths to browse');
    return [];
  }

  const selected = await directoryBrowser({
    message,
    rootPaths,
    defaultSelected,
  });

  return selected;
}
