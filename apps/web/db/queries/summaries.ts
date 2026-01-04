import { desc, eq, and, gte, lt, sql } from 'drizzle-orm';
import { db } from '..';
import {
  summaries,
  type Summary,
  type NewSummary,
  type SummaryPeriod,
} from '../schema';

export interface FindSummariesOptions {
  period?: SummaryPeriod;
  limit?: number;
}

export interface FindSummariesByMonthOptions {
  year: number;
  month: number; // 1-12
  period?: SummaryPeriod;
}

/**
 * Find summaries with optional filtering
 */
export async function findSummaries(
  options: FindSummariesOptions = {}
): Promise<Summary[]> {
  const { period, limit = 10 } = options;

  if (period) {
    return db
      .select()
      .from(summaries)
      .where(eq(summaries.period, period))
      .orderBy(desc(summaries.createdAt))
      .limit(limit);
  }

  return db
    .select()
    .from(summaries)
    .orderBy(desc(summaries.createdAt))
    .limit(limit);
}

/**
 * Create a new summary
 */
export async function createSummary(data: NewSummary): Promise<Summary> {
  const [summary] = await db.insert(summaries).values(data).returning();
  return summary!;
}

/**
 * Find summary by ID
 */
export async function findSummaryById(id: string): Promise<Summary | null> {
  const [summary] = await db
    .select()
    .from(summaries)
    .where(eq(summaries.id, id))
    .limit(1);
  return summary ?? null;
}

/**
 * Find summaries by year and month, deduplicated by periodStart (latest version only)
 */
export async function findSummariesByMonth(
  options: FindSummariesByMonthOptions
): Promise<Summary[]> {
  const { year, month, period } = options;

  // Calculate month boundaries
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // Build conditions
  const conditions = [
    gte(summaries.periodStart, monthStart),
    lt(summaries.periodStart, monthEnd),
  ];

  if (period) {
    conditions.push(eq(summaries.period, period));
  }

  // Get all summaries for this month
  const allSummaries = await db
    .select()
    .from(summaries)
    .where(and(...conditions))
    .orderBy(desc(summaries.periodStart), desc(summaries.createdAt));

  // Deduplicate: keep only the latest version for each periodStart
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
 * Get years that have summaries
 */
export async function getYearsWithSummaries(): Promise<number[]> {
  const result = await db
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${summaries.periodStart})::int`,
    })
    .from(summaries)
    .groupBy(sql`EXTRACT(YEAR FROM ${summaries.periodStart})`)
    .orderBy(desc(sql`EXTRACT(YEAR FROM ${summaries.periodStart})`));

  return result.map((r) => r.year);
}

/**
 * Get months in a year that have summaries
 */
export async function getMonthsWithSummaries(year: number): Promise<number[]> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const result = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${summaries.periodStart})::int`,
    })
    .from(summaries)
    .where(and(gte(summaries.periodStart, yearStart), lt(summaries.periodStart, yearEnd)))
    .groupBy(sql`EXTRACT(MONTH FROM ${summaries.periodStart})`)
    .orderBy(sql`EXTRACT(MONTH FROM ${summaries.periodStart})`);

  return result.map((r) => r.month);
}
