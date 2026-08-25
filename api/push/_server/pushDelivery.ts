import { getEventMetadata, webPushUrgency } from '../../../shared/notificationTypes';
import { getSupabaseAdmin } from './supabaseAdmin';
import { isFcmConfigured, isFcmSubscription, sendFcmToSubscription } from './fcmDelivery';
import { configureVapidAsync, getWebPushModuleAsync } from './webPushLoader';
import { dispatchNotification } from './notificationEngine';

export type PushEventType =
  | 'new_item'
  | 'new_request'
  | 'item_claimed'
  | 'item_gifted'
  | 'pickup_scheduled'
  | 'pickup_reminder'
  | 'on_the_way'
  | 'new_message'
  | 'community_chat'
  | 'staff_chat'
  | 'message_request'
  | 'message_request_accepted'
  | 'new_comment'
  | 'listing_upvote'
  | 'listing_downvote'
  | 'listing_viewed'
  | 'listing_approved'
  | 'listing_denied'
  | 'listing_expiring'
  | 'listing_expired'
  | 'nearby_item'
  | 'nearby_request'
  | 'claim_request'
  | 'request_fulfilled'
  | 'announcement'
  | 'app_update'
  | 'account_update'
  | 'support_reply'
  | 'staff_support'
  | 'staff_report'
  | 'director_alert'
  | 'saved_item_update'
  | 'listing_status'
  | 'go_get_availability_request'
  | 'go_get_available_now'
  | 'go_get_schedule_proposed'
  | 'go_get_schedule_confirmed'
  | 'go_get_schedule_changed'
  | 'go_get_pickup_tomorrow'
  | 'go_get_pickup_in_one_hour'
  | 'go_get_pickup_thirty_min'
  | 'go_get_ready_reminder'
  | 'go_get_fulfiller_ready'
  | 'go_get_started'
  | 'go_get_approaching'
  | 'go_get_arrived'
  | 'go_get_completed'
  | 'go_get_cancelled'
  | 'go_get_ring_expired'
  | 'go_get_disputed'
  | 'contactless_pickup_arrived'
  | 'contactless_pickup_left'
  | 'feed_comment'
  | 'feed_reaction'
  | 'feed_upvote'
  | 'feed_downvote'
  | 'feed_post'
  | 'feed_reply'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'award_unlocked'
  | 'event_rsvp'
  | 'event_comment'
  | 'announcement_comment'
  | 'update_comment'
  | 'violation_filed'
  | 'violation_decision'
  | 'account_locked'
  | 'appeal_decision';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  eventType: PushEventType;
  data?: Record<string, string>;
}

export interface NotificationPreferencesRow {
  userId: string;
  enabled: boolean;
  messages: boolean;
  messageRequests: boolean;
  communityChat: boolean;
  staffChat: boolean;
  support: boolean;
  claims: boolean;
  gifts: boolean;
  comments: boolean;
  listingUpvotes: boolean;
  listingDownvotes: boolean;
  listingViews: boolean;
  listingStatus: boolean;
  nearbyListings: boolean;
  requests: boolean;
  appUpdates: boolean;
  announcements: boolean;
  pickupReminders: boolean;
  newListings: boolean;
  savedItems: boolean;
  accountUpdates: boolean;
  feedPosts: boolean;
  feedComments: boolean;
  feedReactions: boolean;
  feedUpvotes: boolean;
  feedDownvotes: boolean;
  listingComments: boolean;
  goGetAlerts: boolean;
  pickupCoordination: boolean;
  listingModeration: boolean;
  listingExpiry: boolean;
  violations: boolean;
  claimRequests: boolean;
  nearbyRequests: boolean;
  requestFulfilled: boolean;
  neighborRequests: boolean;
  feedReplies: boolean;
  friendRequests: boolean;
  awards: boolean;
  eventRsvps: boolean;
  eventComments: boolean;
  discussionComments: boolean;
  staffSupport: boolean;
  staffReports: boolean;
  directorAlerts: boolean;
  directorJoins: boolean;
  directorLeaves: boolean;
  directorModeration: boolean;
  directorReports: boolean;
  directorTickets: boolean;
  directorListings: boolean;
  directorMessageRequests: boolean;
  directorClaimRequests: boolean;
  nearbyRadiusMiles: number;
  followedCategories: string[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursAllowUrgent?: boolean;
}

const DIRECTOR_CATEGORY_PREF_MAP: Record<string, keyof NotificationPreferencesRow> = {
  join: 'directorJoins',
  leave: 'directorLeaves',
  moderation: 'directorModeration',
  report: 'directorReports',
  ticket: 'directorTickets',
  listing: 'directorListings',
  message_request: 'directorMessageRequests',
  claim_request: 'directorClaimRequests',
};

interface PushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const EVENT_PREF_MAP: Record<PushEventType, keyof NotificationPreferencesRow | 'enabled'> = {
  new_item: 'newListings',
  new_request: 'neighborRequests',
  item_claimed: 'claims',
  item_gifted: 'gifts',
  pickup_scheduled: 'pickupCoordination',
  pickup_reminder: 'pickupCoordination',
  on_the_way: 'pickupCoordination',
  new_message: 'messages',
  community_chat: 'communityChat',
  staff_chat: 'staffChat',
  message_request: 'messageRequests',
  message_request_accepted: 'messageRequests',
  new_comment: 'listingComments',
  listing_upvote: 'listingUpvotes',
  listing_downvote: 'listingDownvotes',
  listing_viewed: 'listingViews',
  listing_approved: 'listingModeration',
  listing_denied: 'listingModeration',
  listing_expiring: 'listingExpiry',
  listing_expired: 'listingExpiry',
  listing_status: 'listingExpiry',
  nearby_item: 'nearbyListings',
  nearby_request: 'nearbyRequests',
  claim_request: 'claimRequests',
  request_fulfilled: 'requestFulfilled',
  announcement: 'announcements',
  app_update: 'appUpdates',
  account_update: 'accountUpdates',
  support_reply: 'support',
  staff_support: 'staffSupport',
  staff_report: 'staffReports',
  director_alert: 'directorAlerts',
  saved_item_update: 'savedItems',
  go_get_availability_request: 'goGetAlerts',
  go_get_available_now: 'goGetAlerts',
  go_get_schedule_proposed: 'goGetAlerts',
  go_get_schedule_confirmed: 'goGetAlerts',
  go_get_schedule_changed: 'goGetAlerts',
  go_get_pickup_tomorrow: 'goGetAlerts',
  go_get_pickup_in_one_hour: 'goGetAlerts',
  go_get_pickup_thirty_min: 'goGetAlerts',
  go_get_ready_reminder: 'goGetAlerts',
  go_get_fulfiller_ready: 'goGetAlerts',
  go_get_started: 'goGetAlerts',
  go_get_approaching: 'goGetAlerts',
  go_get_arrived: 'goGetAlerts',
  go_get_completed: 'goGetAlerts',
  go_get_cancelled: 'goGetAlerts',
  go_get_ring_expired: 'goGetAlerts',
  go_get_disputed: 'goGetAlerts',
  contactless_pickup_arrived: 'pickupCoordination',
  contactless_pickup_left: 'pickupCoordination',
  feed_comment: 'feedComments',
  feed_reaction: 'feedReactions',
  feed_upvote: 'feedUpvotes',
  feed_downvote: 'feedDownvotes',
  feed_post: 'feedPosts',
  feed_reply: 'feedReplies',
  friend_request: 'friendRequests',
  friend_request_accepted: 'friendRequests',
  award_unlocked: 'awards',
  event_rsvp: 'eventRsvps',
  event_comment: 'eventComments',
  announcement_comment: 'discussionComments',
  update_comment: 'discussionComments',
  violation_filed: 'violations',
  violation_decision: 'violations',
  account_locked: 'violations',
  appeal_decision: 'violations',
};

const LEGACY_PREF_FALLBACK: Partial<Record<keyof NotificationPreferencesRow, keyof NotificationPreferencesRow>> = {
  feedPosts: 'newListings',
  feedComments: 'comments',
  feedReactions: 'comments',
  feedUpvotes: 'listingUpvotes',
  feedDownvotes: 'listingDownvotes',
  listingComments: 'comments',
  goGetAlerts: 'pickupReminders',
  pickupCoordination: 'pickupReminders',
  listingModeration: 'listingStatus',
  listingExpiry: 'listingStatus',
  violations: 'accountUpdates',
  claimRequests: 'requests',
  nearbyRequests: 'requests',
  requestFulfilled: 'requests',
  neighborRequests: 'requests',
  feedReplies: 'feedComments',
  friendRequests: 'messages',
  awards: 'enabled',
  eventRsvps: 'comments',
  eventComments: 'comments',
  discussionComments: 'announcements',
};

function prefAllows(prefs: NotificationPreferencesRow, key: keyof NotificationPreferencesRow): boolean {
  const row = prefs as unknown as Record<string, unknown>;
  if (row[key] !== undefined && row[key] !== null) {
    return row[key] !== false;
  }
  const fallback = LEGACY_PREF_FALLBACK[key];
  if (fallback) return prefs[fallback] !== false;
  return prefs[key] !== false;
}

function boolPref(row: Record<string, unknown>, key: string, fallbackKey?: string): boolean {
  if (row[key] !== undefined && row[key] !== null) return row[key] !== false;
  if (fallbackKey && row[fallbackKey] !== undefined) return row[fallbackKey] !== false;
  return true;
}

function normalizePrefs(row: Record<string, unknown>): NotificationPreferencesRow {
  return {
    userId: String(row.userId),
    enabled: row.enabled !== false,
    messages: row.messages !== false,
    messageRequests: row.messageRequests !== false,
    communityChat: row.communityChat !== false,
    staffChat: row.staffChat !== false,
    support: row.support !== false,
    claims: row.claims !== false,
    gifts: row.gifts !== false,
    comments: row.comments !== false,
    listingUpvotes: row.listingUpvotes !== false,
    listingDownvotes: row.listingDownvotes !== false,
    listingViews: boolPref(row, 'listingViews', 'listingUpvotes'),
    listingStatus: row.listingStatus !== false,
    nearbyListings: row.nearbyListings !== false,
    requests: row.requests !== false,
    appUpdates: row.appUpdates !== false,
    announcements: row.announcements !== false,
    pickupReminders: row.pickupReminders !== false,
    newListings: row.newListings !== false,
    savedItems: row.savedItems !== false,
    accountUpdates: row.accountUpdates !== false,
    feedPosts: boolPref(row, 'feedPosts', 'newListings'),
    feedComments: boolPref(row, 'feedComments', 'comments'),
    feedReactions: boolPref(row, 'feedReactions', 'comments'),
    feedUpvotes: boolPref(row, 'feedUpvotes', 'listingUpvotes'),
    feedDownvotes: boolPref(row, 'feedDownvotes', 'listingDownvotes'),
    listingComments: boolPref(row, 'listingComments', 'comments'),
    goGetAlerts: boolPref(row, 'goGetAlerts', 'pickupReminders'),
    pickupCoordination: boolPref(row, 'pickupCoordination', 'pickupReminders'),
    listingModeration: boolPref(row, 'listingModeration', 'listingStatus'),
    listingExpiry: boolPref(row, 'listingExpiry', 'listingStatus'),
    violations: boolPref(row, 'violations', 'accountUpdates'),
    claimRequests: boolPref(row, 'claimRequests', 'requests'),
    nearbyRequests: boolPref(row, 'nearbyRequests', 'requests'),
    requestFulfilled: boolPref(row, 'requestFulfilled', 'requests'),
    neighborRequests: boolPref(row, 'neighborRequests', 'requests'),
    feedReplies: boolPref(row, 'feedReplies', 'comments'),
    friendRequests: boolPref(row, 'friendRequests', 'messages'),
    awards: boolPref(row, 'awards'),
    eventRsvps: boolPref(row, 'eventRsvps', 'comments'),
    eventComments: boolPref(row, 'eventComments', 'comments'),
    discussionComments: boolPref(row, 'discussionComments', 'announcements'),
    staffSupport: row.staffSupport !== false,
    staffReports: row.staffReports !== false,
    directorAlerts: row.directorAlerts !== false,
    directorJoins: row.directorJoins !== false,
    directorLeaves: row.directorLeaves !== false,
    directorModeration: row.directorModeration !== false,
    directorReports: row.directorReports !== false,
    directorTickets: row.directorTickets !== false,
    directorListings: row.directorListings !== false,
    directorMessageRequests: row.directorMessageRequests !== false,
    directorClaimRequests: row.directorClaimRequests !== false,
    nearbyRadiusMiles: Number(row.nearbyRadiusMiles ?? 10),
    followedCategories: Array.isArray(row.followedCategories) ? (row.followedCategories as string[]) : [],
    quietHoursEnabled: row.quietHoursEnabled === true,
    quietHoursStart: typeof row.quietHoursStart === 'string' ? row.quietHoursStart : '22:00',
    quietHoursEnd: typeof row.quietHoursEnd === 'string' ? row.quietHoursEnd : '07:00',
    quietHoursAllowUrgent: row.quietHoursAllowUrgent !== false,
  };
}

export function userAllowsEvent(prefs: NotificationPreferencesRow, eventType: PushEventType): boolean {
  if (!prefs.enabled) return false;
  const key = EVENT_PREF_MAP[eventType];
  if (key === 'enabled') return prefs.enabled;
  if (!key) return true;
  return prefAllows(prefs, key);
}

export function userAllowsDirectorAlert(prefs: NotificationPreferencesRow, category?: string): boolean {
  if (!prefs.enabled || prefs.directorAlerts === false) return false;
  if (!category) return true;

  const key = DIRECTOR_CATEGORY_PREF_MAP[category];
  if (!key) return true;
  return prefs[key] !== false;
}

export async function getStaffInteractionModesForUsers(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length) return map;

  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('users')
    .select('uid, staffInteractionMode, staff_interaction_mode')
    .in('uid', userIds);

  for (const row of data || []) {
    const uid = String((row as { uid: string }).uid);
    const mode =
      (row as { staffInteractionMode?: string; staff_interaction_mode?: string }).staffInteractionMode ??
      (row as { staff_interaction_mode?: string }).staff_interaction_mode;
    map.set(uid, mode === 'neighbor' ? 'neighbor' : 'staff');
  }

  return map;
}

export async function getPreferencesForUsers(userIds: string[]): Promise<Map<string, NotificationPreferencesRow>> {
  const map = new Map<string, NotificationPreferencesRow>();
  if (!userIds.length) return map;

  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('notification_preferences').select('*').in('userId', userIds);
  for (const row of data || []) {
    map.set(String((row as Record<string, unknown>).userId), normalizePrefs(row as Record<string, unknown>));
  }

  for (const uid of userIds) {
    if (!map.has(uid)) {
      map.set(uid, {
        userId: uid,
        enabled: true,
        messages: true,
        messageRequests: true,
        communityChat: true,
        staffChat: true,
        support: true,
        claims: true,
        gifts: true,
        comments: true,
        listingUpvotes: true,
        listingDownvotes: true,
        listingViews: true,
        listingStatus: true,
        nearbyListings: true,
        requests: true,
        appUpdates: true,
        announcements: true,
        pickupReminders: true,
        newListings: true,
        savedItems: true,
        accountUpdates: true,
        feedPosts: true,
        feedComments: true,
        feedReactions: true,
        feedUpvotes: true,
        feedDownvotes: true,
        listingComments: true,
        goGetAlerts: true,
        pickupCoordination: true,
        listingModeration: true,
        listingExpiry: true,
        violations: true,
        claimRequests: true,
        nearbyRequests: true,
        requestFulfilled: true,
        neighborRequests: true,
        feedReplies: true,
        friendRequests: true,
        awards: true,
        eventRsvps: true,
        eventComments: true,
        discussionComments: true,
        staffSupport: true,
        staffReports: true,
        directorAlerts: true,
        directorJoins: true,
        directorLeaves: true,
        directorModeration: true,
        directorReports: true,
        directorTickets: true,
        directorListings: true,
        directorMessageRequests: true,
        directorClaimRequests: true,
        nearbyRadiusMiles: 10,
        followedCategories: [],
      });
    }
  }

  return map;
}

export async function getSubscriptionsForUsers(userIds: string[]): Promise<PushSubscriptionRow[]> {
  if (!userIds.length) return [];
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from('push_subscriptions').select('*').in('userId', userIds);
  if (error) {
    console.error('[push] subscription query failed:', error.message);
    return [];
  }
  return (data || []) as PushSubscriptionRow[];
}

async function removeInvalidSubscription(endpoint: string) {
  const supabaseAdmin = await getSupabaseAdmin();
  await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

function webPushOptionsFor(eventType: PushEventType, payload?: PushPayload): { TTL: number; urgency: 'high' | 'normal' } {
  const priorityFromPayload = payload?.data?.priority;
  const priority =
    priorityFromPayload === 'silent' ||
    priorityFromPayload === 'normal' ||
    priorityFromPayload === 'important' ||
    priorityFromPayload === 'urgent'
      ? priorityFromPayload
      : getEventMetadata(eventType).priority;
  return {
    TTL: 60 * 60 * 24,
    urgency: webPushUrgency(priority),
  };
}

function buildNotificationPayload(payload: PushPayload): string {
  const body = String(payload.body || '').trim() || String(payload.title || '').trim() || 'New activity';
  return JSON.stringify({
    title: payload.title || 'SacramentoBuyNothing',
    body,
    url: payload.url,
    icon: '/notification-icon.png',
    badge: '/notification-icon.png',
    tag: payload.tag || payload.eventType,
    eventType: payload.eventType,
    data: payload.data || {},
  });
}

function shouldRemoveSubscription(err: unknown): boolean {
  const status = (err as { statusCode?: number }).statusCode;
  if (status === 404 || status === 410) return true;
  if (status === 401 || status === 403) {
    const message = String((err as { body?: string }).body || (err as Error).message || '').toLowerCase();
    return message.includes('vapid') || message.includes('credentials') || message.includes('unauthorized');
  }
  return false;
}


export async function sendToSubscription(subscription: PushSubscriptionRow, payload: PushPayload) {
  if (isFcmSubscription(subscription.endpoint)) {
    const result = await sendFcmToSubscription(subscription.endpoint, payload);
    if (result.removed) await removeInvalidSubscription(subscription.endpoint);
    return result;
  }

  if (!(await configureVapidAsync())) return { ok: false as const, removed: false };

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };

  const notification = buildNotificationPayload(payload);

  try {
    const webpush = await getWebPushModuleAsync();
    await webpush.sendNotification(pushSubscription, notification, webPushOptionsFor(payload.eventType, payload));
    return { ok: true as const, removed: false };
  } catch (err: unknown) {
    if (shouldRemoveSubscription(err)) {
      await removeInvalidSubscription(subscription.endpoint);
      return { ok: false as const, removed: true };
    }
    const status = (err as { statusCode?: number }).statusCode;
    console.error('[push] send failed:', status, (err as Error).message);
    return { ok: false as const, removed: false };
  }
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  options?: {
    excludeUserIds?: string[];
    skipPreferenceCheck?: boolean;
    skipDedup?: boolean;
    source?: 'client' | 'webhook' | 'cron' | 'internal';
    actorId?: string;
    entityType?: string;
    entityId?: string;
  },
) {
  const result = await dispatchNotification({
    eventType: payload.eventType,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    data: payload.data,
    recipientUserIds: userIds,
    excludeUserIds: options?.excludeUserIds,
    skipPreferenceCheck: options?.skipPreferenceCheck,
    skipDedup: options?.skipDedup,
    source: options?.source,
    actorId: options?.actorId,
    entityType: options?.entityType,
    entityId: options?.entityId,
  });

  return {
    sent: result.sent,
    failed: result.failed,
    removed: result.removed,
    skipped: result.skipped,
    subscriptionCount: result.subscriptionCount,
    deduped: result.deduped > 0,
    inboxWritten: result.inboxWritten,
  };
}

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  Midtown: { lat: 38.5724, lng: -121.4784 },
  Downtown: { lat: 38.5816, lng: -121.4944 },
  'East Sacramento': { lat: 38.5674, lng: -121.4429 },
  McKinley: { lat: 38.5608, lng: -121.4693 },
  'River Park': { lat: 38.5624, lng: -121.4325 },
  'Oak Park': { lat: 38.5447, lng: -121.4614 },
  'Tahoe Park': { lat: 38.5455, lng: -121.4326 },
  'Colonial Heights': { lat: 38.5324, lng: -121.4472 },
  'Land Park': { lat: 38.5432, lng: -121.4975 },
  'Curtis Park': { lat: 38.5484, lng: -121.4795 },
  'Hollywood Park': { lat: 38.534, lng: -121.492 },
  'South Sacramento': { lat: 38.4952, lng: -121.4468 },
  'North Sacramento': { lat: 38.606, lng: -121.457 },
  Natomas: { lat: 38.6368, lng: -121.5034 },
  Rosemont: { lat: 38.547, lng: -121.41 },
  Carmichael: { lat: 38.6171, lng: -121.3283 },
  'Arden Arcade': { lat: 38.6013, lng: -121.3916 },
  'Del Paso Heights': { lat: 38.625, lng: -121.455 },
  'Citrus Heights': { lat: 38.7071, lng: -121.2811 },
  Greenhaven: { lat: 38.4907, lng: -121.5365 },
  Pocket: { lat: 38.465, lng: -121.505 },
  'South Land Park': { lat: 38.525, lng: -121.51 },
  Antelope: { lat: 38.7082, lng: -121.3299 },
  Auburn: { lat: 38.8966, lng: -121.077 },
  Davis: { lat: 38.5449, lng: -121.7402 },
  'El Dorado Hills': { lat: 38.685, lng: -121.082 },
  'Elk Grove': { lat: 38.4088, lng: -121.3716 },
  'Fair Oaks': { lat: 38.6446, lng: -121.272 },
  Folsom: { lat: 38.6779, lng: -121.176 },
  'Foothill Farms': { lat: 38.678, lng: -121.346 },
  'Old Foothill Farms': { lat: 38.662, lng: -121.362 },
  'La Riviera': { lat: 38.568, lng: -121.366 },
  'North Highlands': { lat: 38.6681, lng: -121.3726 },
  Orangevale: { lat: 38.6785, lng: -121.2254 },
  'Rancho Cordova': { lat: 38.5891, lng: -121.3027 },
  'Rio Linda': { lat: 38.69, lng: -121.4486 },
  Roseville: { lat: 38.7521, lng: -121.288 },
  'West Sacramento': { lat: 38.5805, lng: -121.5302 },
  Woodland: { lat: 38.6785, lng: -121.773 },
};

function coordsForNeighborhood(name: string): { lat: number; lng: number } | null {
  return NEIGHBORHOOD_COORDS[name] || null;
}

export function withinRadius(
  viewerNeighborhood: string,
  itemNeighborhood: string,
  itemLatLng: { lat: number; lng: number } | null,
  radiusMiles: number,
): boolean {
  if (radiusMiles === 0) {
    return viewerNeighborhood === itemNeighborhood;
  }

  const viewerCoords = coordsForNeighborhood(viewerNeighborhood);
  const itemCoords = itemLatLng || coordsForNeighborhood(itemNeighborhood);
  if (!viewerCoords || !itemCoords) {
    return viewerNeighborhood === itemNeighborhood;
  }

  return distanceMiles(viewerCoords, itemCoords) <= radiusMiles;
}
