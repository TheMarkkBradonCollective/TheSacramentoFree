import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromBearer } from '../push/_server/auth';
import { getSupabaseAdmin } from '../push/_server/supabaseAdmin';
import { getUserRole, isDirectorRole } from '../push/_server/staffRoles';
import { fetchAllNeighborEmails, playTestersCsvBody } from './_server/playTestersCsv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Sign in required' });
    }

    const role = await getUserRole(user.id);
    if (!isDirectorRole(role)) {
      return res.status(403).json({ error: 'Director access required' });
    }

    const admin = await getSupabaseAdmin();
    const emails = await fetchAllNeighborEmails(admin);
    if (emails.length === 0) {
      return res.status(404).json({ error: 'No neighbor emails found' });
    }

    const body = playTestersCsvBody(emails);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="play-testers.csv"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(body);
  } catch (err) {
    console.error('[api/admin/export-play-testers]', err);
    return res.status(500).json({ error: 'Export failed' });
  }
}
