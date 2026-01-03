import { NextRequest } from 'next/server';
import { z } from 'zod';
import { startOfMonth, endOfMonth } from 'date-fns';
import { withErrorHandler, success } from '@/lib/api';
import { getDatesWithData } from '@/db/queries/items';

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .transform((val) => {
      const parts = val.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      return new Date(year, month - 1, 1);
    }),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const { month } = querySchema.parse({
    month: searchParams.get('month'),
  });

  const dates = await getDatesWithData({
    from: startOfMonth(month),
    to: endOfMonth(month),
  });

  // Return dates as ISO strings for JSON serialization
  return success({
    dates: dates.map((d) => d.toISOString().split('T')[0]),
  });
});
