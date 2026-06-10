import { getServiceRoleKey, getSupabaseAdmin } from './supabaseAdmin';
import {
  getPreferencesForUsers,
  sendPushToUsers,
  withinRadius,
  type PushEventType,
  type PushPayload,
} from './pushDelivery';
import { getUserRole, isStaffRole, roleRank, STAFF_ROLES } from './staffRoles';

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
  const supabaseAdmin = await getSupabaseAdmin();

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

    const prefsMap = await getPreferencesForUsers((users || []).map((u) => String((u as { uid: string }).uid)));

    return (users || [])
      .filter((u) => {
        const uid = String((u as { uid: string }).uid);
        if (uid === callerId) return false;
        const prefs = prefsMap.get(uid);
        if (!prefs) return false;

        const prefKey =
          eventType === 'new_request' || eventType === 'nearby_request'
            ? 'requests'
            : eventType === 'nearby_item'
              ? 'nearbyListings'
              : 'newListings';
        if (!prefs.enabled || !prefs[prefKey]) return false;

        if (eventType === 'nearby_item' || eventType === 'nearby_request') {
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

  if (eventType === 'director_alert') {
    const { data: users } = await supabaseAdmin.from('users').select('uid, role').eq('role', 'director');
    return (users || [])
      .map((u) => String((u as { uid: string }).uid))
      .filter((uid) => uid && uid !== callerId);
  }

  if (eventType === 'staff_support' || eventType === 'staff_report') {
    const minRank =
      eventType === 'staff_report'
        ? 1
        : typeof body.minStaffRank === 'number'
          ? body.minStaffRank
          : 1;

    const { data: users } = await supabaseAdmin.from('users').select('uid, role').in('role', [...STAFF_ROLES]);

    return (users || [])
      .filter((u) => {
        const uid = String((u as { uid: string }).uid);
        if (!uid || uid === callerId) return false;
        return roleRank(String((u as { role: string }).role)) >= minRank;
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
  if (!getServiceRoleKey()) {
    return {
      status: 503,
      body: {
        error:
          'Push delivery requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it in Vercel environment variables and redeploy.',
        sent: 0,
        recipients: 0,
      },
    };
  }

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
