import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

/**
 * Expand a path that may start with ~/ to an absolute path.
 */
export function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return resolve(homedir(), path.slice(2));
  }
  return resolve(path);
}

/**
 * Check if a directory is a git repository (contains .git folder).
 */
export function isGitRepository(dirPath: string): boolean {
  const gitDir = resolve(dirPath, '.git');
  return existsSync(gitDir);
}
