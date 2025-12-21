import { homedir } from 'node:os';
import { resolve } from 'node:path';

/**
 * Expand a path that may start with ~ or ~/ to an absolute path.
 */
export function expandPath(path: string): string {
  if (path === '~') {
    return homedir();
  }
  if (path.startsWith('~/')) {
    return resolve(homedir(), path.slice(2));
  }
  return resolve(path);
}

/**
 * Parse comma-separated paths and trim whitespace
 */
export function parsePaths(input: string): string[] {
  return input
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}
