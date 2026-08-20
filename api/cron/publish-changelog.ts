import type { VercelRequest, VercelResponse } from '@vercel/node';
import { secureCompare } from '../push/_server/secureSecrets';

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
 * Preserves updatedAt when row content is unchanged (avoids false unread badges).
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
    const { publishChangelogToSupabase } = await import('../push/_server/publishChangelog');
    const result = await publishChangelogToSupabase();

    if (!result.ok) {
      console.error('[publish-changelog]', result.error);
      return res.status(500).json({ error: result.error || 'Publish changelog failed.' });
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
      updates: result.updates,
      announcements: result.announcements,
      staffApplyInvite,
      ids: result.ids,
    });
  } catch (err) {
    console.error('[api/cron/publish-changelog]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Publish changelog failed.',
    });
  }
}
