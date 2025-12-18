import { z } from 'zod';
import type { CollectionResult } from '../core/types.js';
import type { Logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
}

const pushResponseSchema = z.object({
  success: z.boolean(),
  itemsReceived: z.number(),
  message: z.string().optional(),
});

export type PushResponse = z.infer<typeof pushResponseSchema>;

export class ApiClient {
  private config: ApiClientConfig;
  private logger: Logger;

  constructor(config: ApiClientConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async pushData(result: CollectionResult): Promise<PushResponse> {
    const url = `${this.config.baseUrl}/api/collector/ingest`;

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'X-Source-Type': result.sourceType,
          },
          body: JSON.stringify({
            sourceType: result.sourceType,
            collectedAt: result.collectedAt.toISOString(),
            items: result.items,
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }

        const json: unknown = await response.json();
        return pushResponseSchema.parse(json);
      },
      {
        attempts: this.config.retryAttempts,
        delay: 1000,
        backoff: 2,
        onRetry: (error, attempt) => {
          this.logger.warn(`API push retry ${attempt}/${this.config.retryAttempts}`, error);
        },
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
