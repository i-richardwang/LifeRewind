'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@workspace/ui';
import { cn } from '@workspace/ui/lib/utils';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface YearMonthPickerProps {
  currentYear: number;
  currentMonth: number;
  monthsWithData?: number[];
  earliestDataDate: Date | null;
}

export function YearMonthPicker({
  currentYear,
  currentMonth,
  monthsWithData = [],
  earliestDataDate,
}: YearMonthPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const currentYearNow = now.getFullYear();
  const currentMonthNow = now.getMonth() + 1;

  // Calculate boundaries
  const earliestYear = earliestDataDate?.getFullYear() ?? currentYearNow;
  const earliestMonth = earliestDataDate ? earliestDataDate.getMonth() + 1 : 1;

  const updateParams = (year: number, month: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', year.toString());
    params.set('month', month.toString());
    router.push(`/?${params.toString()}`);
  };

  // Navigate to previous month (cross-year)
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      updateParams(currentYear - 1, 12);
    } else {
      updateParams(currentYear, currentMonth - 1);
    }
  };

  // Navigate to next month (cross-year)
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      updateParams(currentYear + 1, 1);
    } else {
      updateParams(currentYear, currentMonth + 1);
    }
  };

  const handleMonthClick = (month: number) => {
    updateParams(currentYear, month);
  };

  const isCurrentYearMonth =
    currentYear === currentYearNow && currentMonth === currentMonthNow;
  const isEarliestYearMonth =
    currentYear === earliestYear && currentMonth === earliestMonth;

  // Can go prev if not at earliest date
  const canGoPrev = !isEarliestYearMonth;
  // Can go next if not at current date
  const canGoNext = !isCurrentYearMonth;

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Prev month button */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={handlePrevMonth}
        disabled={!canGoPrev}
      >
        <ChevronLeft className="size-4" />
      </Button>

      {/* Year label */}
      <span className="px-2 text-sm font-semibold tabular-nums">
        {currentYear}
      </span>

      {/* Month buttons */}
      {MONTHS.map((monthName, index) => {
        const month = index + 1;
        const isSelected = month === currentMonth;
        const hasData = monthsWithData.includes(month);

        // Check if month is in the future (for current year)
        const isFuture = currentYear === currentYearNow && month > currentMonthNow;

        // Check if month is before earliest data (for earliest year)
        const isBeforeData = currentYear === earliestYear && month < earliestMonth;

        // Check if year is before earliest or after current
        const isYearOutOfRange = currentYear < earliestYear || currentYear > currentYearNow;

        const isDisabled = isFuture || isBeforeData || isYearOutOfRange;

        return (
          <Button
            key={month}
            variant={isSelected ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 w-10 text-xs',
              !isSelected && hasData && 'font-medium',
              !isSelected && !hasData && 'text-muted-foreground',
              isDisabled && 'pointer-events-none opacity-40'
            )}
            onClick={() => handleMonthClick(month)}
            disabled={isDisabled}
          >
            {monthName}
          </Button>
        );
      })}

      {/* Next month button */}
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={handleNextMonth}
        disabled={!canGoNext}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
