export {
  GMAIL_SCOPES,
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  createAuthenticatedClient,
  getUserEmail,
} from './client';

export { fetchGmailMessages, type SyncOptions } from './sync';

export { transformGmailMessage } from './transform';
