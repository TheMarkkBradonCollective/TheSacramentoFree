import { getSupabaseAdmin } from './supabaseAdmin';
import { configureVapidAsync, getWebPushModuleAsync } from './webPushLoader';

export type PushEventType =
  | 'new_item'
  | 'new_request'
  | 'item_claimed'
  | 'item_gifted'
  | 'pickup_scheduled'
  | 'pickup_reminder'
  | 'new_message'
  | 'message_request'
  | 'message_request_accepted'
  | 'new_comment'
  | 'listing_upvote'
  | 'listing_downvote'
  | 'listing_approved'
  | 'listing_denied'
  | 'listing_expiring'
  | 'nearby_item'
  | 'nearby_request'
  | 'claim_request'
  | 'request_fulfilled'
  | 'announcement'
  | 'account_update'
  | 'support_reply'
  | 'staff_support'
  | 'staff_report'
  | 'director_alert'
  | 'saved_item_update'
  | 'listing_status';

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
  support: boolean;
  claims: boolean;
  gifts: boolean;
  comments: boolean;
  listingUpvotes: boolean;
  listingDownvotes: boolean;
  listingStatus: boolean;
  nearbyListings: boolean;
  requests: boolean;
  announcements: boolean;
  pickupReminders: boolean;
  newListings: boolean;
  savedItems: boolean;
  accountUpdates: boolean;
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
  new_request: 'requests',
  item_claimed: 'claims',
  item_gifted: 'gifts',
  pickup_scheduled: 'pickupReminders',
  pickup_reminder: 'pickupReminders',
  new_message: 'messages',
  message_request: 'messageRequests',
  message_request_accepted: 'messageRequests',
  new_comment: 'comments',
  listing_upvote: 'listingUpvotes',
  listing_downvote: 'listingDownvotes',
  listing_approved: 'listingStatus',
  listing_denied: 'listingStatus',
  listing_expiring: 'listingStatus',
  listing_status: 'listingStatus',
  nearby_item: 'nearbyListings',
  nearby_request: 'requests',
  claim_request: 'requests',
  request_fulfilled: 'requests',
  announcement: 'announcements',
  account_update: 'accountUpdates',
  support_reply: 'support',
  staff_support: 'staffSupport',
  staff_report: 'staffReports',
  director_alert: 'directorAlerts',
  saved_item_update: 'savedItems',
};

function normalizePrefs(row: Record<string, unknown>): NotificationPreferencesRow {
  return {
    userId: String(row.userId),
    enabled: row.enabled !== false,
    messages: row.messages !== false,
    messageRequests: row.messageRequests !== false,
    support: row.support !== false,
    claims: row.claims !== false,
    gifts: row.gifts !== false,
    comments: row.comments !== false,
    listingUpvotes: row.listingUpvotes !== false,
    listingDownvotes: row.listingDownvotes !== false,
    listingStatus: row.listingStatus !== false,
    nearbyListings: row.nearbyListings !== false,
    requests: row.requests !== false,
    announcements: row.announcements !== false,
    pickupReminders: row.pickupReminders !== false,
    newListings: row.newListings !== false,
    savedItems: row.savedItems !== false,
    accountUpdates: row.accountUpdates !== false,
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
  };
}

export function userAllowsEvent(prefs: NotificationPreferencesRow, eventType: PushEventType): boolean {
  if (!prefs.enabled) return false;
  const key = EVENT_PREF_MAP[eventType];
  if (key === 'enabled') return prefs.enabled;
  return Boolean(prefs[key]);
}

export function userAllowsDirectorAlert(prefs: NotificationPreferencesRow, category?: string): boolean {
  if (!prefs.enabled || prefs.directorAlerts === false) return false;
  if (!category) return true;

  const key = DIRECTOR_CATEGORY_PREF_MAP[category];
  if (!key) return true;
  return prefs[key] !== false;
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
        support: true,
        claims: true,
        gifts: true,
        comments: true,
        listingUpvotes: true,
        listingDownvotes: true,
        listingStatus: true,
        nearbyListings: true,
        requests: true,
        announcements: true,
        pickupReminders: true,
        newListings: true,
        savedItems: true,
        accountUpdates: true,
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

const HIGH_URGENCY_EVENTS = new Set<PushEventType>([
  'director_alert',
  'staff_support',
  'staff_report',
  'support_reply',
  'new_message',
  'message_request',
  'message_request_accepted',
  'item_claimed',
  'claim_request',
  'account_update',
]);

function webPushOptionsFor(eventType: PushEventType): { TTL: number; urgency: 'high' | 'normal' } {
  return {
    TTL: 60 * 60 * 24,
    urgency: HIGH_URGENCY_EVENTS.has(eventType) ? 'high' : 'normal',
  };
}

function buildNotificationPayload(payload: PushPayload): string {
  const body = String(payload.body || '').trim() || String(payload.title || '').trim() || 'New activity';
  return JSON.stringify({
    title: payload.title || 'Sacramento Buy Nothing',
    body,
    url: payload.url,
    icon: '/icon.svg',
    badge: '/icon.svg',
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
  if (!(await configureVapidAsync())) return { ok: false as const, removed: false };

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };

  const notification = buildNotificationPayload(payload);

  try {
    const webpush = await getWebPushModuleAsync();
    await webpush.sendNotification(pushSubscription, notification, webPushOptionsFor(payload.eventType));
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
  options?: { excludeUserIds?: string[]; skipPreferenceCheck?: boolean; skipDedup?: boolean },
) {
  const exclude = new Set(options?.excludeUserIds || []);
  const targets = [...new Set(userIds)].filter((id) => id && !exclude.has(id));
  if (!targets.length || !(await configureVapidAsync())) {
    return { sent: 0, failed: 0, removed: 0, skipped: targets.length, subscriptionCount: 0 };
  }

  if (!options?.skipDedup) {
    const { claimPushDispatch } = await import('./pushDedup');
    const tag = payload.tag || payload.eventType;
    const allowed = await claimPushDispatch(tag);
    if (!allowed) {
      return { sent: 0, failed: 0, removed: 0, skipped: targets.length, subscriptionCount: 0, deduped: true };
    }
  }

  let allowed = targets;
  if (!options?.skipPreferenceCheck) {
    const prefsMap = await getPreferencesForUsers(targets);
    allowed = targets.filter((uid) => {
      const prefs = prefsMap.get(uid);
      if (!prefs) return false;
      if (payload.eventType === 'director_alert') {
        return userAllowsDirectorAlert(prefs, payload.data?.directorCategory);
      }
      return userAllowsEvent(prefs, payload.eventType);
    });
  }

  const subscriptions = await getSubscriptionsForUsers(allowed);
  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendToSubscription(sub, payload);
      if (result.ok) sent += 1;
      else {
        failed += 1;
        if (result.removed) removed += 1;
      }
    }),
  );

  return {
    sent,
    failed,
    removed,
    skipped: options?.skipPreferenceCheck ? 0 : targets.length - allowed.length,
    subscriptionCount: subscriptions.length,
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
