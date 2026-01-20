import { google, Auth } from 'googleapis';
import type { CollectedItemPayload } from '@/services/ingest.service';
import { transformGmailMessage } from './transform';

export interface SyncOptions {
  since?: Date;
  maxResults?: number;
}

/**
 * Fetch emails from Gmail API
 */
export async function fetchGmailMessages(
  oauth2Client: Auth.OAuth2Client,
  options: SyncOptions = {}
): Promise<CollectedItemPayload[]> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build query string
  const queryParts: string[] = [];
  if (options.since) {
    const timestamp = Math.floor(options.since.getTime() / 1000);
    queryParts.push(`after:${timestamp}`);
  }

  const query = queryParts.length > 0 ? queryParts.join(' ') : undefined;

  // List messages
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: options.maxResults || 100,
  });

  const messageIds = listResponse.data.messages || [];

  if (messageIds.length === 0) {
    return [];
  }

  // Fetch full message details in parallel (batch of 50 to avoid rate limits)
  const batchSize = 50;
  const messages: CollectedItemPayload[] = [];

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (msg) => {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
        });
        return transformGmailMessage(response.data);
      })
    );

    messages.push(...batchResults);
  }

  return messages;
}
