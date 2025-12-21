import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { getUserConfigPath } from './paths.js';
import { configSchema, type CollectorConfig } from './schema.js';

export function writeConfig(config: CollectorConfig, path?: string): void {
  // Validate config before writing
  const validated = configSchema.parse(config);

  const targetPath = path || getUserConfigPath();
  const dir = dirname(targetPath);

  // Ensure directory exists with secure permissions
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  // Write formatted JSON with secure permissions (owner read/write only)
  writeFileSync(targetPath, JSON.stringify(validated, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}
