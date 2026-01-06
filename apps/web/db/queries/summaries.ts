import { desc, eq, and, gte, lt } from 'drizzle-orm';
import { db } from '..';
import {
  summaries,
  type Summary,
  type NewSummary,
  type SummaryPeriod,
  type SummaryStatus,
} from '../schema';

export interface FindSummariesOptions {
  period?: SummaryPeriod;
  limit?: number;
  includeNonCompleted?: boolean;
}

export interface FindSummariesByMonthOptions {
  year: number;
  month: number;
  period?: SummaryPeriod;
  includeNonCompleted?: boolean;
}

export interface UpdateSummaryData {
  status?: SummaryStatus;
  error?: string | null;
  title?: string;
  content?: string;
  highlights?: string[];
  dataStats?: {
    gitCommits: number;
    browserVisits: number;
    filesChanged: number;
    chatSessions: number;
  };
}

export async function findSummaries(
  options: FindSummariesOptions = {}
): Promise<Summary[]> {
  const { period, limit = 10, includeNonCompleted = false } = options;

  const conditions = [];

  if (period) {
    conditions.push(eq(summaries.period, period));
  }

  if (!includeNonCompleted) {
    conditions.push(eq(summaries.status, 'completed'));
  }

  return db
    .select()
    .from(summaries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(summaries.createdAt))
    .limit(limit);
}

export async function createSummary(data: NewSummary): Promise<Summary> {
  const [summary] = await db.insert(summaries).values(data).returning();
  return summary!;
}

export async function findSummaryById(id: string): Promise<Summary | null> {
  const [summary] = await db
    .select()
    .from(summaries)
    .where(eq(summaries.id, id))
    .limit(1);
  return summary ?? null;
}

export async function updateSummary(
  id: string,
  data: UpdateSummaryData
): Promise<Summary | null> {
  const [updated] = await db
    .update(summaries)
    .set(data)
    .where(eq(summaries.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Find summaries that overlap with the given year/month.
 * Overlap: periodStart < monthEnd AND periodEnd >= monthStart
 */
export async function findSummariesByMonth(
  options: FindSummariesByMonthOptions
): Promise<Summary[]> {
  const { year, month, period, includeNonCompleted = false } = options;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const conditions = [
    lt(summaries.periodStart, monthEnd),
    gte(summaries.periodEnd, monthStart),
  ];

  if (period) {
    conditions.push(eq(summaries.period, period));
  }

  if (!includeNonCompleted) {
    conditions.push(eq(summaries.status, 'completed'));
  }

  const allSummaries = await db
    .select()
    .from(summaries)
    .where(and(...conditions))
    .orderBy(desc(summaries.periodStart), desc(summaries.createdAt));

  // Deduplicate: keep only the latest for each period+periodStart
  const seen = new Map<string, Summary>();
  for (const summary of allSummaries) {
    const key = `${summary.period}-${summary.periodStart.toISOString()}`;
    if (!seen.has(key)) {
      seen.set(key, summary);
    }
  }

  return Array.from(seen.values());
}

/**
 * Get years that have completed summaries.
 * Considers both periodStart and periodEnd for cross-year periods.
 */
export async function getYearsWithSummaries(): Promise<number[]> {
  const allSummaries = await db
    .select({
      periodStart: summaries.periodStart,
      periodEnd: summaries.periodEnd,
    })
    .from(summaries)
    .where(eq(summaries.status, 'completed'));

  const yearsSet = new Set<number>();
  for (const summary of allSummaries) {
    yearsSet.add(summary.periodStart.getFullYear());
    yearsSet.add(summary.periodEnd.getFullYear());
  }

  return Array.from(yearsSet).sort((a, b) => b - a);
}

/**
 * Get months in a year that have completed summaries.
 * Considers summaries that overlap with each month.
 */
export async function getMonthsWithSummaries(year: number): Promise<number[]> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const allSummaries = await db
    .select({
      periodStart: summaries.periodStart,
      periodEnd: summaries.periodEnd,
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.status, 'completed'),
        lt(summaries.periodStart, yearEnd),
        gte(summaries.periodEnd, yearStart)
      )
    );

  const monthsSet = new Set<number>();
  for (const summary of allSummaries) {
    for (let m = 1; m <= 12; m++) {
      const monthStart = new Date(year, m - 1, 1);
      const monthEnd = new Date(year, m, 1);
      if (summary.periodStart < monthEnd && summary.periodEnd >= monthStart) {
        monthsSet.add(m);
      }
    }
  }

  return Array.from(monthsSet).sort((a, b) => a - b);
}
