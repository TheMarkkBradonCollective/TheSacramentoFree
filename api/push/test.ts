import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromBearer } from './_server/auth';
import { runPushTest } from './_server/runPushTest';
import { parseJsonBody } from './_server/parseBody';

type TestBody = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
};

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

    const body = parseJsonBody<TestBody>(req);
    const sub = body.subscription;
    const result = await runPushTest({
      userId: user.id,
      subscription:
        sub?.endpoint && sub.keys?.p256dh && sub.keys?.auth
          ? { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }
          : null,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/push/test]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Push test failed on the server.',
    });
  }
}
