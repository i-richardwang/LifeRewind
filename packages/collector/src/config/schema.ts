import { z } from 'zod';

const scheduleFrequencySchema = z.enum(['hourly', 'daily', 'weekly', 'monthly', 'manual']);

// Git source
const gitOptionsSchema = z.object({
  repositories: z.array(z.string()),
  authors: z.array(z.string()).optional(),
  sinceDays: z.number(),
});

const gitSourceConfigSchema = z.object({
  enabled: z.boolean(),
  schedule: scheduleFrequencySchema,
  options: gitOptionsSchema,
});

// Browser source
const browserOptionsSchema = z.object({
  browsers: z.array(z.enum(['chrome', 'safari', 'arc', 'dia', 'comet'])),
  excludeDomains: z.array(z.string()),
  sinceDays: z.number(),
});

const browserSourceConfigSchema = z.object({
  enabled: z.boolean(),
  schedule: scheduleFrequencySchema,
  options: browserOptionsSchema,
});

// Filesystem source
const filesystemOptionsSchema = z.object({
  watchPaths: z.array(z.string()),
  excludePatterns: z.array(z.string()),
  fileTypes: z.array(z.string()).optional(),
});

const filesystemSourceConfigSchema = z.object({
  enabled: z.boolean(),
  schedule: scheduleFrequencySchema,
  options: filesystemOptionsSchema,
});

// AI Chat source
const aiChatOptionsSchema = z.object({
  providers: z.array(z.enum(['claude', 'chatgpt'])),
  exportPaths: z
    .object({
      claude: z.string().optional(),
      chatgpt: z.string().optional(),
    })
    .optional(),
});

const aiChatSourceConfigSchema = z.object({
  enabled: z.boolean(),
  schedule: scheduleFrequencySchema,
  options: aiChatOptionsSchema,
});

// Sources config with defaults
const sourcesSchema = z.object({
  git: gitSourceConfigSchema,
  browser: browserSourceConfigSchema,
  filesystem: filesystemSourceConfigSchema,
  'ai-chat': aiChatSourceConfigSchema,
});

// Default values defined once
const DEFAULT_SOURCES = {
  git: {
    enabled: true,
    schedule: 'daily' as const,
    options: { repositories: [], sinceDays: 30 },
  },
  browser: {
    enabled: false,
    schedule: 'daily' as const,
    options: { browsers: ['chrome' as const], excludeDomains: [], sinceDays: 7 },
  },
  filesystem: {
    enabled: false,
    schedule: 'daily' as const,
    options: { watchPaths: [], excludePatterns: ['**/node_modules/**', '**/.git/**'] },
  },
  'ai-chat': {
    enabled: false,
    schedule: 'weekly' as const,
    options: { providers: [] },
  },
} satisfies z.infer<typeof sourcesSchema>;

// Logging config
const loggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
});

const DEFAULT_LOGGING = {
  level: 'info' as const,
} satisfies z.infer<typeof loggingSchema>;

// Main config schema
export const configSchema = z.object({
  api: z.object({
    baseUrl: z.url(),
    apiKey: z.string().min(1),
    timeout: z.number().default(30000),
    retryAttempts: z.number().default(3),
  }),
  sources: sourcesSchema.default(DEFAULT_SOURCES),
  logging: loggingSchema.default(DEFAULT_LOGGING),
});

export type CollectorConfig = z.infer<typeof configSchema>;
