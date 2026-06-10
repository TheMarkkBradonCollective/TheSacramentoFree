import type { VercelRequest, VercelResponse } from '@vercel/node';

type ResubscribeBody = {
  oldEndpoint?: string;
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
    const { getServiceRoleKey, parseJsonBody, runPushResubscribe } = await import(
      '../../push-server.bundle.cjs'
    );

    if (!getServiceRoleKey()) {
      return res.status(503).json({
        error: 'Push resubscribe requires SUPABASE_SERVICE_ROLE_KEY on the server.',
      });
    }

    const body = parseJsonBody<ResubscribeBody>(req);
    const result = await runPushResubscribe({
      oldEndpoint: body.oldEndpoint,
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
