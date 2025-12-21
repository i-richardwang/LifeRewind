import { readFileSync, existsSync } from 'node:fs';
import { ZodError } from 'zod';
import { configSchema, type CollectorConfig } from './schema.js';
import { getAllConfigPaths } from './paths.js';

export function loadConfig(customPath?: string): CollectorConfig {
  // Build search paths: custom path first, then standard paths
  const paths = customPath ? [customPath, ...getAllConfigPaths()] : getAllConfigPaths();

  for (const configPath of paths) {
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw) as unknown;
        return configSchema.parse(parsed);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON in config file ${configPath}: ${error.message}`);
        }
        if (error instanceof ZodError) {
          const issues = error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
          throw new Error(`Config validation failed in ${configPath}:\n${issues}`);
        }
        throw error;
      }
    }
  }

  // Check environment variables for API config
  const envApiUrl = process.env['LIFEREWIND_API_URL'];
  const envApiKey = process.env['LIFEREWIND_API_KEY'];

  if (envApiUrl && envApiKey) {
    try {
      return configSchema.parse({
        api: {
          baseUrl: envApiUrl,
          apiKey: envApiKey,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues
          .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
          .join('\n');
        throw new Error(`Environment variable config validation failed:\n${issues}`);
      }
      throw error;
    }
  }

  throw new Error(
    'No configuration found. Run `liferewind init` to create one, or set LIFEREWIND_API_URL and LIFEREWIND_API_KEY environment variables.'
  );
}

/**
 * Find and return the path of the first existing config file
 */
export function findConfigPath(customPath?: string): string | null {
  const paths = customPath ? [customPath, ...getAllConfigPaths()] : getAllConfigPaths();
  for (const configPath of paths) {
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}
