import type { VercelRequest, VercelResponse } from '@vercel/node';

type ResubscribeBody = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  userAgent?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getBearerToken, getUserFromBearer, parseJsonBody, runPushResubscribe } = await import(
      '../../push-server.bundle.cjs'
    );

    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody(req) as ResubscribeBody;
    const result = await runPushResubscribe({
      userId: user.id,
      subscription: body.subscription || {},
      userAgent: body.userAgent,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/push/resubscribe]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Could not refresh push subscription.',
    });
  }
}
