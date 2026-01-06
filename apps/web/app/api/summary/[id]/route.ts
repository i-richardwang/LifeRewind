import { NextRequest } from 'next/server';
import { withErrorHandler, success } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { getSummary } from '@/services/summary.service';

export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      throw AppError.badRequest('Summary ID is required');
    }

    const summary = await getSummary(id);

    if (!summary) {
      throw AppError.notFound('Summary not found');
    }

    return success(summary);
  }
);
