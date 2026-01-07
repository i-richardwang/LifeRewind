import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, success } from '@/lib/api';
import { getMissingPeriods, createBatchSummaryTasks } from '@/services/summary.service';

const batchSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { year, month } = batchSchema.parse(body);

  const missingPeriods = await getMissingPeriods(year, month);

  if (missingPeriods.length === 0) {
    return success({ created: 0, summaries: [] });
  }

  const summaries = await createBatchSummaryTasks(missingPeriods);

  return success({ created: summaries.length, summaries });
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '', 10);
  const month = parseInt(searchParams.get('month') || '', 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return success({ count: 0, periods: [] });
  }

  const periods = await getMissingPeriods(year, month);

  return success({
    count: periods.length,
    periods: periods.map((p) => ({
      period: p.period,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
    })),
  });
});
