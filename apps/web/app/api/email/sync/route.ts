import { NextResponse } from 'next/server';
import { syncEmails } from '@/services/email.service';

export async function POST() {
  try {
    const result = await syncEmails();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes('not connected') ? 400 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailsImported: result.emailsImported,
    });
  } catch (error) {
    console.error('Email sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
