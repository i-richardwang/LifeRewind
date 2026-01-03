import { desc, eq } from 'drizzle-orm';
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
