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
export type SummaryStatus = 'pending' | 'generating' | 'completed' | 'failed';

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

    // Task status
    status: varchar('status', { length: 20 })
      .$type<SummaryStatus>()
      .default('pending')
      .notNull(),
    error: text('error'),

    // AI generated content (nullable for pending/generating status)
    title: text('title'),
    content: text('content'), // Markdown format
    highlights: jsonb('highlights').$type<string[]>(),

    // Metadata
    dataStats: jsonb('data_stats').$type<SummaryDataStats>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_summaries_period').on(table.period),
    index('idx_summaries_period_start').on(table.periodStart),
    index('idx_summaries_created_at').on(table.createdAt),
    index('idx_summaries_status').on(table.status),
  ]
);

export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;
