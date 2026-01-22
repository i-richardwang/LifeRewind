import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/todoist';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Failed to generate Todoist auth URL:', error);
    return NextResponse.redirect(
      new URL('/settings?error=todoist_config', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
