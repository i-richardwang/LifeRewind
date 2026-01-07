import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  isSameWeek,
  isSameMonth,
  isAfter,
  isBefore,
  differenceInDays,
} from 'date-fns';
import { Sparkles } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@workspace/ui';
import type { Summary, SummaryPeriod } from '@/db/schema';
import { weekBelongsToMonth } from '@/lib/date-utils';
import { SummaryCard } from './summary-card';
import { EmptySummaryCard } from './empty-summary-card';

interface SummaryListProps {
  summaries: Summary[];
  year: number;
  month: number;
  periodFilter: SummaryPeriod | 'all';
  earliestDataDate: Date | null;
  dataAvailability: Map<string, boolean>;
}

interface PeriodSlot {
  period: SummaryPeriod;
  periodStart: Date;
  periodEnd: Date;
  summary?: Summary;
  hasData: boolean;
}

export function SummaryList({
  summaries,
  year,
  month,
  periodFilter,
  earliestDataDate,
  dataAvailability,
}: SummaryListProps) {
  const now = new Date();
  const monthDate = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  // Generate all period slots for this month
  const slots: PeriodSlot[] = [];

  // Add weekly slots
  if (periodFilter === 'all' || periodFilter === 'week') {
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    for (const weekStart of weeks) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const periodStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });

      // ISO week rule: week belongs to month containing its Thursday
      if (!weekBelongsToMonth(periodStartDate, monthDate)) continue;

      // Skip future weeks
      if (isAfter(periodStartDate, now)) continue;

      // Skip weeks before earliest data
      if (earliestDataDate && isBefore(weekEnd, earliestDataDate)) continue;

      // Skip current week if less than 4 days have passed
      const isCurrentWeek = isSameWeek(now, periodStartDate, { weekStartsOn: 1 });
      if (isCurrentWeek) {
        const daysPassed = differenceInDays(now, periodStartDate) + 1;
        if (daysPassed < 4) continue;
      }

      const rangeKey = `${periodStartDate.toISOString()}-${weekEnd.toISOString()}`;
      const hasData = dataAvailability.get(rangeKey) ?? false;

      const matchingSummary = summaries.find(
        (s) =>
          s.period === 'week' &&
          isSameWeek(new Date(s.periodStart), weekStart, { weekStartsOn: 1 })
      );

      slots.push({
        period: 'week',
        periodStart: periodStartDate,
        periodEnd: weekEnd,
        summary: matchingSummary,
        hasData,
      });
    }
  }

  // Add monthly slot
  if (periodFilter === 'all' || periodFilter === 'month') {
    // Skip future months
    if (!isAfter(monthStart, now)) {
      // Skip months before earliest data
      const skipMonth = earliestDataDate && isBefore(monthEnd, earliestDataDate);

      // Skip current month if less than 15 days have passed
      const isCurrentMonth = isSameMonth(now, monthDate);
      const daysPassed = isCurrentMonth ? differenceInDays(now, monthStart) + 1 : 31;

      if (!skipMonth && daysPassed >= 15) {
        const rangeKey = `${monthStart.toISOString()}-${monthEnd.toISOString()}`;
        const hasData = dataAvailability.get(rangeKey) ?? false;

        const matchingSummary = summaries.find(
          (s) =>
            s.period === 'month' &&
            isSameMonth(new Date(s.periodStart), monthDate)
        );

        slots.push({
          period: 'month',
          periodStart: monthStart,
          periodEnd: monthEnd,
          summary: matchingSummary,
          hasData,
        });
      }
    }
  }

  // Sort: monthly first, then weekly by periodStart descending
  slots.sort((a, b) => {
    if (a.period !== b.period) {
      return a.period === 'month' ? -1 : 1;
    }
    return b.periodStart.getTime() - a.periodStart.getTime();
  });

  if (slots.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles />
          </EmptyMedia>
          <EmptyTitle>No data for this month</EmptyTitle>
          <EmptyDescription>
            There is no collected data for this period yet
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {slots.map((slot) => {
        const key = `${slot.period}-${slot.periodStart.toISOString()}`;

        if (slot.summary) {
          // If summary is completed, show normal card
          if (slot.summary.status === 'completed') {
            return <SummaryCard key={key} summary={slot.summary} />;
          }

          // For pending/generating/failed, show empty card with existing summary info
          return (
            <EmptySummaryCard
              key={key}
              period={slot.period}
              periodStart={slot.periodStart}
              periodEnd={slot.periodEnd}
              hasData={slot.hasData}
              existingSummary={{
                id: slot.summary.id,
                status: slot.summary.status,
                error: slot.summary.error,
              }}
            />
          );
        }

        return (
          <EmptySummaryCard
            key={key}
            period={slot.period}
            periodStart={slot.periodStart}
            periodEnd={slot.periodEnd}
            hasData={slot.hasData}
          />
        );
      })}
    </div>
  );
}
