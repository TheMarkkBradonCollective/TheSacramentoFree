import { isDirectorAccount } from './directorIdentity';
import { sendToSubscription } from './pushDelivery';
import { getSupabaseAdmin } from './supabaseAdmin';
import { configureVapidAsync } from './webPushLoader';

const DEFAULT_BROADCAST_TITLE = 'The Website/App!';
const DEFAULT_BROADCAST_BODY = 'This is a test notification!';

export async function runDirectorBroadcastTest(
  callerId: string,
  message?: { title?: string; body?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!(await configureVapidAsync())) {
    return {
      status: 503,
      body: {
        error:
          'VAPID keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel, then redeploy.',
      },
    };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('role, email')
    .eq('uid', callerId)
    .maybeSingle();

  if (!isDirectorAccount(callerId, (caller as { role?: string } | null)?.role, (caller as { email?: string } | null)?.email)) {
    return { status: 403, body: { error: 'Director access required' } };
  }

  const { data: subscriptions, error } = await supabaseAdmin.from('push_subscriptions').select('*');
  if (error) {
    return { status: 500, body: { error: error.message || 'Could not load push subscriptions' } };
  }

  const rows = subscriptions || [];
  if (!rows.length) {
    return {
      status: 400,
      body: { error: 'No push subscriptions found. Neighbors must enable notifications first.', sent: 0 },
    };
  }

  const title = String(message?.title || '').trim() || DEFAULT_BROADCAST_TITLE;
  const body = String(message?.body || '').trim() || DEFAULT_BROADCAST_BODY;

  const payload = {
    title: title.slice(0, 120),
    body: body.slice(0, 240),
    url: '/',
    tag: `sbn-director-broadcast-${Date.now()}`,
    eventType: 'account_update' as const,
    data: { test: 'director_broadcast' },
  };

  const uniqueUsers = new Set(rows.map((row) => String((row as { userId?: string }).userId || '')));
  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const sub of rows) {
    const result = await sendToSubscription(sub as Parameters<typeof sendToSubscription>[0], payload);
    if (result.ok) sent += 1;
    else {
      failed += 1;
      if (result.removed) removed += 1;
    }
  }

  if (sent === 0) {
    return {
      status: 502,
      body: {
        error: 'Broadcast reached zero devices. Check VAPID keys and subscription health.',
        sent,
        failed,
        removed,
        subscriptionCount: rows.length,
        userCount: uniqueUsers.size,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      sent,
      failed,
      removed,
      subscriptionCount: rows.length,
      userCount: uniqueUsers.size,
    },
  };
}
