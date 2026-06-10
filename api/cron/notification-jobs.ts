import type { VercelRequest, VercelResponse } from '@vercel/node';

function isAuthorized(req: VercelRequest): boolean {
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (!cronSecret) return process.env.NODE_ENV !== 'production';

  const auth = String(req.headers.authorization || '');
  return auth === `Bearer ${cronSecret}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { runListingExpiryCron, runPickupReminderCron } = await import('../../push-server.bundle.cjs');

    const [expiry, pickup] = await Promise.all([runListingExpiryCron(), runPickupReminderCron()]);

    return res.status(200).json({
      ok: true,
      expiry: expiry.body,
      pickup: pickup.body,
    });
  } catch (err) {
    console.error('[api/cron/notification-jobs]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Notification cron failed.',
    });
  }
}
