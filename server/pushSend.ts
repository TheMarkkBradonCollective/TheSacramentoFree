import { getUserRole, isStaffRole, supabaseAdmin } from './auth';
import {
  getPreferencesForUsers,
  sendPushToUsers,
  withinRadius,
  type PushEventType,
  type PushPayload,
} from './push';

export interface PushSendBody {
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

async function resolveRecipients(body: PushSendBody, callerId: string): Promise<string[]> {
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

        const prefKey =
          eventType === 'new_request' ? 'requests' : eventType === 'nearby_item' ? 'nearbyListings' : 'newListings';
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

export async function runPushSend(
  callerId: string,
  body: PushSendBody,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!body?.eventType || !body?.title || !body?.body || !body?.url) {
    return { status: 400, body: { error: 'eventType, title, body, and url are required' } };
  }

  if (body.eventType === 'announcement') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) {
      return { status: 403, body: { error: 'Staff access required for announcements' } };
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

  return { status: 200, body: { ok: true, recipients: recipients.length, ...result } };
}
