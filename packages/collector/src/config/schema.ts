import { z } from 'zod';

const scheduleFrequencySchema = z.enum(['hourly', 'daily', 'weekly', 'monthly', 'manual']);

// Git source
const gitOptionsSchema = z.object({
  scanPaths: z.array(z.string()),
  excludeRepositories: z.array(z.string()).optional(),
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
  sinceDays: z.number().default(7),
  maxFileSize: z.number().optional(),
  includeContent: z.boolean().default(true),
});

const filesystemSourceConfigSchema = z.object({
  enabled: z.boolean(),
  schedule: scheduleFrequencySchema,
  options: filesystemOptionsSchema,
});

// Chatbot source
const chatbotOptionsSchema = z.object({
  clients: z.array(z.enum(['chatwise'])),
  sinceDays: z.number().default(30),
  includeContent: z.boolean().default(true),
  maxMessagesPerChat: z.number().optional(),
  excludeModels: z.array(z.string()).optional(),
});

const chatbotSourceConfigSchema = z.object({
  enabled: z.boolean(),
  schedule: scheduleFrequencySchema,
  options: chatbotOptionsSchema,
});

// Sources config with defaults
const sourcesSchema = z.object({
  git: gitSourceConfigSchema,
  browser: browserSourceConfigSchema,
  filesystem: filesystemSourceConfigSchema,
  chatbot: chatbotSourceConfigSchema,
});

// Default values defined once
const DEFAULT_SOURCES = {
  git: {
    enabled: true,
    schedule: 'daily' as const,
    options: { scanPaths: [], excludeRepositories: [], sinceDays: 30 },
  },
  browser: {
    enabled: true,
    schedule: 'daily' as const,
    options: { browsers: ['chrome' as const], excludeDomains: [], sinceDays: 7 },
  },
  filesystem: {
    enabled: true,
    schedule: 'daily' as const,
    options: {
      watchPaths: [],
      excludePatterns: ['**/node_modules/**', '**/.git/**', '**/Library/**', '**/AppData/**'],
      fileTypes: ['.md', '.txt', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.pdf', '.pages', '.numbers', '.key'],
      sinceDays: 7,
      includeContent: true,
    },
  },
  chatbot: {
    enabled: true,
    schedule: 'daily' as const,
    options: {
      clients: ['chatwise' as const],
      sinceDays: 30,
      includeContent: true,
    },
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
