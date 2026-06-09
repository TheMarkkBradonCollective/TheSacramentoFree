import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromBearer } from '../../server/vercelAuth';
import { runPushTest } from '../../server/pushTest';

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

    const subscription = req.body?.subscription;
    const result = await runPushTest({ userId: user.id, subscription });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/push/test]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Push test failed on the server.',
    });
  }
}
