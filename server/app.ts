import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'crypto';
import { requireAuth, supabaseAdmin, type AuthedRequest } from './auth';
import { configureVapid, getVapidPublicKey } from './push';
import { runPushTest } from './pushTest';
import { runPushSend, type PushSendBody } from './pushSend';
import { runSupportNotify } from './supportNotify';
import { runReportNotify } from './reportNotify';

export function createPushApp() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));
  configureVapid();

  app.get('/api/push/vapid-public-key', (_req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
      res.status(503).json({ error: 'Push notifications are not configured' });
      return;
    }
    res.json({ publicKey: key });
  });

  app.post('/api/push/subscribe', requireAuth, async (req: AuthedRequest, res) => {
    const userId = req.user!.id;
    const { subscription, userAgent } = req.body || {};

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      res.status(400).json({ error: 'Invalid push subscription payload' });
      return;
    }

    const row = {
      id: randomUUID(),
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : null,
      updatedAt: new Date().toISOString(),
    };

    const { data: profile } = await supabaseAdmin.from('users').select('uid').eq('uid', userId).maybeSingle();
    if (!profile) {
      res.status(400).json({
        error:
          'Your community profile is not in the database yet. Save your profile once, then enable notifications again.',
      });
      return;
    }

    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (error) {
      console.error('[push] subscribe failed:', error.code, error.message);
      if (error.code === '42P01' || error.message?.includes('push_subscriptions')) {
        res.status(503).json({
          error: 'Push tables are missing in Supabase. Run complete-schema.sql in the SQL editor.',
        });
        return;
      }
      res.status(500).json({ error: error.message || 'Could not save subscription' });
      return;
    }

    const { ensureNotificationPreferencesOnSubscribe } = await import('../api/push/_server/pushSubscribe');
    await ensureNotificationPreferencesOnSubscribe(userId);

    res.json({ ok: true });
  });

  app.post('/api/push/unsubscribe', requireAuth, async (req: AuthedRequest, res) => {
    const userId = req.user!.id;
    const endpoint = req.body?.endpoint;

    let query = supabaseAdmin.from('push_subscriptions').delete().eq('userId', userId);
    if (endpoint) query = query.eq('endpoint', endpoint);

    const { error } = await query;
    if (error) {
      res.status(500).json({ error: 'Could not remove subscription' });
      return;
    }

    res.json({ ok: true });
  });

  app.post('/api/push/test', requireAuth, async (req: AuthedRequest, res) => {
    const result = await runPushTest({
      userId: req.user!.id,
      subscription: req.body?.subscription,
    });
    res.status(result.status).json(result.body);
  });

  app.post('/api/push/test-broadcast', requireAuth, async (req: AuthedRequest, res) => {
    if (!req.body?.confirm) {
      res.status(400).json({ error: 'confirm: true is required for broadcast test' });
      return;
    }
    const { runDirectorBroadcastTest } = await import('../api/push/_server/runDirectorBroadcastTest');
    const result = await runDirectorBroadcastTest(req.user!.id, {
      title: req.body?.title,
      body: req.body?.body,
    });
    res.status(result.status).json(result.body);
  });

  app.post('/api/push/send', requireAuth, async (req: AuthedRequest, res) => {
    const result = await runPushSend(req.user!.id, req.body as PushSendBody, { trusted: false });
    res.status(result.status).json(result.body);
  });

  app.post('/api/support/notify', requireAuth, async (req: AuthedRequest, res) => {
    const ticketId = String(req.body?.ticketId || '').trim();
    const event = req.body?.event;
    if (!ticketId || !event) {
      res.status(400).json({ error: 'ticketId and event are required' });
      return;
    }
    const messageId = String(req.body?.messageId || '').trim() || undefined;
    const result = await runSupportNotify(req.user!.id, ticketId, event, messageId);
    res.status(result.status).json(result.body);
  });

  app.post('/api/reports/notify', requireAuth, async (req: AuthedRequest, res) => {
    const reportId = String(req.body?.reportId || '').trim();
    if (!reportId) {
      res.status(400).json({ error: 'reportId is required' });
      return;
    }
    const result = await runReportNotify(req.user!.id, reportId);
    res.status(result.status).json(result.body);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/map/route', async (req, res) => {
    const { parseRouteEndpoints, isInSacramentoServiceArea } = await import('../api/_lib/mapCoords');
    const parsed = parseRouteEndpoints(req.query);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    if (!isInSacramentoServiceArea(parsed.from, parsed.to)) {
      res.status(400).json({ error: 'Route must stay within the Sacramento service area' });
      return;
    }

    const { fetchOsrmDrivingRoute } = await import('../api/_lib/osrmRoute');
    const route = await fetchOsrmDrivingRoute(parsed.from, parsed.to);

    if (!route) {
      res.status(502).json({ error: 'Could not calculate driving route' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(route);
  });

  app.get('/api/map/navigation', async (req, res) => {
    const { parseRouteEndpoints, isInSacramentoServiceArea } = await import('../api/_lib/mapCoords');
    const parsed = parseRouteEndpoints(req.query);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    if (!isInSacramentoServiceArea(parsed.from, parsed.to)) {
      res.status(400).json({ error: 'Route must stay within the Sacramento service area' });
      return;
    }

    const { fetchOsrmNavigationRoute } = await import('../api/_lib/osrmNavigation');
    const route = await fetchOsrmNavigationRoute(parsed.from, parsed.to);

    if (!route) {
      res.status(502).json({ error: 'Could not calculate navigation route' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json(route);
  });

  return app;
}
