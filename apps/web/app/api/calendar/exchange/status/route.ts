import { NextResponse } from 'next/server';
import { getExchangeConnectionStatus } from '@/services/calendar.service';

export async function GET() {
  const status = await getExchangeConnectionStatus();
  return NextResponse.json(status);
}
