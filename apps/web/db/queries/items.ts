import { and, desc, gte, lte, inArray, sql, asc } from 'drizzle-orm';
import { db } from '..';
import {
  collectedItems,
  type SourceType,
  type CollectedItem,
  type NewCollectedItem,
} from '../schema';

export interface FindItemsOptions {
  sources?: SourceType[];
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Find collected items with filtering
 */
export async function findItems(options: FindItemsOptions = {}): Promise<CollectedItem[]> {
  const { sources, from, to, limit = 100, offset = 0 } = options;
  const conditions = [];

  if (sources?.length) {
    conditions.push(inArray(collectedItems.sourceType, sources));
  }
  if (from) {
    conditions.push(gte(collectedItems.timestamp, from));
  }
  if (to) {
    conditions.push(lte(collectedItems.timestamp, to));
  }

  return db
    .select()
    .from(collectedItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(collectedItems.timestamp))
    .limit(limit)
    .offset(offset);
}

/**
 * Count items matching criteria
 */
export async function countItems(
  options: Omit<FindItemsOptions, 'limit' | 'offset'> = {}
): Promise<number> {
  const { sources, from, to } = options;
  const conditions = [];

  if (sources?.length) {
    conditions.push(inArray(collectedItems.sourceType, sources));
  }
  if (from) {
    conditions.push(gte(collectedItems.timestamp, from));
  }
  if (to) {
    conditions.push(lte(collectedItems.timestamp, to));
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectedItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result?.count ?? 0;
}

/**
 * Get item counts grouped by source type
 */
export async function getItemCountsBySource(
  options: Omit<FindItemsOptions, 'limit' | 'offset' | 'sources'> = {}
) {
  const { from, to } = options;
  const conditions = [];

  if (from) {
    conditions.push(gte(collectedItems.timestamp, from));
  }
  if (to) {
    conditions.push(lte(collectedItems.timestamp, to));
  }

  return db
    .select({
      sourceType: collectedItems.sourceType,
      count: sql<number>`count(*)::int`,
    })
    .from(collectedItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(collectedItems.sourceType);
}

/**
 * Get daily item counts grouped by source type
 */
export async function getDailyItemCounts(
  options: Omit<FindItemsOptions, 'limit' | 'offset' | 'sources'> = {}
) {
  const { from, to } = options;
  const conditions = [];

  if (from) {
    conditions.push(gte(collectedItems.timestamp, from));
  }
  if (to) {
    conditions.push(lte(collectedItems.timestamp, to));
  }

  return db
    .select({
      date: sql<string>`date(${collectedItems.timestamp})`,
      sourceType: collectedItems.sourceType,
      count: sql<number>`count(*)::int`,
    })
    .from(collectedItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`date(${collectedItems.timestamp})`, collectedItems.sourceType)
    .orderBy(sql`date(${collectedItems.timestamp})`);
}

/**
 * Get distinct dates that have data within a date range
 */
export async function getDatesWithData(
  options: { from: Date; to: Date }
): Promise<Date[]> {
  const { from, to } = options;

  const results = await db
    .selectDistinct({
      date: sql<string>`date(${collectedItems.timestamp})`,
    })
    .from(collectedItems)
    .where(
      and(
        gte(collectedItems.timestamp, from),
        lte(collectedItems.timestamp, to)
      )
    )
    .orderBy(sql`date(${collectedItems.timestamp})`);

  return results.map((r) => new Date(r.date));
}

/**
 * Batch insert items with conflict handling
 */
export async function insertItems(
  items: NewCollectedItem[],
  onConflict: 'ignore' | 'update' = 'ignore'
) {
  if (items.length === 0) return [];

  if (onConflict === 'update') {
    return db
      .insert(collectedItems)
      .values(items)
      .onConflictDoUpdate({
        target: [collectedItems.sourceType, collectedItems.deviceId, collectedItems.sourceKey],
        set: {
          timestamp: sql`excluded.timestamp`,
          title: sql`excluded.title`,
          url: sql`excluded.url`,
          data: sql`excluded.data`,
          deviceName: sql`excluded.device_name`,
          collectedAt: sql`excluded.collected_at`,
        },
      })
      .returning();
  }

  return db
    .insert(collectedItems)
    .values(items)
    .onConflictDoNothing({
      target: [collectedItems.sourceType, collectedItems.deviceId, collectedItems.sourceKey],
    })
    .returning();
}

/**
 * Upsert filesystem items with conditional dailyModifyCount increment
 * Only increments count when lastModifiedTime is newer
 */
export async function upsertFilesystemItems(items: NewCollectedItem[]) {
  if (items.length === 0) return [];

  // Use raw SQL for conditional update logic
  return db
    .insert(collectedItems)
    .values(items)
    .onConflictDoUpdate({
      target: [collectedItems.sourceType, collectedItems.deviceId, collectedItems.sourceKey],
      set: {
        // Update timestamp to the newer one
        timestamp: sql`
          CASE
            WHEN excluded.timestamp > ${collectedItems.timestamp}
            THEN excluded.timestamp
            ELSE ${collectedItems.timestamp}
          END
        `,
        title: sql`excluded.title`,
        url: sql`excluded.url`,
        deviceName: sql`excluded.device_name`,
        // Conditionally update data with incremented count
        data: sql`
          CASE
            WHEN excluded.timestamp > ${collectedItems.timestamp}
            THEN jsonb_set(
              jsonb_set(
                jsonb_set(
                  excluded.data,
                  '{dailyModifyCount}',
                  to_jsonb(COALESCE((${collectedItems.data}->>'dailyModifyCount')::int, 1) + 1)
                ),
                '{firstModifiedTime}',
                COALESCE(${collectedItems.data}->'firstModifiedTime', excluded.data->'firstModifiedTime')
              ),
              '{lastModifiedTime}',
              excluded.data->'lastModifiedTime'
            )
            ELSE ${collectedItems.data}
          END
        `,
        collectedAt: sql`excluded.collected_at`,
      },
    })
    .returning();
}

/**
 * Get the earliest item timestamp
 */
export async function getEarliestItemDate(): Promise<Date | null> {
  const [result] = await db
    .select({ timestamp: collectedItems.timestamp })
    .from(collectedItems)
    .orderBy(asc(collectedItems.timestamp))
    .limit(1);

  return result?.timestamp ?? null;
}

/**
 * Check if there is any data in a date range
 */
export async function hasDataInRange(from: Date, to: Date): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectedItems)
    .where(and(gte(collectedItems.timestamp, from), lte(collectedItems.timestamp, to)))
    .limit(1);

  return (result?.count ?? 0) > 0;
}

/**
 * Get data availability for multiple date ranges
 */
export async function getDataAvailabilityForRanges(
  ranges: Array<{ from: Date; to: Date }>
): Promise<Map<string, boolean>> {
  if (ranges.length === 0) return new Map();

  // Build a query that checks each range
  const results = await Promise.all(
    ranges.map(async ({ from, to }) => {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(collectedItems)
        .where(and(gte(collectedItems.timestamp, from), lte(collectedItems.timestamp, to)))
        .limit(1);
      return { key: `${from.toISOString()}-${to.toISOString()}`, hasData: (result?.count ?? 0) > 0 };
    })
  );

  return new Map(results.map((r) => [r.key, r.hasData]));
}
