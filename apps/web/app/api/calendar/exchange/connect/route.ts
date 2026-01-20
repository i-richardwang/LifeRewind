import { NextRequest, NextResponse } from 'next/server';
import { testExchangeConnection } from '@/lib/exchange';
import { encrypt } from '@/lib/crypto';
import { upsertToken, deleteToken } from '@/db/queries/tokens';

interface ConnectRequest {
  email: string;
  username: string;
  password: string;
  ewsUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConnectRequest = await request.json();
    const { email, username, password, ewsUrl } = body;

    console.log('[Exchange Connect] Received request:', { email, username, ewsUrl });

    // Validate required fields
    if (!email || !username || !password || !ewsUrl) {
      console.log('[Exchange Connect] Validation failed: missing fields');
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Test connection first
    console.log('[Exchange Connect] Testing connection...');
    const testResult = await testExchangeConnection({
      email,
      username,
      password,
      ewsUrl,
    });

    console.log('[Exchange Connect] Test result:', testResult);

    if (!testResult.success) {
      return NextResponse.json(
        { success: false, error: testResult.error },
        { status: 400 }
      );
    }

    // Encrypt credentials for storage
    // For Exchange, we store:
    // - accessToken: encrypted password
    // - refreshToken: EWS URL (also encrypted for consistency)
    // - expiresAt: far future date (credentials don't expire)
    const encryptedPassword = encrypt(password);
    const encryptedEwsUrl = encrypt(ewsUrl);

    // Store in database
    await upsertToken({
      provider: 'exchange',
      email,
      accessToken: encryptedPassword,
      refreshToken: encryptedEwsUrl,
      expiresAt: new Date('2099-12-31'), // No expiration for credentials
      scope: `username:${username}`, // Store username in scope field
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exchange connect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to Exchange' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    await deleteToken('exchange', email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exchange disconnect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
