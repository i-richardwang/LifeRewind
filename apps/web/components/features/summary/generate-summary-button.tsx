'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui';
import { Plus, Loader2, ChevronDown, Calendar, CalendarDays } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, subMonths } from 'date-fns';

type Period = 'week' | 'month';

interface GenerateOption {
  label: string;
  period: Period;
  date: Date;
  description: string;
}

export function GenerateSummaryButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const today = new Date();

  const quickOptions: GenerateOption[] = [
    {
      label: 'This Week',
      period: 'week',
      date: today,
      description: `${format(startOfWeek(today, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(today, { weekStartsOn: 1 }), 'MMM d')}`,
    },
    {
      label: 'Last Week',
      period: 'week',
      date: subWeeks(today, 1),
      description: `${format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'MMM d')}`,
    },
    {
      label: 'This Month',
      period: 'month',
      date: today,
      description: format(today, 'MMMM yyyy'),
    },
    {
      label: 'Last Month',
      period: 'month',
      date: subMonths(today, 1),
      description: format(subMonths(today, 1), 'MMMM yyyy'),
    },
  ];

  const handleGenerate = async (period: Period, date: Date) => {
    setLoading(true);
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          date: date.toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || errorData.message || 'Failed to generate summary'
        );
      }

      toast.success('Summary generated successfully');
      router.refresh();
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Generate
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {quickOptions.map((option) => (
          <DropdownMenuItem
            key={`${option.period}-${option.label}`}
            onClick={() => handleGenerate(option.period, option.date)}
            disabled={loading}
          >
            {option.period === 'week' ? (
              <Calendar className="size-4 text-[var(--chart-2)]" />
            ) : (
              <CalendarDays className="size-4 text-[var(--chart-4)]" />
            )}
            <div className="flex flex-col">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
