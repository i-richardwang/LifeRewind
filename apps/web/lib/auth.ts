import { NextRequest } from 'next/server';

export function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  const apiKey = process.env.COLLECTOR_API_KEY;

  if (!apiKey) {
    console.error('COLLECTOR_API_KEY is not configured');
    return false;
  }

  return token === apiKey;
}
