import { sendToSubscription } from './pushDelivery';
import { configureVapidAsync } from './webPushLoader';

export async function runPushTest(params: {
  userId: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
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
    title: 'Test notification',
    body: 'Sacramento Buy Nothing push alerts are working on this device.',
    url: '/',
    tag: `sbn-test-push-${Date.now()}`,
    eventType: 'account_update' as const,
    data: { test: 'true' },
  };

  const inline = params.subscription;
  let subscriptions: Array<{ id: string; userId: string; endpoint: string; p256dh: string; auth: string }> = [];

  if (inline?.endpoint && inline.keys?.p256dh && inline.keys?.auth) {
    subscriptions = [
      {
        id: 'inline',
        userId: params.userId,
        endpoint: inline.endpoint,
        p256dh: inline.keys.p256dh,
        auth: inline.keys.auth,
      },
    ];
  } else {
    const { getSupabaseAdmin } = await import('./supabaseAdmin');
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('userId', params.userId);
    if (error || !data?.length) {
      return {
        status: 400,
        body: {
          error: 'No push subscription found. Tap Enable notifications on this device, then try again.',
          subscriptionCount: 0,
        },
      };
    }
    subscriptions = data as typeof subscriptions;
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    const result = await sendToSubscription(sub, payload);
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
        error:
          'Push delivery failed. Turn notifications off and on again so the subscription matches your VAPID keys.',
        sent,
        failed,
        removed,
        subscriptionCount: subscriptions.length,
      },
    };
  }

  return {
    status: 200,
    body: { ok: true, sent, failed, removed, subscriptionCount: subscriptions.length },
  };
}
