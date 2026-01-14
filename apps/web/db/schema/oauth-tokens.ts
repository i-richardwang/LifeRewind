import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export type OAuthProvider = 'gmail';

export const oauthTokens = pgTable(
  'oauth_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: varchar('provider', { length: 20 }).$type<OAuthProvider>().notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    scope: text('scope').notNull(),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_oauth_tokens_provider_email').on(table.provider, table.email),
  ]
);

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;
