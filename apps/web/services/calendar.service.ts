import { createGraphClient, refreshAccessToken } from '@/lib/outlook';
import { fetchCalendarEvents } from '@/lib/outlook/sync';
import { createExchangeService, fetchExchangeCalendarEvents } from '@/lib/exchange';
import { decrypt, encrypt } from '@/lib/crypto';
import { findTokenByProvider, updateLastSyncAt, updateTokens } from '@/db/queries/tokens';
import { ingestItems } from './ingest.service';
import type { OAuthToken } from '@/db/schema';

export interface CalendarSyncResult {
  success: boolean;
  eventsImported: number;
  error?: string;
}

export interface CalendarConnectionStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: Date;
}

// ============================================
// Outlook (Microsoft 365) Calendar
// ============================================

async function refreshOutlookTokenIfNeeded(token: OAuthToken): Promise<{
  accessToken: string;
  wasRefreshed: boolean;
}> {
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (token.expiresAt.getTime() > now.getTime() + bufferMs) {
    return {
      accessToken: decrypt(token.accessToken),
      wasRefreshed: false,
    };
  }

  const refreshToken = decrypt(token.refreshToken);
  const newTokens = await refreshAccessToken(refreshToken);

  const encryptedAccessToken = encrypt(newTokens.accessToken);
  const encryptedRefreshToken = encrypt(newTokens.refreshToken);

  await updateTokens(
    token.provider,
    token.email,
    encryptedAccessToken,
    newTokens.expiresAt,
    encryptedRefreshToken
  );

  return {
    accessToken: newTokens.accessToken,
    wasRefreshed: true,
  };
}

export async function syncOutlookCalendar(): Promise<CalendarSyncResult> {
  try {
    const token = await findTokenByProvider('outlook');

    if (!token) {
      return { success: false, eventsImported: 0, error: 'Outlook not connected' };
    }

    const { accessToken } = await refreshOutlookTokenIfNeeded(token);
    const graphClient = createGraphClient(accessToken);

    const events = await fetchCalendarEvents(graphClient, {
      since: token.lastSyncAt || undefined,
    });

    if (events.length === 0) {
      await updateLastSyncAt('outlook', token.email);
      return { success: true, eventsImported: 0 };
    }

    const result = await ingestItems({
      deviceId: 'outlook',
      deviceName: token.email,
      sourceType: 'calendar',
      collectedAt: new Date(),
      items: events,
    });

    await updateLastSyncAt('outlook', token.email);

    return { success: true, eventsImported: result.itemsInserted };
  } catch (error) {
    console.error('Outlook calendar sync error:', error);

    const isAuthError =
      error instanceof Error &&
      (error.message.includes('invalid_grant') ||
        error.message.includes('AADSTS'));

    return {
      success: false,
      eventsImported: 0,
      error: isAuthError
        ? 'Outlook authorization expired. Please reconnect.'
        : 'Failed to sync Outlook calendar',
    };
  }
}

export async function getOutlookConnectionStatus(): Promise<CalendarConnectionStatus> {
  const token = await findTokenByProvider('outlook');

  if (!token) {
    return { connected: false };
  }

  return {
    connected: true,
    email: token.email,
    lastSyncAt: token.lastSyncAt || undefined,
  };
}

// ============================================
// Exchange (On-Premises) Calendar
// ============================================

function parseExchangeCredentials(token: OAuthToken): {
  email: string;
  username: string;
  password: string;
  ewsUrl: string;
} {
  // For Exchange, we store:
  // - accessToken: encrypted password
  // - refreshToken: encrypted EWS URL
  // - scope: "username:xxx"
  const password = decrypt(token.accessToken);
  const ewsUrl = decrypt(token.refreshToken);
  const username = token.scope.replace('username:', '');

  return {
    email: token.email,
    username,
    password,
    ewsUrl,
  };
}

export async function syncExchangeCalendar(): Promise<CalendarSyncResult> {
  try {
    const token = await findTokenByProvider('exchange');

    if (!token) {
      return { success: false, eventsImported: 0, error: 'Exchange not connected' };
    }

    const creds = parseExchangeCredentials(token);
    const service = createExchangeService(creds);

    const events = await fetchExchangeCalendarEvents(service, {
      since: token.lastSyncAt || undefined,
    });

    if (events.length === 0) {
      await updateLastSyncAt('exchange', token.email);
      return { success: true, eventsImported: 0 };
    }

    const result = await ingestItems({
      deviceId: 'exchange',
      deviceName: token.email,
      sourceType: 'calendar',
      collectedAt: new Date(),
      items: events,
    });

    await updateLastSyncAt('exchange', token.email);

    return { success: true, eventsImported: result.itemsInserted };
  } catch (error) {
    console.error('Exchange calendar sync error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    const isAuthError =
      message.includes('401') ||
      message.includes('Unauthorized') ||
      message.includes('invalid');

    return {
      success: false,
      eventsImported: 0,
      error: isAuthError
        ? 'Exchange credentials invalid. Please reconnect.'
        : 'Failed to sync Exchange calendar',
    };
  }
}

export async function getExchangeConnectionStatus(): Promise<CalendarConnectionStatus> {
  const token = await findTokenByProvider('exchange');

  if (!token) {
    return { connected: false };
  }

  return {
    connected: true,
    email: token.email,
    lastSyncAt: token.lastSyncAt || undefined,
  };
}

// ============================================
// Unified Calendar Functions (for backward compatibility)
// ============================================

export async function syncCalendar(): Promise<CalendarSyncResult> {
  // Try Outlook first, then Exchange
  const outlookToken = await findTokenByProvider('outlook');
  if (outlookToken) {
    return syncOutlookCalendar();
  }

  const exchangeToken = await findTokenByProvider('exchange');
  if (exchangeToken) {
    return syncExchangeCalendar();
  }

  return { success: false, eventsImported: 0, error: 'No calendar connected' };
}

export async function getCalendarConnectionStatus(): Promise<CalendarConnectionStatus> {
  // Check Outlook first, then Exchange
  const outlookStatus = await getOutlookConnectionStatus();
  if (outlookStatus.connected) {
    return outlookStatus;
  }

  return getExchangeConnectionStatus();
}
