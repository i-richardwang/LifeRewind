import { google, Auth } from 'googleapis';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getClientConfig() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Create a new OAuth2 client
 */
export function createOAuth2Client(): Auth.OAuth2Client {
  const { clientId, clientSecret, redirectUri } = getClientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // Force consent to always get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create an authenticated OAuth2 client with existing tokens
 */
export function createAuthenticatedClient(
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Auth.OAuth2Client {
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiresAt.getTime(),
  });

  return oauth2Client;
}

/**
 * Get user email from OAuth2 client
 */
export async function getUserEmail(oauth2Client: Auth.OAuth2Client): Promise<string> {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    throw new Error('Could not get user email');
  }

  return data.email;
}
