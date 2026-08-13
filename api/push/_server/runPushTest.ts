import { isFcmConfigured, isFcmSubscription } from './fcmDelivery';
import { sendToSubscription } from './pushDelivery';
import { configureVapidAsync } from './webPushLoader';

function deliveryFailureMessage(subscriptions: Array<{ endpoint: string }>): string {
  const fcmSubs = subscriptions.filter((sub) => isFcmSubscription(sub.endpoint));
  const webSubs = subscriptions.filter((sub) => !isFcmSubscription(sub.endpoint));

  if (fcmSubs.length > 0 && !isFcmConfigured()) {
    return 'Firebase is not configured on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel, then redeploy.';
  }

  if (fcmSubs.length > 0 && webSubs.length === 0) {
    return 'FCM delivery failed. In Vercel, confirm FIREBASE_SERVICE_ACCOUNT_JSON is the full service-account JSON from Firebase. Then turn alerts off and on on this device.';
  }

  if (webSubs.length > 0) {
    return 'Push delivery failed. Turn notifications off and on again so the subscription matches your VAPID keys.';
  }

  return 'Push delivery failed. Turn notifications off and on again, then retry.';
}

export async function runPushTest(params: {
  userId: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const payload = {
    title: 'SacramentoBuyNothing',
    body: 'This is a test notification!',
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

  const needsVapid = subscriptions.some((sub) => !isFcmSubscription(sub.endpoint));
  const needsFcm = subscriptions.some((sub) => isFcmSubscription(sub.endpoint));

  if (needsVapid && !(await configureVapidAsync())) {
    return {
      status: 503,
      body: {
        error:
          'VAPID keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel, then redeploy.',
      },
    };
  }

  if (needsFcm && !isFcmConfigured()) {
    return {
      status: 503,
      body: {
        error:
          'Firebase is not configured on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel, then redeploy.',
      },
    };
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
        error: deliveryFailureMessage(subscriptions),
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
