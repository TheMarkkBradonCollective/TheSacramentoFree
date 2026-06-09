import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const key = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '';
  if (!key) {
    return res.status(503).json({ error: 'Push notifications are not configured' });
  }
  return res.status(200).json({ publicKey: key });
}
