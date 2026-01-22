import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCode, TODOIST_SCOPES } from '@/lib/todoist';
import { encrypt } from '@/lib/crypto';
import { upsertToken } from '@/db/queries/tokens';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const settingsUrl = new URL('/settings', baseUrl);

  if (error) {
    console.error('Todoist OAuth error:', error);
    settingsUrl.searchParams.set('error', 'todoist_denied');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('error', 'todoist_no_code');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const accessToken = await getTokenFromCode(code);

    const encryptedAccessToken = encrypt(accessToken);
    // Todoist tokens don't expire, so we set a far future date
    const expiresAt = new Date('2099-12-31T23:59:59Z');

    await upsertToken({
      provider: 'todoist',
      email: 'todoist-user', // Todoist doesn't return user email in token exchange
      accessToken: encryptedAccessToken,
      refreshToken: encryptedAccessToken, // No refresh token, use access token
      expiresAt,
      scope: TODOIST_SCOPES,
    });

    settingsUrl.searchParams.set('success', 'todoist_connected');
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error('Todoist OAuth callback error:', error);
    settingsUrl.searchParams.set('error', 'todoist_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
