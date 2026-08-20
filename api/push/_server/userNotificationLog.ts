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
    default:
      return eventType;
  }
}

function notificationId(userId: string, tag: string): string {
  const safeTag = tag.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 160);
  return `un_${userId.slice(0, 8)}_${safeTag}`.slice(0, 200);
}

async function enrichItemTitle(payload: PushPayload): Promise<string> {
  const listingId = payload.data?.listingId || '';
  const existing = payload.data?.itemTitle || '';
  if (!listingId || existing) return existing;

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data } = await supabaseAdmin.from('items').select('title').eq('id', listingId).maybeSingle();
    return String((data as { title?: string } | null)?.title || '');
  } catch {
    return '';
  }
}

/** Log every alert a user is eligible to receive into bell → Notifications. */
export async function logUserNotifications(userIds: string[], payload: PushPayload): Promise<void> {
  if (!userIds.length) return;

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const listingId = payload.data?.listingId || '';
    const itemTitle = (await enrichItemTitle(payload)) || '';
    const actorName = payload.data?.actorName || '';
    const actorUserId = payload.data?.actorUserId || '';
    const tag = payload.tag || `${payload.eventType}-${listingId || payload.data?.conversationId || 'general'}`;

    const rows = userIds.map((userId) => ({
      id: notificationId(userId, tag),
      userId,
      kind: inboxKind(payload.eventType),
      title: payload.title,
      body: payload.body,
      itemId: listingId || null,
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
