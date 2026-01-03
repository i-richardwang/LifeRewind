import {
  findItems,
  countItems,
  type FindItemsOptions,
} from '@/db/queries/items';
import type { SourceType } from '@/db/schema';

export interface ListItemsParams {
  sources?: SourceType[];
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ListItemsResult {
  items: Awaited<ReturnType<typeof findItems>>;
  total: number;
  limit: number;
  offset: number;
}

/**
 * List collected items with pagination
 */
export async function listItems(params: ListItemsParams): Promise<ListItemsResult> {
  const { sources, from, to, limit = 100, offset = 0 } = params;

  const options: FindItemsOptions = {
    sources,
    from,
    to,
    limit: Math.min(limit, 1000),
    offset,
  };

  const [items, total] = await Promise.all([
    findItems(options),
    countItems({ sources, from, to }),
  ]);

  return {
    items,
    total,
    limit: options.limit!,
    offset,
  };
}
