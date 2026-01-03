import { db } from '..';
import { collectionLogs, type NewCollectionLog } from '../schema';

/**
 * Create a collection log entry
 */
export async function createCollectionLog(data: NewCollectionLog) {
  const [log] = await db.insert(collectionLogs).values(data).returning();
  return log;
}
