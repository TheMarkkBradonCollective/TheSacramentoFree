import { sendWebPush, type PushSubscriptionKeys } from './vapid';
import { configureVapidAsync } from './webPushLoader';

async function getSavedSubscriptions(userId: string): Promise<PushSubscriptionKeys[]> {
  const { getSupabaseAdmin } = await import('./supabaseAdmin');
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from('push_subscriptions').select('*').eq('userId', userId);
  if (error || !data?.length) return [];
  return data.map((row) => ({
    endpoint: String((row as { endpoint: string }).endpoint),
    keys: {
      p256dh: String((row as { p256dh: string }).p256dh),
      auth: String((row as { auth: string }).auth),
    },
  }));
}

export async function runPushTest(params: {
  userId: string;
  subscription?: PushSubscriptionKeys | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!(await configureVapidAsync())) {
    return {
      status: 503,
      body: {
        error:
          'VAPID keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel, then redeploy.',
      },
    };
  }

  const payload = {
    title: 'Sacramento Buy Nothing',
    body: 'Push alerts are working on this device.',
    url: '/',
    tag: 'sbn-test-push',
    eventType: 'account_update',
    data: { test: 'true' },
  };

  const inline = params.subscription;
  const subscriptions: PushSubscriptionKeys[] =
    inline?.endpoint && inline.keys?.p256dh && inline.keys?.auth
      ? [inline]
      : await getSavedSubscriptions(params.userId);

  if (!subscriptions.length) {
    return {
      status: 400,
      body: {
        error: 'No push subscription found. Tap Enable notifications on this device, then try again.',
        subscriptionCount: 0,
      },
    };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendWebPush(sub, payload);
    if (result.ok) sent += 1;
    else {
      failed += 1;
      if (result.removed) {
        const { getSupabaseAdmin } = await import('./supabaseAdmin');
        const supabaseAdmin = await getSupabaseAdmin();
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  if (sent === 0) {
    return {
      status: 502,
      body: {
        error:
          'Push delivery failed. Turn notifications off and on again so the subscription matches your VAPID keys.',
        sent,
        failed,
        subscriptionCount: subscriptions.length,
      },
    };
  }

  return {
    status: 200,
    body: { ok: true, sent, failed, subscriptionCount: subscriptions.length },
  };
}
