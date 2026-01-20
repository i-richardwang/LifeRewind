import { NextResponse } from 'next/server';
import { syncExchangeCalendar } from '@/services/calendar.service';

export async function POST() {
  const result = await syncExchangeCalendar();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
