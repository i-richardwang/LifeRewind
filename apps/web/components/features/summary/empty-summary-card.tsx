'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Calendar, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardDescription, CardContent, Button } from '@workspace/ui';
import type { SummaryPeriod } from '@/db/schema';

interface EmptySummaryCardProps {
  period: SummaryPeriod;
  periodStart: Date;
  periodEnd: Date;
  hasData: boolean;
}

export function EmptySummaryCard({
  period,
  periodStart,
  periodEnd,
  hasData,
}: EmptySummaryCardProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const periodLabel = period === 'week' ? 'Week' : 'Month';
  const dateRange = `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`;

  const handleGenerate = async () => {
    setIsGenerating(true);
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
        throw new Error(error.error || 'Failed to generate summary');
      }

      toast.success('Summary generated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {periodLabel}: {dateRange}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8">
        {hasData ? (
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
                  Generating...
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
