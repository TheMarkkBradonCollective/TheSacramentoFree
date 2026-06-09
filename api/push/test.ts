import type { VercelRequest, VercelResponse } from '@vercel/node';

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

function parseBody(body: unknown): { subscription?: PushSubscriptionBody | null } {
  if (!body) return {};
  const value =
    typeof body === 'string'
      ? (() => {
          try {
            return JSON.parse(body) as unknown;
          } catch {
            return {};
          }
        })()
      : body;
  return (value || {}) as { subscription?: PushSubscriptionBody | null };
}

async function getUserFromBearer(
  authHeader?: string | string[],
): Promise<{ id: string } | null> {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!token) return null;

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const apiKey =
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  if (!url || !apiKey) return null;

  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: apiKey,
    },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { id?: string };
  return json.id ? { id: json.id } : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseBody(req.body);
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return res.status(400).json({
        error: 'No push subscription found. Tap Enable notifications on this device, then try again.',
        subscriptionCount: 0,
      });
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '';
    const privateKey = process.env.VAPID_PRIVATE_KEY || '';
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@sacbuynothing.org';
    if (!publicKey || !privateKey) {
      return res.status(503).json({
        error:
          'VAPID keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel, then redeploy.',
      });
    }

    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const notification = JSON.stringify({
      title: 'Test notification',
      body: 'Sacramento Buy Nothing push alerts are working on this device.',
      url: '/',
      tag: 'sbn-test-push',
      eventType: 'account_update',
      data: { test: 'true' },
    });

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      },
      notification,
    );

    return res.status(200).json({ ok: true, sent: 1, failed: 0, subscriptionCount: 1 });
  } catch (err: unknown) {
    console.error('[api/push/test]', err);
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;

    if (statusCode === 404 || statusCode === 410) {
      return res.status(502).json({
        error:
          'Push delivery failed. Turn notifications off and on again so the subscription matches your VAPID keys.',
      });
    }

    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Push test failed on the server.',
    });
  }
}
