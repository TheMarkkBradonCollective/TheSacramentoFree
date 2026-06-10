import type { VercelRequest } from '@vercel/node';

export function parseJsonBody<T = Record<string, unknown>>(req: VercelRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}
