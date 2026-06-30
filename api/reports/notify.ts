import type { VercelRequest, VercelResponse } from '@vercel/node';

type NotifyBody = {
  reportId?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getBearerToken, getUserFromBearer, getServiceRoleKey, parseJsonBody, runReportNotify } = await import(
      '../../push-server.bundle.cjs'
    );

    if (!getServiceRoleKey()) {
      return res.status(503).json({
        error:
          'Push delivery requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it in Vercel environment variables and redeploy.',
        sent: 0,
      });
    }

    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody(req) as NotifyBody;
    const reportId = body.reportId?.trim();
    if (!reportId) {
      return res.status(400).json({ error: 'reportId is required' });
    }

    const result = await runReportNotify(user.id, reportId);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/reports/notify]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Report push notification failed.',
    });
  }
}
