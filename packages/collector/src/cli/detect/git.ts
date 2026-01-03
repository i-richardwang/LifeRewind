import { execSync } from 'node:child_process';

export function detectGitInstalled(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export interface GitUserInfo {
  name: string | null;
  email: string | null;
}

/** Get the current git user configuration (user.name and user.email) */
export function getGitUserInfo(): GitUserInfo {
  let name: string | null = null;
  let email: string | null = null;

  try {
    name = execSync('git config user.name', { encoding: 'utf-8' }).trim() || null;
  } catch {
    // Not configured
  }

  try {
    email = execSync('git config user.email', { encoding: 'utf-8' }).trim() || null;
  } catch {
    // Not configured
  }

  return { name, email };
}
