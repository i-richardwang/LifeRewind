import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, success } from '@/lib/api';
import { listItems } from '@/services/items.service';
import type { SourceType } from '@/db/schema';

const querySchema = z.object({
  source: z
    .string()
    .optional()
    .transform((val) => (val ? (val.split(',') as SourceType[]) : undefined)),
  from: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  to: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 0)),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const result = await listItems({
    sources: query.source,
    from: query.from,
    to: query.to,
    limit: query.limit,
    offset: query.offset,
  });

  return success(result);
});
