'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@workspace/ui';
import { cn } from '@workspace/ui/lib/utils';
import type { SummaryPeriod } from '@/db/schema';

interface PeriodViewToggleProps {
  currentPeriod: SummaryPeriod | 'all';
}

export function PeriodViewToggle({ currentPeriod }: PeriodViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (period: SummaryPeriod | 'all') => {
    const params = new URLSearchParams(searchParams.toString());
    if (period === 'all') {
      params.delete('period');
    } else {
      params.set('period', period);
    }
    router.push(`/?${params.toString()}`);
  };

  const options: { value: SummaryPeriod | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border bg-muted p-1">
      {options.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 rounded-md px-3 text-xs',
            currentPeriod === option.value &&
              'bg-background shadow-sm hover:bg-background'
          )}
          onClick={() => handleChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
