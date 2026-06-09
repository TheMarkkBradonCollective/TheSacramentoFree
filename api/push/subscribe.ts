import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromBearer } from '../_lib/push/auth';
import { getSupabaseAdmin } from '../_lib/push/supabaseAdmin';
import { parseJsonBody } from '../_lib/parseBody';

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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({
      error:
        'Push subscriptions require SUPABASE_SERVICE_ROLE_KEY on the server. Add it in Vercel environment variables and redeploy.',
    });
  }

  try {
    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody<SubscribeBody>(req);
    const subscription = body.subscription;
    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    const supabaseAdmin = await getSupabaseAdmin();

    const { data: profile } = await supabaseAdmin.from('users').select('uid').eq('uid', user.id).maybeSingle();
    if (!profile) {
      return res.status(400).json({
        error:
          'Your community profile is not in the database yet. Save your profile once, then enable notifications again.',
      });
    }

    const row = {
      id: randomUUID(),
      userId: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 512) : null,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (error) {
      console.error('[api/push/subscribe]', error.code, error.message);
      if (error.code === '42P01' || error.message?.includes('push_subscriptions')) {
        return res.status(503).json({
          error: 'Push tables are missing in Supabase. Run supabase-sql/push-notifications.sql in the SQL editor.',
        });
      }
      return res.status(500).json({ error: error.message || 'Could not save subscription' });
    }

    await supabaseAdmin.from('notification_preferences').upsert(
      { userId: user.id, updatedAt: new Date().toISOString() },
      { onConflict: 'userId', ignoreDuplicates: true },
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/push/subscribe]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Could not save push subscription.',
    });
  }
}
