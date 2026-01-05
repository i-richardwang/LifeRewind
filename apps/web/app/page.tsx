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
import { Card, CardContent, Skeleton } from '@workspace/ui';
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

  // Parse params with defaults (no DB needed)
  const now = new Date();
  const currentYear = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const currentMonth = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const periodFilter: SummaryPeriod | 'all' =
    params.period === 'week' || params.period === 'month' ? params.period : 'all';

  const monthDate = new Date(currentYear, currentMonth - 1, 1);
  const monthName = format(monthDate, 'MMMM yyyy');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Life Review" action={<GenerateSummaryButton />} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Year/Month picker - instant render, data enhancement via Suspense */}
            <div className="px-4 lg:px-6">
              <Suspense
                fallback={
                  <YearMonthPicker
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    earliestDataDate={null}
                  />
                }
              >
                <YearMonthPickerWithData
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                />
              </Suspense>
            </div>

            {/* Period filter and month title - instant render */}
            <div className="flex items-center justify-between px-4 lg:px-6">
              <h2 className="text-lg font-semibold">{monthName}</h2>
              <PeriodViewToggle currentPeriod={periodFilter} />
            </div>

            {/* Summary list - async load */}
            <div className="px-4 lg:px-6">
              <Suspense fallback={<SummaryListSkeleton />}>
                <SummaryListWithData
                  year={currentYear}
                  month={currentMonth}
                  periodFilter={periodFilter}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server component that fetches data for YearMonthPicker
async function YearMonthPickerWithData({
  currentYear,
  currentMonth,
}: {
  currentYear: number;
  currentMonth: number;
}) {
  const [monthsWithData, earliestDataDate] = await Promise.all([
    getMonthsWithSummaries(currentYear),
    getEarliestItemDate(),
  ]);

  return (
    <YearMonthPicker
      currentYear={currentYear}
      currentMonth={currentMonth}
      monthsWithData={monthsWithData}
      earliestDataDate={earliestDataDate}
    />
  );
}

// Server component that fetches data for SummaryList
async function SummaryListWithData({
  year,
  month,
  periodFilter,
}: {
  year: number;
  month: number;
  periodFilter: SummaryPeriod | 'all';
}) {
  const monthDate = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  // Generate date ranges for all periods in this month
  const ranges: Array<{ from: Date; to: Date }> = [];

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

  if (periodFilter === 'all' || periodFilter === 'month') {
    ranges.push({ from: monthStart, to: monthEnd });
  }

  const [summaries, earliestDataDate, dataAvailability] = await Promise.all([
    findSummariesByMonth({
      year,
      month,
      period: periodFilter === 'all' ? undefined : periodFilter,
    }),
    getEarliestItemDate(),
    getDataAvailabilityForRanges(ranges),
  ]);

  return (
    <SummaryList
      summaries={summaries}
      year={year}
      month={month}
      periodFilter={periodFilter}
      earliestDataDate={earliestDataDate}
      dataAvailability={dataAvailability}
    />
  );
}

// Skeleton for SummaryList
function SummaryListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-48" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
