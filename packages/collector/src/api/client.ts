import { z } from 'zod';
import type { CollectionResult } from '../core/types.js';
import type { Logger } from '../utils/logger.js';
import type { DeviceConfig } from '../config/schema.js';
import { retry } from '../utils/retry.js';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  device: DeviceConfig;
}

const pushResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    itemsReceived: z.number(),
    itemsInserted: z.number(),
    requestId: z.string(),
  }),
});

export type PushResponse = z.infer<typeof pushResponseSchema>;

interface BatchResult {
  requestId: string;
  itemsInserted: number;
}

export class ApiClient {
  private static readonly BATCH_SIZE = 1000;

  private config: ApiClientConfig;
  private logger: Logger;

  constructor(config: ApiClientConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async pushData(result: CollectionResult): Promise<PushResponse> {
    if (result.items.length <= ApiClient.BATCH_SIZE) {
      return this.pushBatch(result);
    }

    return this.pushInBatches(result);
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

  private async pushInBatches(result: CollectionResult): Promise<PushResponse> {
    const batches = this.splitIntoBatches(result.items, ApiClient.BATCH_SIZE);

    this.logger.info(
      `Splitting ${result.items.length} items into ${batches.length} batches (${ApiClient.BATCH_SIZE} items/batch)`
    );

    const batchResults: BatchResult[] = [];

    for (const [index, batch] of batches.entries()) {
      const batchNumber = index + 1;

      this.logger.info(`Pushing batch ${batchNumber}/${batches.length} (${batch.length} items)`);

      try {
        const response = await this.pushBatch({
          ...result,
          items: batch,
          itemsCollected: batch.length,
        });

        batchResults.push({
          requestId: response.data.requestId,
          itemsInserted: response.data.itemsInserted,
        });

        this.logger.info(
          `Batch ${batchNumber}/${batches.length} completed: ` +
            `requestId=${response.data.requestId}, inserted=${response.data.itemsInserted}/${batch.length}`
        );
      } catch (error) {
        const successfulBatches = batchResults.length;
        const totalInserted = batchResults.reduce((sum, r) => sum + r.itemsInserted, 0);

        this.logger.error(
          `Batch ${batchNumber}/${batches.length} failed. ` +
            `${successfulBatches} batches succeeded (${totalInserted} items inserted).`,
          error
        );

        throw new Error(
          `Batch ${batchNumber}/${batches.length} failed after ${successfulBatches} successful batches ` +
            `(${totalInserted} items inserted). ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    const totalInserted = batchResults.reduce((sum, r) => sum + r.itemsInserted, 0);
    const lastRequestId = batchResults[batchResults.length - 1]?.requestId ?? 'unknown';

    return {
      success: true,
      data: {
        itemsReceived: result.items.length,
        itemsInserted: totalInserted,
        requestId: lastRequestId,
      },
    };
  }

  private async pushBatch(result: CollectionResult): Promise<PushResponse> {
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
            deviceId: this.config.device.id,
            deviceName: this.config.device.name,
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

  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
