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

    // Keep Updates + News seed rows synced in Supabase (idempotent upsert).
    let changelog: { ok?: boolean; error?: string; updates?: number; announcements?: number } = {};
    try {
      const { getSupabaseAdmin } = await import('../push/_server/supabaseAdmin');
      const {
        SEEDED_APP_UPDATES,
        SEEDED_HELP_ANNOUNCEMENTS,
      } = await import('../../shared/changelogSeed');
      const admin = await getSupabaseAdmin();
      const now = new Date().toISOString();
      const updateRows = SEEDED_APP_UPDATES.map((row) => ({ ...row, updatedAt: now }));
      const newsRows = SEEDED_HELP_ANNOUNCEMENTS.map((row) => ({ ...row, updatedAt: now }));
      const { error: updatesError } = await admin.from('app_updates').upsert(updateRows, { onConflict: 'id' });
      const { error: newsError } = await admin.from('help_announcements').upsert(newsRows, { onConflict: 'id' });
      if (updatesError || newsError) {
        changelog = { ok: false, error: updatesError?.message || newsError?.message };
      } else {
        changelog = { ok: true, updates: updateRows.length, announcements: newsRows.length };
      }
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
