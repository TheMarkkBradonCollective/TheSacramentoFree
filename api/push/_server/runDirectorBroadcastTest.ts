import { isDirectorAccount } from './directorIdentity';
import { isFcmConfigured } from './fcmDelivery';
import { sendPushToUsers } from './pushDelivery';
import { getSupabaseAdmin } from './supabaseAdmin';
import { configureVapidAsync } from './webPushLoader';

const DEFAULT_BROADCAST_TITLE = 'SacramentoBuyNothing';
const DEFAULT_BROADCAST_BODY = 'This is a test notification!';

export async function runDirectorBroadcastTest(
  callerId: string,
  message?: { title?: string; body?: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!(await configureVapidAsync()) && !isFcmConfigured()) {
    return {
      status: 503,
      body: {
        error:
          'Push delivery is not configured. Set VAPID keys or FIREBASE_SERVICE_ACCOUNT_JSON on the server, then redeploy.',
      },
    };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('role, email')
    .eq('uid', callerId)
    .maybeSingle();

  if (!isDirectorAccount(callerId, (caller as { role?: string } | null)?.role)) {
    return { status: 403, body: { error: 'Director access required' } };
  }

  const { data: subscriptions, error } = await supabaseAdmin.from('push_subscriptions').select('userId');
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
  const tag = `sbn-director-broadcast-${Date.now()}`;

  const recipientUserIds = [
    ...new Set(
      rows
        .map((row) => String((row as { userId?: string }).userId || ''))
        .filter((uid) => uid && uid !== callerId),
    ),
  ];

  if (!recipientUserIds.length) {
    return {
      status: 400,
      body: { error: 'No subscribed neighbors found (excluding director).', sent: 0 },
    };
  }

  const result = await sendPushToUsers(
    recipientUserIds,
    {
      title: title.slice(0, 120),
      body: body.slice(0, 240),
      url: '/map',
      tag,
      eventType: 'account_update',
      data: { systemBroadcast: 'director_broadcast' },
    },
    {
      skipPreferenceCheck: true,
      skipDedup: true,
      source: 'internal',
      actorId: callerId,
    },
  );

  if (result.sent === 0 && result.inboxWritten === 0) {
    return {
      status: 502,
      body: {
        error: 'Broadcast reached zero devices. Check push credentials and subscription health.',
        ...result,
        subscriptionCount: rows.length,
        userCount: recipientUserIds.length,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      ...result,
      subscriptionCount: result.subscriptionCount ?? rows.length,
      userCount: recipientUserIds.length,
    },
  };
}
