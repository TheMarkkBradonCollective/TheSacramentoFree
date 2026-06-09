import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromBearer } from '../_lib/push/auth';
import { runPushTest } from '../_lib/push/runPushTest';
import { parseJsonBody } from '../_lib/parseBody';

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

    const body = parseJsonBody<{ subscription?: { endpoint: string; keys: { p256dh: string; auth: string } } }>(
      req,
    );
    const result = await runPushTest({ userId: user.id, subscription: body.subscription });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/push/test]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Push test failed on the server.',
    });
  }
}
