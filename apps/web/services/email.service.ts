import { createAuthenticatedClient, createOAuth2Client, fetchGmailMessages } from '@/lib/gmail';
import { decrypt, encrypt } from '@/lib/crypto';
import {
  findTokenByProvider,
  updateLastSyncAt,
  updateTokens,
} from '@/db/queries/tokens';
import { ingestItems } from './ingest.service';
import type { OAuthToken } from '@/db/schema';

export interface EmailSyncResult {
  success: boolean;
  emailsImported: number;
  error?: string;
}

export interface EmailConnectionStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: Date;
  emailCount?: number;
}

/**
 * Refresh access token if expired
 */
async function refreshTokenIfNeeded(token: OAuthToken): Promise<{
  accessToken: string;
  expiresAt: Date;
  wasRefreshed: boolean;
}> {
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  // Check if token is still valid
  if (token.expiresAt.getTime() > now.getTime() + bufferMs) {
    return {
      accessToken: decrypt(token.accessToken),
      expiresAt: token.expiresAt,
      wasRefreshed: false,
    };
  }

  // Refresh the token
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: decrypt(token.refreshToken),
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  const newExpiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  // Update stored token
  const encryptedAccessToken = encrypt(credentials.access_token);
  await updateTokens(token.provider, token.email, encryptedAccessToken, newExpiresAt);

  return {
    accessToken: credentials.access_token,
    expiresAt: newExpiresAt,
    wasRefreshed: true,
  };
}

/**
 * Sync emails from Gmail
 */
export async function syncEmails(): Promise<EmailSyncResult> {
  try {
    // Find Gmail token
    const token = await findTokenByProvider('gmail');

    if (!token) {
      return {
        success: false,
        emailsImported: 0,
        error: 'Gmail not connected',
      };
    }

    // Refresh token if needed
    const { accessToken, expiresAt } = await refreshTokenIfNeeded(token);

    // Create authenticated client
    const oauth2Client = createAuthenticatedClient(
      accessToken,
      decrypt(token.refreshToken),
      expiresAt
    );

    // Fetch emails (incremental sync if we have lastSyncAt)
    const syncOptions = token.lastSyncAt
      ? { after: token.lastSyncAt, maxResults: 100 }
      : { maxResults: 100 };

    const messages = await fetchGmailMessages(oauth2Client, syncOptions);

    if (messages.length === 0) {
      // Update lastSyncAt even if no new messages
      await updateLastSyncAt('gmail', token.email);

      return {
        success: true,
        emailsImported: 0,
      };
    }

    // Ingest emails
    const result = await ingestItems({
      deviceId: 'gmail',
      deviceName: token.email,
      sourceType: 'email',
      collectedAt: new Date(),
      items: messages,
    });

    // Update lastSyncAt
    await updateLastSyncAt('gmail', token.email);

    return {
      success: true,
      emailsImported: result.itemsInserted,
    };
  } catch (error) {
    console.error('Email sync error:', error);

    // Check if it's an auth error
    const isAuthError =
      error instanceof Error &&
      (error.message.includes('invalid_grant') ||
        error.message.includes('Token has been expired or revoked'));

    return {
      success: false,
      emailsImported: 0,
      error: isAuthError
        ? 'Gmail authorization expired. Please reconnect.'
        : 'Failed to sync emails',
    };
  }
}

/**
 * Get Gmail connection status
 */
export async function getEmailConnectionStatus(): Promise<EmailConnectionStatus> {
  const token = await findTokenByProvider('gmail');

  if (!token) {
    return { connected: false };
  }

  return {
    connected: true,
    email: token.email,
    lastSyncAt: token.lastSyncAt || undefined,
  };
}
