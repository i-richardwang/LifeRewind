import { NextResponse } from 'next/server';
import { getCalendarConnectionStatus } from '@/services/calendar.service';

export async function GET() {
  const status = await getCalendarConnectionStatus();
  return NextResponse.json(status);
}
