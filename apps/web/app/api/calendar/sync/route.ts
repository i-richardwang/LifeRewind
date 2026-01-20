import { NextResponse } from 'next/server';
import { syncCalendar } from '@/services/calendar.service';

export async function POST() {
  const result = await syncCalendar();
  return NextResponse.json(result);
}
