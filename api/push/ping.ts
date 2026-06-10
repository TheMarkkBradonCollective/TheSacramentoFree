import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { getServiceRoleKey, getVapidPublicKey } = await import('../../push-server.bundle.cjs');
    const vapidPublicKey = getVapidPublicKey();
    return res.status(200).json({
      ok: true,
      route: 'push/ping',
      vapidConfigured: Boolean(vapidPublicKey),
      serviceRoleConfigured: Boolean(getServiceRoleKey()),
      deliveryReady: Boolean(vapidPublicKey && getServiceRoleKey()),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      route: 'push/ping',
      error: err instanceof Error ? err.message : 'Push bundle failed to load',
    });
  }
}
