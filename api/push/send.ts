import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getUserFromBearer, runPushSend, parseJsonBody } = await import('../../push-server.bundle.cjs');

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody(req);
    const result = await runPushSend(user.id, body, { trusted: false });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/push/send]', err);
    return res.status(500).json({
      error: 'Push send failed on the server.',
    });
  }
}
