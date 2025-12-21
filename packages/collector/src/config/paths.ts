import { homedir } from 'node:os';
import { resolve } from 'node:path';

// Primary user config path
export const USER_CONFIG_DIR = resolve(homedir(), '.liferewind');
export const USER_CONFIG_PATH = resolve(USER_CONFIG_DIR, 'config.json');

// Legacy config paths (for backward compatibility)
export const LEGACY_CONFIG_PATHS = [
  resolve(homedir(), '.config/liferewind/collector.json'),
  resolve(homedir(), '.liferewind-collector.json'),
];

// Project-level config
export const PROJECT_CONFIG_PATH = './collector.config.json';

export function getUserConfigPath(): string {
  return USER_CONFIG_PATH;
}

export function getUserConfigDir(): string {
  return USER_CONFIG_DIR;
}

export function getAllConfigPaths(): string[] {
  return [USER_CONFIG_PATH, ...LEGACY_CONFIG_PATHS, PROJECT_CONFIG_PATH];
}
