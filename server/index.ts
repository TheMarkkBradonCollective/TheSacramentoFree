import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { requireAuth, supabaseAdmin, getUserRole, isStaffRole, type AuthedRequest } from './auth.js';
import {
  configureVapid,
  getVapidPublicKey,
  sendPushToUsers,
  getPreferencesForUsers,
  withinRadius,
  coordsForNeighborhood,
  type PushEventType,
  type PushPayload,
} from './push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3001);

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

  const { error } = await supabaseAdmin.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
  if (error) {
    console.error('[push] subscribe failed:', error.message);
    res.status(500).json({ error: 'Could not save subscription' });
    return;
  }

  await supabaseAdmin.from('notification_preferences').upsert(
    { userId, updatedAt: new Date().toISOString() },
    { onConflict: 'userId', ignoreDuplicates: true },
  );

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

interface SendBody {
  eventType: PushEventType;
  title: string;
  body: string;
  url: string;
  tag?: string;
  data?: Record<string, string>;
  recipientUserIds?: string[];
  excludeUserIds?: string[];
  listingId?: string;
  conversationId?: string;
  requestId?: string;
  category?: string;
  neighborhood?: string;
  itemLat?: number;
  itemLng?: number;
  cities?: string[];
}

async function resolveRecipients(body: SendBody, callerId: string): Promise<string[]> {
  const explicit = body.recipientUserIds?.filter(Boolean) || [];
  if (explicit.length) return explicit;

  const eventType = body.eventType;

  if (eventType === 'new_item' || eventType === 'new_request' || eventType === 'nearby_item') {
    const { data: users } = await supabaseAdmin.from('users').select('uid, neighborhood');
    const listingNeighborhood = body.neighborhood || '';
    const category = body.category || '';
    const itemLatLng =
      typeof body.itemLat === 'number' && typeof body.itemLng === 'number'
        ? { lat: body.itemLat, lng: body.itemLng }
        : null;

    const prefsMap = await getPreferencesForUsers((users || []).map((u) => String((u as { uid: string }).uid)));

    return (users || [])
      .filter((u) => {
        const uid = String((u as { uid: string }).uid);
        if (uid === callerId) return false;
        const prefs = prefsMap.get(uid);
        if (!prefs) return false;

        const prefKey = eventType === 'new_request' ? 'requests' : eventType === 'nearby_item' ? 'nearbyListings' : 'newListings';
        if (!prefs.enabled || !prefs[prefKey]) return false;

        if (eventType === 'nearby_item') {
          return withinRadius(
            String((u as { neighborhood: string }).neighborhood),
            listingNeighborhood,
            itemLatLng,
            prefs.nearbyRadiusMiles,
          );
        }

        const sameCity = String((u as { neighborhood: string }).neighborhood) === listingNeighborhood;
        const followsCategory = category && prefs.followedCategories.includes(category);
        return sameCity || followsCategory;
      })
      .map((u) => String((u as { uid: string }).uid));
  }

  if (eventType === 'announcement') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) return [];

    const cities = body.cities?.filter(Boolean) || [];
    let query = supabaseAdmin.from('users').select('uid');
    if (cities.length) query = query.in('neighborhood', cities);
    const { data } = await query;
    return (data || []).map((u) => String((u as { uid: string }).uid));
  }

  return [];
}

app.post('/api/push/send', requireAuth, async (req: AuthedRequest, res) => {
  const callerId = req.user!.id;
  const body = req.body as SendBody;

  if (!body?.eventType || !body?.title || !body?.body || !body?.url) {
    res.status(400).json({ error: 'eventType, title, body, and url are required' });
    return;
  }

  if (body.eventType === 'announcement') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) {
      res.status(403).json({ error: 'Staff access required for announcements' });
      return;
    }
  }

  const recipients = await resolveRecipients(body, callerId);
  const payload: PushPayload = {
    title: body.title,
    body: body.body,
    url: body.url,
    tag: body.tag,
    eventType: body.eventType,
    data: {
      ...(body.data || {}),
      listingId: body.listingId || '',
      conversationId: body.conversationId || '',
      requestId: body.requestId || '',
    },
  };

  const result = await sendPushToUsers(recipients, payload, {
    excludeUserIds: [callerId, ...(body.excludeUserIds || [])],
  });

  res.json({ ok: true, recipients: recipients.length, ...result });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
