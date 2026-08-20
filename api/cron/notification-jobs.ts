import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureCompare } from '../push/_server/secureSecrets';

function isAuthorized(req: VercelRequest): boolean {
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (!cronSecret) return false;

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return Boolean(token) && secureCompare(token, cronSecret);
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

    let changelog: { ok?: boolean; error?: string; updates?: number; announcements?: number } = {};
    try {
      const { publishChangelogToSupabase } = await import('../push/_server/publishChangelog');
      const result = await publishChangelogToSupabase();
      changelog = result.ok
        ? { ok: true, updates: result.updates, announcements: result.announcements }
        : { ok: false, error: result.error };
    } catch (changelogErr) {
      changelog = {
        ok: false,
        error: changelogErr instanceof Error ? changelogErr.message : 'changelog sync failed',
      };
    }

    let staffApplyInvite: Record<string, unknown> = {};
    try {
      const { sendStaffApplyInviteCampaign } = await import('../push/_server/staffApplyInvitePush');
      staffApplyInvite = await sendStaffApplyInviteCampaign();
    } catch (inviteErr) {
      console.error('[notification-jobs] staff-apply invite', inviteErr);
      staffApplyInvite = {
        error: inviteErr instanceof Error ? inviteErr.message : 'staff-apply invite failed',
      };
    }

    return res.status(200).json({
      ok: true,
      expiry: expiry.body,
      pickup: pickup.body,
      changelog,
      staffApplyInvite,
    });
  } catch (err) {
    console.error('[api/cron/notification-jobs]', err);
    return res.status(500).json({
      error: 'Notification cron failed.',
    });
  }
}
