import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getUserFromBearer, getSupabaseAdmin, parseJsonBody } = await import('../../push-server.bundle.cjs');

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody<{ endpoint?: string }>(req);
    const supabaseAdmin = await getSupabaseAdmin();

    let query = supabaseAdmin.from('push_subscriptions').delete().eq('userId', user.id);
    if (body.endpoint) query = query.eq('endpoint', body.endpoint);

    const { error } = await query;
    if (error) {
      return res.status(500).json({ error: 'Could not remove subscription' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/push/unsubscribe]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Could not remove push subscription.',
    });
  }
}
