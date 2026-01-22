import crypto from 'crypto';

export const TODOIST_SCOPES = 'data:read';

function getClientConfig() {
  const clientId = process.env.TODOIST_CLIENT_ID;
  const clientSecret = process.env.TODOIST_CLIENT_SECRET;
  const redirectUri = process.env.TODOIST_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Todoist OAuth credentials not configured');
  }

  return { clientId, clientSecret, redirectUri };
}

export function getAuthUrl(): string {
  const { clientId } = getClientConfig();
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    scope: TODOIST_SCOPES,
    state,
  });

  return `https://api.todoist.com/oauth/authorize?${params.toString()}`;
}

export async function getTokenFromCode(code: string): Promise<string> {
  const { clientId, clientSecret } = getClientConfig();

  const response = await fetch('https://api.todoist.com/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange token: ${error}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('No access token in response');
  }

  return data.access_token;
}
