import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, success } from '@/lib/api';
import { listSummaries, generateSummary } from '@/services/summary.service';
import type { SummaryPeriod } from '@/db/schema';

const generateSchema = z.object({
  period: z.enum(['week', 'month']).default('week'),
  date: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { period, date } = generateSchema.parse(body);

  const summary = await generateSummary({ period, date });

  return success(summary);
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') as SummaryPeriod | null;
  const limit = Math.min(Number(searchParams.get('limit')) || 10, 50);

  const summaries = await listSummaries({
    period: period ?? undefined,
    limit,
  });

  return success(summaries);
});
