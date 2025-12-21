import { execSync } from 'node:child_process';

export function detectGitInstalled(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
