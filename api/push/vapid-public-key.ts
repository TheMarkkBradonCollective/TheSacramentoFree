import type { VercelRequest, VercelResponse } from '@vercel/node';
import { configureVapid, getVapidPublicKey } from '../../server/push';

configureVapid();

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: 'Push notifications are not configured' });
  }
  return res.status(200).json({ publicKey: key });
}
