import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureCompare } from '../push/_server/secureSecrets';
import { filterNews, filterUpdates } from '../../shared/changelogFilters';
import {
  SEEDED_APP_UPDATES,
  SEEDED_HELP_ANNOUNCEMENTS,
} from '../../shared/changelogSeed';

function isAuthorized(req: VercelRequest): boolean {
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (!cronSecret) return false;

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return Boolean(token) && secureCompare(token, cronSecret);
}

/**
 * Upserts the latest seeded Updates + News into Supabase so:
 * - Bell hub / signed-in clients see DB rows
 * - INSERT webhooks can fire push for brand-new ids
 *
 * Idempotent: ON CONFLICT updates content without duplicating.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { getSupabaseAdmin } = await import('../push/_server/supabaseAdmin');
    const admin = await getSupabaseAdmin();
    const now = new Date().toISOString();

    const updateRows = filterUpdates(
      SEEDED_APP_UPDATES.map((row) => ({
        ...row,
        updatedAt: now,
      })),
    );
    const newsRows = filterNews(
      SEEDED_HELP_ANNOUNCEMENTS.map((row) => ({
        ...row,
        updatedAt: now,
      })),
    );

    const { error: updatesError } = await admin.from('app_updates').upsert(updateRows, {
      onConflict: 'id',
    });
    if (updatesError) {
      console.error('[publish-changelog] app_updates', updatesError);
      return res.status(500).json({ error: updatesError.message });
    }

    const { error: newsError } = await admin.from('help_announcements').upsert(newsRows, {
      onConflict: 'id',
    });
    if (newsError) {
      console.error('[publish-changelog] help_announcements', newsError);
      return res.status(500).json({ error: newsError.message });
    }

    let staffApplyInvite: Record<string, unknown> = {};
    try {
      const { sendStaffApplyInviteCampaign } = await import('../push/_server/staffApplyInvitePush');
      staffApplyInvite = await sendStaffApplyInviteCampaign();
    } catch (inviteErr) {
      console.error('[publish-changelog] staff-apply invite', inviteErr);
      staffApplyInvite = {
        error: inviteErr instanceof Error ? inviteErr.message : 'staff-apply invite failed',
      };
    }

    return res.status(200).json({
      ok: true,
      updates: updateRows.length,
      announcements: newsRows.length,
      staffApplyInvite,
      ids: {
        updates: updateRows.map((r) => r.id),
        announcements: newsRows.map((r) => r.id),
      },
    });
  } catch (err) {
    console.error('[api/cron/publish-changelog]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Publish changelog failed.',
    });
  }
}
