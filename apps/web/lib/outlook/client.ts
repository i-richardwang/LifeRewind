import { Client } from '@microsoft/microsoft-graph-client';

export const OUTLOOK_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'Calendars.Read',
  'User.Read',
];

const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

function getClientConfig() {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Outlook OAuth credentials not configured');
  }

  return { clientId, clientSecret, redirectUri };
}

export interface OutlookTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(): string {
  const { clientId, redirectUri } = getClientConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: OUTLOOK_SCOPES.join(' '),
    response_mode: 'query',
    prompt: 'consent',
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<OutlookTokens> {
  const { clientId, clientSecret, redirectUri } = getClientConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OutlookTokens> {
  const { clientId, clientSecret } = getClientConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Create Microsoft Graph client with access token
 */
export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Get user email from Graph API
 */
export async function getUserEmail(accessToken: string): Promise<string> {
  const client = createGraphClient(accessToken);
  const user = await client.api('/me').select('mail,userPrincipalName').get();

  const email = user.mail || user.userPrincipalName;
  if (!email) {
    throw new Error('Could not get user email');
  }

  return email;
}
