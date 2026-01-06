'use client';

import { useRef, useCallback } from 'react';
import type { SummaryStatus } from '@/db/schema';

const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 60;

export interface PollingSummary {
  id: string;
  status: SummaryStatus;
  error?: string;
}

interface UseSummaryPollingOptions {
  onStatusChange?: (status: SummaryStatus) => void;
}

export function useSummaryPolling(options: UseSummaryPollingOptions = {}) {
  const { onStatusChange } = options;
  const abortControllerRef = useRef<AbortController | null>(null);

  const poll = useCallback(
    async (id: string, attempt = 0): Promise<PollingSummary> => {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        throw new Error('Generation timed out. Please try again.');
      }

      const res = await fetch(`/api/summary/${id}`, {
        signal: abortControllerRef.current?.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to check status');
      }

      const { data } = await res.json();
      const summary = data as PollingSummary;

      if (summary.status === 'completed') {
        return summary;
      }

      if (summary.status === 'failed') {
        throw new Error(summary.error || 'Generation failed');
      }

      onStatusChange?.(summary.status);

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      return poll(id, attempt + 1);
    },
    [onStatusChange]
  );

  const startPolling = useCallback(
    (id: string) => {
      abortControllerRef.current = new AbortController();
      return poll(id);
    },
    [poll]
  );

  const stopPolling = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return { startPolling, stopPolling, abortControllerRef };
}
