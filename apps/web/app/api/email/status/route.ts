import { NextResponse } from 'next/server';
import { getEmailConnectionStatus } from '@/services/email.service';

export async function GET() {
  try {
    const status = await getEmailConnectionStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Email status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
