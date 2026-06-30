import type { VercelRequest, VercelResponse } from '@vercel/node';

type BroadcastBody = {
  confirm?: boolean;
  title?: string;
  body?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getUserFromBearer, parseJsonBody, runDirectorBroadcastTest } = await import(
      '../../push-server.bundle.cjs'
    );

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody(req) as BroadcastBody;
    if (!body.confirm) {
      return res.status(400).json({ error: 'confirm: true is required for broadcast test' });
    }

    const result = await runDirectorBroadcastTest(user.id, {
      title: body.title,
      body: body.body,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/push/test-broadcast]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Director broadcast test failed.',
    });
  }
}
