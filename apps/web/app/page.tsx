import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
} from 'date-fns';
import { Skeleton } from '@workspace/ui';
import { Header } from '@/components/layout';
import {
  SummaryList,
  GenerateSummaryButton,
  YearMonthPicker,
  PeriodViewToggle,
} from '@/components/features/summary';
import { findSummariesByMonth, getMonthsWithSummaries } from '@/db/queries/summaries';
import { getEarliestItemDate, getDataAvailabilityForRanges } from '@/db/queries/items';
import type { SummaryPeriod } from '@/db/schema';

export const metadata: Metadata = {
  title: 'Life Review',
  description: 'AI-powered summaries of your digital footprints',
};

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    period?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse params with defaults
  const now = new Date();
  const currentYear = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const currentMonth = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const periodFilter: SummaryPeriod | 'all' =
    params.period === 'week' || params.period === 'month' ? params.period : 'all';

  const monthDate = new Date(currentYear, currentMonth - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  // Generate date ranges for all periods in this month
  const ranges: Array<{ from: Date; to: Date }> = [];

  // Add weekly ranges
  if (periodFilter === 'all' || periodFilter === 'week') {
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );
    for (const weekStart of weeks) {
      ranges.push({
        from: startOfWeek(weekStart, { weekStartsOn: 1 }),
        to: endOfWeek(weekStart, { weekStartsOn: 1 }),
      });
    }
  }

  // Add monthly range
  if (periodFilter === 'all' || periodFilter === 'month') {
    ranges.push({ from: monthStart, to: monthEnd });
  }

  // Fetch all data in parallel
  const [summaries, monthsWithData, earliestDataDate, dataAvailability] = await Promise.all([
    findSummariesByMonth({
      year: currentYear,
      month: currentMonth,
      period: periodFilter === 'all' ? undefined : periodFilter,
    }),
    getMonthsWithSummaries(currentYear),
    getEarliestItemDate(),
    getDataAvailabilityForRanges(ranges),
  ]);

  const monthName = format(monthDate, 'MMMM yyyy');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Life Review" action={<GenerateSummaryButton />} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              {/* Year and Month Picker */}
              <Suspense fallback={<Skeleton className="h-20 w-full" />}>
                <YearMonthPicker
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  monthsWithData={monthsWithData}
                  earliestDataDate={earliestDataDate}
                />
              </Suspense>
            </div>

            {/* Period filter and month title */}
            <div className="flex items-center justify-between px-4 lg:px-6">
              <h2 className="text-lg font-semibold">{monthName}</h2>
              <Suspense fallback={<Skeleton className="h-9 w-32" />}>
                <PeriodViewToggle currentPeriod={periodFilter} />
              </Suspense>
            </div>

            {/* Summary list */}
            <div className="px-4 lg:px-6">
              <SummaryList
                summaries={summaries}
                year={currentYear}
                month={currentMonth}
                periodFilter={periodFilter}
                earliestDataDate={earliestDataDate}
                dataAvailability={dataAvailability}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
