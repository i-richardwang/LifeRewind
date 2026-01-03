import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { Skeleton } from '@workspace/ui';
import { Header } from '@/components/layout';
import {
  TimelineContent,
  TimelineSidebar,
  QuickDatePicker,
  MobileDatePicker,
} from '@/components/features/timeline';
import { findItems, getDatesWithData } from '@/db/queries/items';
import type { SourceType } from '@/db/schema';

export const metadata: Metadata = {
  title: 'Timeline',
  description: 'View your daily activity timeline',
};

interface PageProps {
  searchParams: Promise<{
    date?: string;
    source?: string | string[];
  }>;
}

export default async function TimelinePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse date
  const targetDate = params.date ? new Date(params.date) : new Date();
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  // Parse source filters
  const sourceParams = params.source;
  const selectedSources: SourceType[] = sourceParams
    ? ((Array.isArray(sourceParams) ? sourceParams : [sourceParams]) as SourceType[])
    : [];

  // Fetch data in parallel
  const [items, datesWithData] = await Promise.all([
    findItems({
      from: dayStart,
      to: dayEnd,
      sources: selectedSources.length > 0 ? selectedSources : undefined,
      limit: 500,
    }),
    getDatesWithData({
      from: startOfMonth(targetDate),
      to: endOfMonth(targetDate),
    }),
  ]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Timeline" />

      {/* Main content with right sidebar */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Content area - scrollable */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:py-6 lg:px-6">
          {/* Quick date picker */}
          <div className="shrink-0">
            <Suspense fallback={<Skeleton className="h-9 w-64" />}>
              <QuickDatePicker currentDate={targetDate} />
            </Suspense>
          </div>

          {/* Mobile date picker (shown on small screens) */}
          <div className="mt-4 shrink-0">
            <Suspense fallback={<Skeleton className="h-10 w-full lg:hidden" />}>
              <MobileDatePicker
                selectedDate={targetDate}
                initialDatesWithData={datesWithData}
              />
            </Suspense>
          </div>

          {/* Timeline content - takes remaining space and scrolls */}
          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            <TimelineContent items={items} currentDate={targetDate} />
          </div>
        </div>

        {/* Right sidebar with calendar (desktop only) - fixed, not scrollable */}
        <Suspense
          fallback={
            <div className="hidden w-[280px] shrink-0 border-l lg:block">
              <div className="p-4">
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="p-4">
                <Skeleton className="h-[280px] w-full" />
              </div>
            </div>
          }
        >
          <TimelineSidebar
            selectedDate={targetDate}
            initialDatesWithData={datesWithData}
            selectedSources={selectedSources}
          />
        </Suspense>
      </div>
    </div>
  );
}
