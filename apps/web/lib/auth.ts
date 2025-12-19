import { timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

export function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  const apiKey = process.env.LIFEREWIND_API_KEY;

  if (!apiKey) {
    console.error('LIFEREWIND_API_KEY is not configured');
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  if (token.length !== apiKey.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(token), Buffer.from(apiKey));
}
