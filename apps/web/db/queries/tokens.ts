import { eq, and } from 'drizzle-orm';
import { db } from '..';
import { oauthTokens, type OAuthToken, type NewOAuthToken, type OAuthProvider } from '../schema';

/**
 * Find OAuth token by provider (for single-account scenarios)
 */
export async function findTokenByProvider(
  provider: OAuthProvider
): Promise<OAuthToken | undefined> {
  const results = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.provider, provider))
    .limit(1);

  return results[0];
}

/**
 * Upsert OAuth token (insert or update)
 */
export async function upsertToken(token: NewOAuthToken): Promise<OAuthToken> {
  const results = await db
    .insert(oauthTokens)
    .values(token)
    .onConflictDoUpdate({
      target: [oauthTokens.provider, oauthTokens.email],
      set: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        scope: token.scope,
        updatedAt: new Date(),
      },
    })
    .returning();

  return results[0]!;
}

/**
 * Update last sync time
 */
export async function updateLastSyncAt(
  provider: OAuthProvider,
  email: string
): Promise<void> {
  await db
    .update(oauthTokens)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(and(eq(oauthTokens.provider, provider), eq(oauthTokens.email, email)));
}

/**
 * Update tokens after refresh
 */
export async function updateTokens(
  provider: OAuthProvider,
  email: string,
  accessToken: string,
  expiresAt: Date
): Promise<void> {
  await db
    .update(oauthTokens)
    .set({ accessToken, expiresAt, updatedAt: new Date() })
    .where(and(eq(oauthTokens.provider, provider), eq(oauthTokens.email, email)));
}

/**
 * Delete OAuth token
 */
export async function deleteToken(
  provider: OAuthProvider,
  email: string
): Promise<void> {
  await db
    .delete(oauthTokens)
    .where(and(eq(oauthTokens.provider, provider), eq(oauthTokens.email, email)));
}
