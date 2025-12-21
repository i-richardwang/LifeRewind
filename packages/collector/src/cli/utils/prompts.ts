import { existsSync } from 'node:fs';
import { printWarning, printDim } from './output.js';
import { expandPath } from './path.js';

/**
 * Mask an API key for display (show first 8 and last 4 chars)
 */
export function maskApiKey(key: string): string {
  return key.length > 12 ? key.slice(0, 8) + '***...' + key.slice(-4) : '***';
}

/**
 * Warn about paths that don't exist
 */
export function warnMissingPaths(paths: string[]): void {
  for (const p of paths) {
    if (!existsSync(expandPath(p))) {
      printWarning(`Path does not exist: ${p}`);
    }
  }
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
