import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getUserFromBearer, getServiceRoleKey, runExportPlayTesters } = await import(
      '../../push-server.bundle.cjs'
    );

    if (!getServiceRoleKey()) {
      return res.status(503).json({
        error:
          'Export requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it in Vercel environment variables and redeploy.',
      });
    }

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Sign in required' });
    }

    const result = await runExportPlayTesters(user.id);
    if (result.csv && typeof result.body === 'string') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="play-testers.csv"');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(result.status).send(result.body);
    }

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/admin/export-play-testers]', err);
    return res.status(500).json({ error: 'Export failed' });
  }
}
