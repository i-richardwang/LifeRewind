'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui';
import {
  Plus,
  Loader2,
  ChevronDown,
  Calendar,
  CalendarDays,
} from 'lucide-react';
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
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customPeriod, setCustomPeriod] = useState<Period>('week');
  const router = useRouter();

  const today = new Date();

  // Pre-defined quick options
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
      setCustomDateOpen(false);
    }
  };

  const handleCustomGenerate = () => {
    if (!customDate) {
      toast.warning('Please select a date');
      return;
    }
    handleGenerate(customPeriod, new Date(customDate));
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
          Generate Summary
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Generate</DropdownMenuLabel>

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

        <DropdownMenuSeparator />

        <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
          <PopoverTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setCustomDateOpen(true);
              }}
            >
              <Calendar className="size-4 text-muted-foreground" />
              Choose Date...
            </DropdownMenuItem>
          </PopoverTrigger>

          <PopoverContent className="w-72" align="end" side="left">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Period Type</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={customPeriod === 'week' ? 'default' : 'outline'}
                    onClick={() => setCustomPeriod('week')}
                    className="flex-1"
                  >
                    Weekly
                  </Button>
                  <Button
                    size="sm"
                    variant={customPeriod === 'month' ? 'default' : 'outline'}
                    onClick={() => setCustomPeriod('month')}
                    className="flex-1"
                  >
                    Monthly
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select {customPeriod === 'week' ? 'any day in the week' : 'any day in the month'}
                </label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  max={format(today, 'yyyy-MM-dd')}
                />
                {customDate && (
                  <p className="text-xs text-muted-foreground">
                    {customPeriod === 'week'
                      ? `Week: ${format(startOfWeek(new Date(customDate), { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(new Date(customDate), { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                      : `Month: ${format(new Date(customDate), 'MMMM yyyy')}`}
                  </p>
                )}
              </div>

              <Button
                onClick={handleCustomGenerate}
                disabled={loading || !customDate}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Generate
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
