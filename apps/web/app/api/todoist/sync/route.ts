import { NextResponse } from 'next/server';
import { syncTodoist } from '@/services/todoist.service';

export async function POST() {
  try {
    const result = await syncTodoist();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes('not connected') ? 400 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tasksImported: result.tasksImported,
    });
  } catch (error) {
    console.error('Todoist sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
