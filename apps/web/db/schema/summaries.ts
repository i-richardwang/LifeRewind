import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export type SummaryPeriod = 'week' | 'month';

export interface SummaryDataStats {
  gitCommits: number;
  browserVisits: number;
  filesChanged: number;
  chatSessions: number;
}

export const summaries = pgTable(
  'summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Period info
    period: varchar('period', { length: 20 }).$type<SummaryPeriod>().notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // AI generated content
    title: text('title').notNull(),
    content: text('content').notNull(), // Markdown format
    highlights: jsonb('highlights').$type<string[]>(),

    // Metadata
    dataStats: jsonb('data_stats').$type<SummaryDataStats>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_summaries_period').on(table.period),
    index('idx_summaries_period_start').on(table.periodStart),
    index('idx_summaries_created_at').on(table.createdAt),
  ]
);

export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;
