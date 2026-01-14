import type { gmail_v1 } from 'googleapis';
import type { EmailAddress } from '@/db/schema';
import type { CollectedItemPayload } from '@/services/ingest.service';

/**
 * Parse email address string like "John Doe <john@example.com>" or "john@example.com"
 */
function parseEmailAddress(raw: string): EmailAddress {
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  if (match && match[2]) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2].trim(),
    };
  }
  return { email: raw.trim() };
}

/**
 * Parse comma-separated email addresses
 */
function parseEmailAddresses(raw: string | undefined): EmailAddress[] {
  if (!raw) return [];
  // Split by comma, but not commas inside quotes
  const addresses = raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  return addresses.map((addr) => parseEmailAddress(addr.trim())).filter((a) => a.email);
}

/**
 * Get header value from Gmail message
 */
function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || undefined;
}

/**
 * Count attachments in message parts
 */
function countAttachments(parts: gmail_v1.Schema$MessagePart[] | undefined): number {
  if (!parts) return 0;

  let count = 0;
  for (const part of parts) {
    if (part.filename && part.filename.length > 0) {
      count++;
    }
    if (part.parts) {
      count += countAttachments(part.parts);
    }
  }
  return count;
}

/**
 * Transform Gmail API message to CollectedItemPayload
 */
export function transformGmailMessage(message: gmail_v1.Schema$Message): CollectedItemPayload {
  const headers = message.payload?.headers;
  const labels = message.labelIds || [];

  const fromRaw = getHeader(headers, 'From') || '';
  const toRaw = getHeader(headers, 'To') || '';
  const ccRaw = getHeader(headers, 'Cc');
  const subject = getHeader(headers, 'Subject') || '(No Subject)';
  const dateRaw = getHeader(headers, 'Date');

  const from = parseEmailAddress(fromRaw);
  const to = parseEmailAddresses(toRaw);
  const cc = ccRaw ? parseEmailAddresses(ccRaw) : undefined;

  const attachmentCount = countAttachments(message.payload?.parts);
  const hasAttachments = attachmentCount > 0;

  const isRead = !labels.includes('UNREAD');
  const isStarred = labels.includes('STARRED');

  // Parse date or use internalDate
  let timestamp: string;
  if (dateRaw) {
    timestamp = new Date(dateRaw).toISOString();
  } else if (message.internalDate) {
    timestamp = new Date(parseInt(message.internalDate, 10)).toISOString();
  } else {
    timestamp = new Date().toISOString();
  }

  return {
    sourceType: 'email',
    timestamp,
    data: {
      provider: 'gmail',
      messageId: message.id!,
      threadId: message.threadId!,
      labels,
      from,
      to,
      cc,
      subject,
      snippet: message.snippet || '',
      hasAttachments,
      attachmentCount: hasAttachments ? attachmentCount : undefined,
      isRead,
      isStarred,
    },
  };
}
