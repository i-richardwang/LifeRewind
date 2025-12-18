export interface RetryOptions {
  attempts: number;
  delay: number;
  backoff: number;
  onRetry?: (error: Error, attempt: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: Error = new Error('Retry failed');
  let currentDelay = options.delay;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === options.attempts) {
        break;
      }

      options.onRetry?.(lastError, attempt);
      await sleep(currentDelay);
      currentDelay *= options.backoff;
    }
  }

  throw lastError;
}
