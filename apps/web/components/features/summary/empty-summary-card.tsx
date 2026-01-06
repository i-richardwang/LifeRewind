'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Calendar, Ban, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardDescription, CardContent, Button } from '@workspace/ui';
import { useSummaryPolling } from '@/hooks';
import type { SummaryPeriod, SummaryStatus } from '@/db/schema';

interface EmptySummaryCardProps {
  period: SummaryPeriod;
  periodStart: Date;
  periodEnd: Date;
  hasData: boolean;
  existingSummary?: {
    id: string;
    status: SummaryStatus;
    error?: string | null;
  };
}

export function EmptySummaryCard({
  period,
  periodStart,
  periodEnd,
  hasData,
  existingSummary,
}: EmptySummaryCardProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(
    existingSummary?.status === 'pending' || existingSummary?.status === 'generating'
  );
  const [isFailed, setIsFailed] = useState(existingSummary?.status === 'failed');
  const [errorMessage, setErrorMessage] = useState<string | null>(existingSummary?.error || null);
  const [statusText, setStatusText] = useState(
    existingSummary?.status === 'generating' ? 'Generating...' : 'Preparing...'
  );

  const { startPolling, stopPolling } = useSummaryPolling({
    onStatusChange: (status) => {
      setStatusText(status === 'generating' ? 'Generating...' : 'Preparing...');
    },
  });

  const periodLabel = period === 'week' ? 'Week' : 'Month';
  const dateRange = `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;

  useEffect(() => {
    if (!existingSummary) return;
    if (existingSummary.status !== 'pending' && existingSummary.status !== 'generating') return;

    startPolling(existingSummary.id)
      .then(() => {
        toast.success('Summary generated successfully');
        router.refresh();
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setIsFailed(true);
        setIsGenerating(false);
        setErrorMessage(error instanceof Error ? error.message : 'Generation failed');
      });

    return () => stopPolling();
  }, [existingSummary, startPolling, stopPolling, router]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setIsFailed(false);
    setErrorMessage(null);
    setStatusText('Creating task...');

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          date: periodStart.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create summary task');
      }

      const { data } = await response.json();

      await startPolling(data.id);

      toast.success('Summary generated successfully');
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setIsFailed(true);
      setErrorMessage(error instanceof Error ? error.message : 'Generation failed');
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setIsFailed(false);
    setErrorMessage(null);
    handleGenerate();
  };

  const handleDismiss = () => {
    setIsFailed(false);
    setErrorMessage(null);
  };

  return (
    <Card className={isFailed ? 'border-destructive/50' : 'border-dashed'}>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {periodLabel}: {dateRange}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8">
        {isFailed ? (
          <>
            <AlertCircle className="mb-3 size-8 text-destructive/50" />
            <p className="mb-1 text-sm font-medium text-destructive">
              Generation failed
            </p>
            <p className="mb-4 max-w-xs text-center text-xs text-muted-foreground">
              {errorMessage}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDismiss}>
                Dismiss
              </Button>
              <Button variant="default" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </>
        ) : hasData ? (
          <>
            <Sparkles className="mb-3 size-8 text-muted-foreground/50" />
            <p className="mb-4 text-sm text-muted-foreground">
              No summary generated yet
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {statusText}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Summary
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Ban className="mb-3 size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No data collected for this {period}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
