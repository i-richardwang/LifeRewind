import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/outlook';

export async function GET() {
  try {
    const authUrl = await getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Failed to generate Outlook auth URL:', error);
    return NextResponse.redirect(
      new URL('/settings?error=outlook_config', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
