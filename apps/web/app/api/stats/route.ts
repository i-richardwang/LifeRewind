import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, success } from '@/lib/api';
import { getStats } from '@/services/stats.service';

const querySchema = z.object({
  from: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  to: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const stats = await getStats({
    from: query.from,
    to: query.to,
  });

  return success(stats);
});
