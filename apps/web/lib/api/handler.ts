import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError } from './errors';
import { error } from './response';

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with unified error handling
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error('[API Error]', err);

      if (err instanceof z.ZodError) {
        return error('Validation failed', 400, err.issues);
      }

      if (err instanceof AppError) {
        return error(err.message, err.status);
      }

      if (err instanceof Error) {
        return error(err.message, 500);
      }

      return error('Internal server error', 500);
    }
  };
}
