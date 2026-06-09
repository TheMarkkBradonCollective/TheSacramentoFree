import {
  configureVapid,
  getSubscriptionsForUsers,
  isVapidConfigured,
  sendToSubscription,
  type PushPayload,
} from './push.js';

configureVapid();

interface InlineSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function runPushTest(params: {
  userId: string;
  subscription?: InlineSubscription | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!isVapidConfigured()) {
    return {
      status: 503,
      body: {
        error:
          'VAPID keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel environment variables, then redeploy.',
      },
    };
  }

  const payload: PushPayload = {
    title: 'Test notification',
    body: 'Sacramento Buy Nothing push alerts are working on this device.',
    url: '/',
    tag: 'sbn-test-push',
    eventType: 'account_update',
    data: { test: 'true' },
  };

  const inline = params.subscription;
  const subscriptions =
    inline?.endpoint && inline.keys?.p256dh && inline.keys?.auth
      ? [
          {
            id: 'inline-test',
            userId: params.userId,
            endpoint: inline.endpoint,
            p256dh: inline.keys.p256dh,
            auth: inline.keys.auth,
          },
        ]
      : await getSubscriptionsForUsers([params.userId]);

  if (!subscriptions.length) {
    return {
      status: 400,
      body: {
        error:
          'No push subscription found. Tap Enable notifications on this device, then try again.',
        subscriptionCount: 0,
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
        error:
          'Push delivery failed. Confirm VAPID keys match the key used when you subscribed, then turn notifications off and on again.',
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
