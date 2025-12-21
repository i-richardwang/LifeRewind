import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { checkbox, input } from '@inquirer/prompts';
import { printDim } from './output.js';
import { expandPath } from '../../utils/path.js';

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

const ADD_CUSTOM_PATH = '__add_custom__';

interface PathPreset {
  path: string;
  defaultChecked: boolean;
}

/**
 * Interactive path selector with presets and custom path support
 */
export async function selectPaths(
  message: string,
  presets: PathPreset[],
  currentPaths?: string[]
): Promise<string[]> {
  const existingPresets = presets.filter((p) => existsSync(p.path));

  const choices = existingPresets.map((preset) => {
    const isChecked = currentPaths ? currentPaths.includes(preset.path) : preset.defaultChecked;
    return {
      name: preset.path.replace(home, '~'),
      value: preset.path,
      checked: isChecked,
    };
  });

  choices.push({
    name: '── Add custom path...',
    value: ADD_CUSTOM_PATH,
    checked: false,
  });

  const selected = await checkbox({
    message,
    choices,
    loop: false,
  });

  if (selected.includes(ADD_CUSTOM_PATH)) {
    const filtered = selected.filter((p) => p !== ADD_CUSTOM_PATH);
    const customPath = await input({
      message: 'Enter custom path:',
      validate: (value) => {
        if (!value.trim()) return 'Path cannot be empty';
        const expanded = expandPath(value.trim());
        if (!existsSync(expanded)) {
          return `Path does not exist: ${value}`;
        }
        return true;
      },
    });
    return [...filtered, expandPath(customPath.trim())];
  }

  return selected;
}
