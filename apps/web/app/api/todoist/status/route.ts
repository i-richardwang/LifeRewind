import { NextResponse } from 'next/server';
import { getTodoistConnectionStatus } from '@/services/todoist.service';

export async function GET() {
  try {
    const status = await getTodoistConnectionStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Todoist status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
