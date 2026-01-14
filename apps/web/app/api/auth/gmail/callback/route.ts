import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, createOAuth2Client, getUserEmail, GMAIL_SCOPES } from '@/lib/gmail';
import { encrypt } from '@/lib/crypto';
import { upsertToken } from '@/db/queries/tokens';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const settingsUrl = new URL('/settings', baseUrl);

  // Handle OAuth errors
  if (error) {
    console.error('Gmail OAuth error:', error);
    settingsUrl.searchParams.set('error', 'gmail_denied');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('error', 'gmail_no_code');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens in response');
    }

    // Get user email
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const email = await getUserEmail(oauth2Client);

    // Calculate expiry time
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Encrypt and store tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    await upsertToken({
      provider: 'gmail',
      email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      scope: GMAIL_SCOPES.join(' '),
    });

    settingsUrl.searchParams.set('success', 'gmail_connected');
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    settingsUrl.searchParams.set('error', 'gmail_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
