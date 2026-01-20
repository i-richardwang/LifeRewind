import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserEmail, OUTLOOK_SCOPES } from '@/lib/outlook';
import { encrypt } from '@/lib/crypto';
import { upsertToken } from '@/db/queries/tokens';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const settingsUrl = new URL('/settings', baseUrl);

  if (error) {
    console.error('Outlook OAuth error:', error, errorDescription);
    settingsUrl.searchParams.set('error', 'outlook_denied');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('error', 'outlook_no_code');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await getTokensFromCode(code);
    const email = await getUserEmail(tokens.accessToken);

    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    await upsertToken({
      provider: 'outlook',
      email,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokens.expiresAt,
      scope: OUTLOOK_SCOPES.join(' '),
    });

    settingsUrl.searchParams.set('success', 'outlook_connected');
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error('Outlook OAuth callback error:', error);
    settingsUrl.searchParams.set('error', 'outlook_failed');
    return NextResponse.redirect(settingsUrl);
  }
}
