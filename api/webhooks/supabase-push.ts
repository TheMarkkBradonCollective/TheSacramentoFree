import type { VercelRequest, VercelResponse } from '@vercel/node';

function getWebhookSecret(): string {
  return (
    process.env.SUPABASE_PUSH_WEBHOOK_SECRET ||
    process.env.PUSH_WEBHOOK_SECRET ||
    ''
  ).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getWebhookSecret();
  if (!secret) {
    return res.status(503).json({
      error:
        'Set SUPABASE_PUSH_WEBHOOK_SECRET in Vercel, then add a Supabase Database Webhook for support_ticket_messages and user_reports INSERT events.',
    });
  }

  const authHeader = String(req.headers.authorization || '');
  const headerSecret = String(req.headers['x-webhook-secret'] || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : headerSecret;

  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  try {
    const { getServiceRoleKey, parseJsonBody, runSupabasePushWebhook } = await import(
      '../../push-server.bundle.cjs'
    );

    if (!getServiceRoleKey()) {
      return res.status(503).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY is required for webhook push delivery.',
      });
    }

    const body = parseJsonBody(req);
    const result = await runSupabasePushWebhook(body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[api/webhooks/supabase-push]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Webhook push dispatch failed.',
    });
  }
}
