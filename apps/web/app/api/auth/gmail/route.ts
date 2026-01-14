import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/gmail';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Failed to generate Gmail auth URL:', error);
    return NextResponse.redirect(
      new URL('/settings?error=gmail_config', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
