import { getUserRole, isStaffRole, normalizeUserRole, roleRank, supabaseAdmin } from './auth';
import { DIRECTOR_UIDS, isDirectorAccount } from './directorIdentity';
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
  minStaffRank?: number;
}

async function resolveRecipients(body: PushSendBody, callerId: string): Promise<string[]> {
  const explicit = body.recipientUserIds?.filter(Boolean) || [];
  if (explicit.length) return explicit;

  const eventType = body.eventType;

  if (
    eventType === 'new_item' ||
    eventType === 'new_request' ||
    eventType === 'nearby_item' ||
    eventType === 'nearby_request'
  ) {
    const { data: users } = await supabaseAdmin.from('users').select('uid, neighborhood');
    const listingNeighborhood = body.neighborhood || '';
    const category = body.category || '';
    const itemLatLng =
      typeof body.itemLat === 'number' && typeof body.itemLng === 'number'
        ? { lat: body.itemLat, lng: body.itemLng }
        : null;

    const isRequest = eventType === 'new_request' || eventType === 'nearby_request';
    const nearbyOnly = eventType === 'nearby_item' || eventType === 'nearby_request';

    const prefsMap = await getPreferencesForUsers((users || []).map((u) => String((u as { uid: string }).uid)));

    return (users || [])
      .filter((u) => {
        const uid = String((u as { uid: string }).uid);
        if (uid === callerId) return false;
        const prefs = prefsMap.get(uid);
        if (!prefs?.enabled) return false;

        const viewerNeighborhood = String((u as { neighborhood: string }).neighborhood);
        const sameCity = viewerNeighborhood === listingNeighborhood;
        const followsCategory = Boolean(category && prefs.followedCategories.includes(category));
        const inRadius =
          itemLatLng &&
          withinRadius(viewerNeighborhood, listingNeighborhood, itemLatLng, prefs.nearbyRadiusMiles);

        if (nearbyOnly) {
          if (!prefs[isRequest ? 'requests' : 'nearbyListings']) return false;
          return Boolean(inRadius && !sameCity);
        }

        if (prefs[isRequest ? 'requests' : 'newListings'] && (sameCity || followsCategory)) return true;
        if (prefs[isRequest ? 'requests' : 'nearbyListings'] && inRadius) return true;
        return false;
      })
      .map((u) => String((u as { uid: string }).uid));
  }

  if (eventType === 'director_alert') {
    const { data: users } = await supabaseAdmin.from('users').select('uid, role, email');
    const ids = new Set<string>();
    for (const u of users || []) {
      const uid = String((u as { uid: string }).uid);
      if (!uid || uid === callerId) continue;
      const row = u as { role?: string; email?: string };
      if (isDirectorAccount(uid)) ids.add(uid);
    }
    for (const uid of DIRECTOR_UIDS) {
      if (uid && uid !== callerId) ids.add(uid);
    }
    return [...ids];
  }

  if (eventType === 'staff_support' || eventType === 'staff_report') {
    const minRank =
      eventType === 'staff_report'
        ? 1
        : typeof body.minStaffRank === 'number'
          ? body.minStaffRank
          : 1;

    const { data: users } = await supabaseAdmin.from('users').select('uid, role, email');

    return (users || [])
      .filter((u) => {
        const uid = String((u as { uid: string }).uid);
        if (!uid || uid === callerId) return false;
        const row = u as { role?: string; email?: string };
        const role = normalizeUserRole(row.role);
        if (!isStaffRole(role) || isDirectorAccount(uid)) return false;
        return roleRank(role) >= minRank;
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

  if (eventType === 'saved_item_update' && body.listingId) {
    const listingId = String(body.listingId);
    const { data: item } = await supabaseAdmin
      .from('items')
      .select('userId')
      .eq('id', listingId)
      .maybeSingle();
    const ownerId = String((item as { userId?: string } | null)?.userId || '');
    const { data: rows } = await supabaseAdmin.from('saved_items').select('userId').eq('itemId', listingId);
    return (rows || [])
      .map((row) => String((row as { userId?: string }).userId || ''))
      .filter((uid) => uid && uid !== ownerId);
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
  const explicitRecipients = body.recipientUserIds?.filter(Boolean) || [];
  const excludeIds =
    explicitRecipients.length > 0
      ? body.excludeUserIds || []
      : [callerId, ...(body.excludeUserIds || [])];

  const payload: PushPayload = {
    title: body.title,
    body: body.body,
    url: body.url,
    tag: body.tag,
    eventType: body.eventType,
    data: {
      listingId: body.listingId || '',
      conversationId: body.conversationId || '',
      requestId: body.requestId || '',
      ...(body.data || {}),
    },
  };

  const result = await sendPushToUsers(recipients, payload, {
    excludeUserIds: excludeIds,
  });

  return { status: 200, body: { ok: true, recipients: recipients.length, ...result } };
}
