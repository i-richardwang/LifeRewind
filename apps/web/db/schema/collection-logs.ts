import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import type { SourceType } from './collected-items';

export const collectionLogs = pgTable(
  'collection_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceType: varchar('source_type', { length: 20 }).$type<SourceType>().notNull(),
    itemsCount: integer('items_count').notNull(),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_collection_logs_source_type').on(table.sourceType),
    index('idx_collection_logs_received_at').on(table.receivedAt),
  ]
);

export type CollectionLog = typeof collectionLogs.$inferSelect;
export type NewCollectionLog = typeof collectionLogs.$inferInsert;
