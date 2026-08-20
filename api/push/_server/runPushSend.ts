import { assertStaffOrDirectorForPush, clampPushText, CLIENT_FAN_OUT_PUSH_EVENTS, validateClientPush } from './clientPushAuth';
import { getServiceRoleKey, getSupabaseAdmin } from './supabaseAdmin';
import {
  getPreferencesForUsers,
  getStaffInteractionModesForUsers,
  sendPushToUsers,
  withinRadius,
  type PushEventType,
  type PushPayload,
} from './pushDelivery';
import { isDirectorAccount } from './directorIdentity';
import { sanitizePushUrl } from './pushUrl';
import { getUserRole, isStaffRole, normalizeUserRole, roleRank } from './staffRoles';
import { receivesStaffModeNotifications } from '../../../shared/staffInteractionMode';

export interface PushSendOptions {
  /** When false (public /api/push/send), recipients are validated server-side. Default true. */
  trusted?: boolean;
}

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

async function validateCallerForPush(callerId: string, body: PushSendBody): Promise<string | null> {
  if (body.eventType === 'support_reply') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) return 'Staff access required for support replies';
    return null;
  }

  if (body.eventType === 'announcement') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) return 'Staff access required for announcements';
    return null;
  }

  if (body.eventType === 'app_update') {
    const role = await getUserRole(callerId);
    if (normalizeUserRole(role) !== 'director') return 'Director access required for app updates';
    return null;
  }

  if (body.eventType === 'staff_chat') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) return 'Staff access required for staff chat';
    return null;
  }

  if (body.eventType === 'new_message' && body.conversationId) {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data } = await supabaseAdmin
      .from('chats')
      .select('participantIds')
      .eq('id', body.conversationId)
      .maybeSingle();
    const participants = (data as { participantIds?: string[] } | null)?.participantIds || [];
    if (!participants.includes(callerId)) return 'Not a participant in this conversation';
    const explicit = body.recipientUserIds?.filter(Boolean) || [];
    if (explicit.length && !explicit.every((id) => participants.includes(id))) {
      return 'Invalid message recipient';
    }
  }

  return null;
}

async function filterStaffModeRecipients(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return userIds;
  const modeMap = await getStaffInteractionModesForUsers(userIds);
  return userIds.filter((uid) => receivesStaffModeNotifications(modeMap.get(uid)));
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
    eventType === 'nearby_request' ||
    eventType === 'feed_post'
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
    const isFeedPost = eventType === 'feed_post';

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

        if (isFeedPost) {
          if (prefs.newListings && sameCity) return true;
          if (prefs.nearbyListings && (sameCity || inRadius)) return true;
          if (prefs.announcements) return true;
          return false;
        }

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
      if (isDirectorAccount(uid, row.role)) ids.add(uid);
    }
    return filterStaffModeRecipients([...ids]);
  }

  if (eventType === 'staff_support' || eventType === 'staff_report') {
    const minRank =
      eventType === 'staff_report'
        ? 1
        : typeof body.minStaffRank === 'number'
          ? body.minStaffRank
          : 1;

    const { data: users } = await supabaseAdmin.from('users').select('uid, role, email');

    return filterStaffModeRecipients(
      (users || [])
        .filter((u) => {
          const uid = String((u as { uid: string }).uid);
          if (!uid || uid === callerId) return false;
          const row = u as { role?: string; email?: string };
          const role = normalizeUserRole(row.role);
          if (!isStaffRole(role) || isDirectorAccount(uid, row.role)) return false;
          return roleRank(role) >= minRank;
        })
        .map((u) => String((u as { uid: string }).uid)),
    );
  }

  if (eventType === 'community_chat') {
    const { data } = await supabaseAdmin.from('users').select('uid');
    return (data || []).map((u) => String((u as { uid: string }).uid));
  }

  if (eventType === 'staff_chat') {
    const minRank = typeof body.minStaffRank === 'number' ? body.minStaffRank : 1;
    const { data: users } = await supabaseAdmin.from('users').select('uid, role, email');

    return filterStaffModeRecipients(
      (users || [])
        .filter((u) => {
          const uid = String((u as { uid: string }).uid);
          if (!uid || uid === callerId) return false;
          const row = u as { role?: string; email?: string };
          const role = normalizeUserRole(row.role);
          if (!isStaffRole(role) || isDirectorAccount(uid, row.role)) return false;
          return roleRank(role) >= minRank;
        })
        .map((u) => String((u as { uid: string }).uid)),
    );
  }

  if (eventType === 'announcement' || eventType === 'app_update') {
    if (eventType === 'announcement') {
      const role = await getUserRole(callerId);
      if (!isStaffRole(role)) return [];
    }

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
  options: PushSendOptions = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const trusted = options.trusted !== false;

  if (!getServiceRoleKey()) {
    return {
      status: 503,
      body: {
        error: 'Push delivery is temporarily unavailable.',
        sent: 0,
        recipients: 0,
      },
    };
  }

  if (!body?.eventType || !body?.title || !body?.body || body?.url === undefined) {
    return { status: 400, body: { error: 'eventType, title, body, and url are required' } };
  }

  const safeBody = clampPushText({
    ...body,
    url: sanitizePushUrl(body.url),
  });

  if (!trusted) {
    const clientCheck = await validateClientPush(callerId, safeBody);
    if (clientCheck.ok === false) {
      return { status: 403, body: { error: clientCheck.error } };
    }
    if (clientCheck.recipientUserIds?.length) {
      safeBody.recipientUserIds = clientCheck.recipientUserIds;
    } else if (CLIENT_FAN_OUT_PUSH_EVENTS.has(safeBody.eventType)) {
      delete safeBody.recipientUserIds;
    }
  } else {
    const authError = await validateCallerForPush(callerId, safeBody);
    if (authError) {
      return { status: 403, body: { error: authError } };
    }

    const staffError = await assertStaffOrDirectorForPush(callerId, safeBody.eventType);
    if (staffError) {
      return { status: 403, body: { error: staffError } };
    }
  }

  const recipients = await resolveRecipients(safeBody, callerId);
  const explicitRecipients = safeBody.recipientUserIds?.filter(Boolean) || [];
  const excludeIds =
    explicitRecipients.length > 0
      ? safeBody.excludeUserIds || []
      : [callerId, ...(safeBody.excludeUserIds || [])];

  const payload: PushPayload = {
    title: safeBody.title,
    body: safeBody.body,
    url: safeBody.url,
    tag: safeBody.tag,
    eventType: safeBody.eventType,
    data: {
      listingId: safeBody.listingId || '',
      conversationId: safeBody.conversationId || '',
      requestId: safeBody.requestId || '',
      ...(safeBody.data || {}),
    },
  };

  const result = await sendPushToUsers(recipients, payload, {
    excludeUserIds: excludeIds,
  });

  return { status: 200, body: { ok: true, recipients: recipients.length, ...result } };
}
