import type { VercelRequest, VercelResponse } from '@vercel/node';

type SubscribeBody = {
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
    const {
      getBearerToken,
      getUserFromBearer,
      getSupabaseForUser,
      parseJsonBody,
      claimPushSubscriptionForUser,
      ensureNotificationPreferencesOnSubscribe,
    } = await import('../../push-server.bundle.cjs');

    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody(req) as SubscribeBody;
    const subscription = body.subscription;
    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    const supabase = await getSupabaseForUser(token);

    const { data: profile } = await supabase.from('users').select('uid').eq('uid', user.id).maybeSingle();
    if (!profile) {
      return res.status(400).json({
        error:
          'Your community profile is not in the database yet. Save your profile once, then enable notifications again.',
      });
    }

    const claimed = await claimPushSubscriptionForUser(user.id, {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: typeof body.userAgent === 'string' ? body.userAgent : null,
    });
    if (!claimed.ok) {
      console.error('[api/push/subscribe]', claimed.error);
      if (claimed.error?.includes('push_subscriptions') || claimed.error?.includes('42P01')) {
        return res.status(503).json({
          error: 'Push tables are missing in Supabase. Run complete-schema.sql in the SQL editor.',
        });
      }
      return res.status(500).json({ error: claimed.error || 'Could not save subscription' });
    }

    await ensureNotificationPreferencesOnSubscribe(user.id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/push/subscribe]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Could not save push subscription.',
    });
  }
}
