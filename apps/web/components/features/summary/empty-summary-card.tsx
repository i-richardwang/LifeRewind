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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { startPolling, stopPolling } = useSummaryPolling();

  // Derived state from props
  const isPending = existingSummary?.status === 'pending' || existingSummary?.status === 'generating';
  const isFailed = existingSummary?.status === 'failed';
  const isLoading = isSubmitting || isPending;

  const periodLabel = period === 'week' ? 'Week' : 'Month';
  const dateRange = `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;

  const statusText = isSubmitting
    ? 'Creating...'
    : existingSummary?.status === 'generating'
      ? 'Generating...'
      : 'Preparing...';

  // Start polling when existingSummary becomes pending/generating
  useEffect(() => {
    if (!existingSummary || !isPending) return;

    // Clear local submitting state since props now control the loading state
    setIsSubmitting(false);

    startPolling(existingSummary.id)
      .then(() => {
        toast.success('Summary generated successfully');
        router.refresh();
      })
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        toast.error(error.message || 'Generation failed');
        router.refresh();
      });

    return () => stopPolling();
  }, [existingSummary, isPending, startPolling, stopPolling, router]);

  const handleGenerate = async () => {
    setIsSubmitting(true);

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
        throw new Error(error.error || 'Failed to create summary');
      }

      router.refresh();
    } catch (error) {
      setIsSubmitting(false);
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    }
  };

  // No data state
  if (!hasData) {
    return (
      <Card className="flex flex-col border-dashed">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {periodLabel}: {dateRange}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-8">
          <Ban className="mb-3 size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No data collected for this {period}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <Card className="flex flex-col border-destructive/50">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {periodLabel}: {dateRange}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center py-8">
          <AlertCircle className="mb-3 size-8 text-destructive/50" />
          <p className="mb-1 text-sm font-medium text-destructive">
            Generation failed
          </p>
          <p className="mb-4 max-w-xs text-center text-xs text-muted-foreground">
            {existingSummary?.error}
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Retry'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty/Loading state - ready to generate or generating
  return (
    <Card className="flex flex-col border-dashed">
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {periodLabel}: {dateRange}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center py-8">
        <Sparkles className="mb-3 size-8 text-muted-foreground/50" />
        <p className="mb-4 text-sm text-muted-foreground">
          No summary generated yet
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
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
      </CardContent>
    </Card>
  );
}
