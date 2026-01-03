import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Create a successful JSON response
 */
export function success<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error JSON response
 */
export function error(
  message: string,
  status = 500,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  const body: ApiResponse<never> = { success: false, error: message };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Create a 201 Created response
 */
export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return success(data, 201);
}
