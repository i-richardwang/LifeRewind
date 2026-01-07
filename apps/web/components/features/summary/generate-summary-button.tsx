'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@workspace/ui';
import { Sparkles, Loader2 } from 'lucide-react';

export function GenerateSummaryButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/summary/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create summary tasks');
      }

      const { data } = await res.json();

      if (data.created > 0) {
        toast.success(`Started generating ${data.created} summary${data.created > 1 ? 'ies' : ''}`);
        router.refresh();
      } else {
        toast.info('All summaries for this month are already generated');
      }
    } catch (error) {
      console.error('Failed to generate summaries:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate summaries');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleGenerate} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {loading ? 'Generating...' : 'Generate'}
    </Button>
  );
}
