import { getSupabaseAdmin } from './supabaseAdmin';
import type { PushEventType, PushPayload } from './pushDelivery';

/** Map push event types to inbox kind labels (stored in user_notifications.kind). */
function inboxKind(eventType: PushEventType): string {
  switch (eventType) {
    case 'new_comment':
      return 'comment';
    case 'listing_upvote':
      return 'upvote';
    case 'listing_downvote':
      return 'downvote';
    case 'item_claimed':
      return 'claim';
    case 'item_gifted':
      return 'gift';
    case 'claim_request':
      return 'claim_request';
    case 'listing_status':
    case 'listing_expiring':
    case 'listing_expired':
    case 'listing_approved':
    case 'listing_denied':
    case 'request_fulfilled':
      return 'listing_status';
    case 'pickup_scheduled':
    case 'pickup_reminder':
      return 'pickup_reminder';
    case 'on_the_way':
      return 'on_the_way';
    case 'new_message':
      return 'message';
    case 'message_request':
    case 'message_request_accepted':
      return 'message_request';
    case 'community_chat':
      return 'community_chat';
    case 'staff_chat':
      return 'staff_chat';
    case 'support_reply':
      return 'support';
    case 'new_item':
      return 'new_listing';
    case 'nearby_item':
      return 'nearby_listing';
    case 'new_request':
      return 'new_request';
    case 'nearby_request':
      return 'nearby_request';
    case 'saved_item_update':
      return 'saved_item';
    case 'announcement':
      return 'announcement';
    case 'app_update':
      return 'app_update';
    case 'account_update':
      return 'account_update';
    case 'staff_support':
      return 'staff_support';
    case 'staff_report':
      return 'staff_report';
    case 'director_alert':
      return 'director_alert';
    case 'feed_comment':
      return 'feed_comment';
    case 'feed_reaction':
      return 'feed_reaction';
    case 'feed_upvote':
      return 'feed_upvote';
    case 'feed_downvote':
      return 'feed_downvote';
    case 'feed_post':
      return 'feed_post';
    case 'feed_reply':
      return 'feed_reply';
    case 'friend_request':
    case 'friend_request_accepted':
      return eventType;
    case 'award_unlocked':
      return 'award_unlocked';
    case 'event_rsvp':
      return 'event_rsvp';
    case 'event_comment':
      return 'event_comment';
    case 'announcement_comment':
      return 'announcement_comment';
    case 'update_comment':
      return 'update_comment';
    default:
      return eventType;
  }
}

function notificationId(userId: string, tag: string): string {
  const safeTag = tag.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 160);
  return `un_${userId.slice(0, 8)}_${safeTag}`.slice(0, 200);
}

const FEED_INBOX_KINDS = new Set([
  'feed_comment',
  'feed_reaction',
  'feed_upvote',
  'feed_downvote',
  'feed_post',
  'feed_reply',
]);

function isFeedInboxEvent(eventType: PushEventType): boolean {
  return FEED_INBOX_KINDS.has(eventType);
}

async function enrichContextTitle(payload: PushPayload): Promise<string> {
  const existing = payload.data?.itemTitle || '';
  if (existing) return existing;

  const feedPostId = payload.data?.feedPostId || '';
  if (feedPostId) {
    try {
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('feed_posts')
        .select('text')
        .eq('id', feedPostId)
        .maybeSingle();
      const text = String((data as { text?: string } | null)?.text || '').trim();
      if (!text) return 'Feed post';
      return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    } catch {
      return '';
    }
  }

  const listingId = payload.data?.listingId || '';
  if (!listingId) return '';

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data } = await supabaseAdmin.from('items').select('title').eq('id', listingId).maybeSingle();
    return String((data as { title?: string } | null)?.title || '');
  } catch {
    return '';
  }
}

function inboxItemId(payload: PushPayload): string | null {
  const feedPostId = payload.data?.feedPostId || '';
  if (feedPostId) return feedPostId;
  if (isFeedInboxEvent(payload.eventType)) return null;
  const eventId = payload.data?.eventId || '';
  if (eventId) return eventId;
  const announcementId = payload.data?.announcementId || '';
  if (announcementId) return announcementId;
  const updateId = payload.data?.updateId || '';
  if (updateId) return updateId;
  const profileUserId = payload.data?.profileUserId || '';
  if (profileUserId) return profileUserId;
  const listingId = payload.data?.listingId || '';
  return listingId || null;
}

/** Log every alert a user is eligible to receive into bell → Notifications. */
export async function logUserNotifications(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const itemId = inboxItemId(payload);
    const itemTitle = (await enrichContextTitle(payload)) || '';
    const actorName = payload.data?.actorName || '';
    const actorUserId = payload.data?.actorUserId || '';
    const tag =
      payload.tag ||
      `${payload.eventType}-${itemId || payload.data?.conversationId || payload.data?.requestId || 'general'}`;

    const rows = userIds.map((userId) => ({
      id: notificationId(userId, tag),
      userId,
      kind: inboxKind(payload.eventType),
      title: payload.title,
      body: payload.body,
      itemId,
      itemTitle: itemTitle || null,
      actorUserId: actorUserId || null,
      actorName: actorName || null,
      eventType: payload.eventType,
      tag,
      url: payload.url,
    }));

    const { error } = await supabaseAdmin.from('user_notifications').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: true,
    });

    if (error && error.code !== '42P01') {
      console.error('[notifications] inbox log failed:', error.message);
    }
  } catch (err) {
    console.error('[notifications] inbox log error:', err);
  }
}
