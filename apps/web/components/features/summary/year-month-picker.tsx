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

  // Calculate year boundaries
  const earliestYear = earliestDataDate?.getFullYear() ?? currentYearNow;
  const earliestMonth = earliestDataDate ? earliestDataDate.getMonth() + 1 : 1;

  const updateParams = (year: number, month: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', year.toString());
    params.set('month', month.toString());
    router.push(`/?${params.toString()}`);
  };

  const handlePrevYear = () => {
    updateParams(currentYear - 1, currentMonth);
  };

  const handleNextYear = () => {
    updateParams(currentYear + 1, currentMonth);
  };

  const handleMonthClick = (month: number) => {
    updateParams(currentYear, month);
  };

  const isCurrentYear = currentYear === currentYearNow;
  const isEarliestYear = currentYear === earliestYear;
  const canGoPrev = currentYear > earliestYear;
  const canGoNext = currentYear < currentYearNow;

  return (
    <div className="space-y-3">
      {/* Year selector */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handlePrevYear}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[4rem] text-center text-lg font-semibold">
          {currentYear}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleNextYear}
          disabled={!canGoNext}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Month grid */}
      <div className="flex flex-wrap justify-center gap-1">
        {MONTHS.map((monthName, index) => {
          const month = index + 1;
          const isSelected = month === currentMonth;
          const hasData = monthsWithData.includes(month);

          // Check if month is in the future
          const isFuture = isCurrentYear && month > currentMonthNow;

          // Check if month is before earliest data
          const isBeforeData = isEarliestYear && month < earliestMonth;

          const isDisabled = isFuture || isBeforeData;

          return (
            <Button
              key={month}
              variant={isSelected ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 w-12 text-xs',
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
      </div>
    </div>
  );
}
