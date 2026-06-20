import type { VercelRequest } from '@vercel/node';

export function parseJsonBody<T = Record<string, unknown>>(req: VercelRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    if (!req.body.trim()) return {} as T;
    try {
      return JSON.parse(req.body) as T;
    } catch {
      throw new Error('Invalid JSON body');
    }
  }
  return req.body as T;
}
