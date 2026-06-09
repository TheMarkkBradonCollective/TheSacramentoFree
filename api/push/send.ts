import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runPushSend } from '../../server/pushSend';
import { getUserFromBearer } from '../../server/vercelAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await runPushSend(user.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/push/send]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Push send failed on the server.',
    });
  }
}
