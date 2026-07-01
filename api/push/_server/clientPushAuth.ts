import type { PushEventType } from './pushDelivery';
import { getSupabaseAdmin } from './supabaseAdmin';
import { getUserRole, isStaffRole, normalizeUserRole } from './staffRoles';
import type { PushSendBody } from './runPushSend';

/** Events that must only be dispatched from webhooks, cron, or trusted server handlers. */
export const WEBHOOK_ONLY_PUSH_EVENTS = new Set<PushEventType>([
  'new_item',
  'new_request',
  'nearby_item',
  'nearby_request',
  'community_chat',
  'director_alert',
  'staff_support',
  'staff_report',
  'listing_expiring',
  'pickup_reminder',
  'support_reply',
  'announcement',
  'app_update',
  'staff_chat',
]);

const TITLE_MAX = 120;
const BODY_MAX = 500;

export function clampPushText(body: PushSendBody): PushSendBody {
  return {
    ...body,
    title: String(body.title || '').slice(0, TITLE_MAX),
    body: String(body.body || '').slice(0, BODY_MAX),
  };
}

async function verifyListingOwner(listingId: string, ownerId: string): Promise<boolean> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('items').select('userId').eq('id', listingId).maybeSingle();
  return String((data as { userId?: string } | null)?.userId || '') === ownerId;
}

async function verifyChatParticipant(chatId: string, userId: string): Promise<string[]> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('chats').select('participantIds').eq('id', chatId).maybeSingle();
  const participants = (data as { participantIds?: string[] } | null)?.participantIds || [];
  return participants.includes(userId) ? participants : [];
}

/**
 * When push is triggered from the public /api/push/send endpoint, never trust
 * recipientUserIds — derive and validate recipients from database state.
 */
export async function validateClientPush(
  callerId: string,
  body: PushSendBody,
): Promise<{ ok: true; recipientUserIds?: string[] } | { ok: false; error: string }> {
  const eventType = body.eventType;

  if (WEBHOOK_ONLY_PUSH_EVENTS.has(eventType)) {
    return { ok: false, error: 'This notification type cannot be sent from the client API' };
  }

  // Client-supplied recipientUserIds are ignored; recipients are derived from database state below.

  switch (eventType) {
    case 'account_update': {
      return { ok: true, recipientUserIds: [callerId] };
    }

    case 'new_message': {
      const chatId = String(body.conversationId || '').trim();
      if (!chatId) return { ok: false, error: 'conversationId is required for new_message' };
      const participants = await verifyChatParticipant(chatId, callerId);
      if (!participants.length) return { ok: false, error: 'Not a participant in this conversation' };
      const recipient = participants.find((id) => id !== callerId);
      if (!recipient) return { ok: false, error: 'No recipient for this conversation' };
      return { ok: true, recipientUserIds: [recipient] };
    }

    case 'message_request': {
      const requestId = String(body.requestId || body.data?.requestId || '').trim();
      if (!requestId) return { ok: false, error: 'requestId is required for message_request' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('message_requests')
        .select('fromUserId, toUserId')
        .eq('id', requestId)
        .maybeSingle();
      if (!data) return { ok: false, error: 'Message request not found' };
      const row = data as { fromUserId?: string; toUserId?: string };
      if (String(row.fromUserId) !== callerId) return { ok: false, error: 'Not the sender of this message request' };
      return { ok: true, recipientUserIds: [String(row.toUserId)] };
    }

    case 'message_request_accepted': {
      const chatId = String(body.conversationId || '').trim();
      if (!chatId) return { ok: false, error: 'conversationId is required' };
      const participants = await verifyChatParticipant(chatId, callerId);
      if (!participants.length) return { ok: false, error: 'Not a participant in this conversation' };
      const requester = participants.find((id) => id !== callerId);
      if (!requester) return { ok: false, error: 'No requester for this conversation' };
      return { ok: true, recipientUserIds: [requester] };
    }

    case 'item_gifted': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data: item } = await supabaseAdmin.from('items').select('userId').eq('id', listingId).maybeSingle();
      const ownerId = String((item as { userId?: string } | null)?.userId || '');
      if (!ownerId || ownerId !== callerId) {
        return { ok: false, error: 'Only the listing owner can send this notification' };
      }
      const { data: claim } = await supabaseAdmin
        .from('item_claims')
        .select('claimerUserId')
        .eq('itemId', listingId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();
      const claimerId = String((claim as { claimerUserId?: string } | null)?.claimerUserId || '');
      const recipients = [ownerId];
      if (claimerId && claimerId !== ownerId) recipients.push(claimerId);
      return { ok: true, recipientUserIds: recipients };
    }

    case 'item_claimed':
    case 'listing_status':
    case 'listing_approved':
    case 'listing_denied':
    case 'listing_upvote':
    case 'listing_downvote': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data: item } = await supabaseAdmin
        .from('items')
        .select('userId')
        .eq('id', listingId)
        .maybeSingle();
      const ownerId = String((item as { userId?: string } | null)?.userId || '');
      if (!ownerId) return { ok: false, error: 'Listing not found' };
      if (eventType === 'item_claimed' || eventType === 'listing_upvote' || eventType === 'listing_downvote') {
        if (ownerId === callerId) return { ok: false, error: 'Invalid notification target' };
      }
      if (eventType === 'listing_status') {
        if (ownerId !== callerId) return { ok: false, error: 'Only the listing owner can send this notification' };
      }
      return { ok: true, recipientUserIds: [ownerId] };
    }

    case 'claim_request': {
      const requestId = String(body.requestId || '').trim();
      const listingId = String(body.listingId || '').trim();
      if (!requestId || !listingId) return { ok: false, error: 'requestId and listingId are required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('item_claim_requests')
        .select('giverUserId, claimerUserId')
        .eq('id', requestId)
        .maybeSingle();
      if (!data) return { ok: false, error: 'Claim request not found' };
      const row = data as { giverUserId?: string; claimerUserId?: string };
      if (String(row.claimerUserId) !== callerId) return { ok: false, error: 'Not the claimer for this request' };
      return { ok: true, recipientUserIds: [String(row.giverUserId)] };
    }

    case 'request_fulfilled': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data: item } = await supabaseAdmin
        .from('items')
        .select('userId, type')
        .eq('id', listingId)
        .maybeSingle();
      if (!item) return { ok: false, error: 'Listing not found' };
      const ownerId = String((item as { userId?: string }).userId || '');
      if (ownerId !== callerId) return { ok: false, error: 'Only the listing owner can send this notification' };
      const { data: claim } = await supabaseAdmin
        .from('item_claims')
        .select('claimerUserId')
        .eq('itemId', listingId)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();
      const claimerId = String((claim as { claimerUserId?: string } | null)?.claimerUserId || '');
      if (!claimerId) return { ok: false, error: 'No claimer found for this listing' };
      return { ok: true, recipientUserIds: [claimerId] };
    }

    case 'pickup_scheduled': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data: chats } = await supabaseAdmin.from('chats').select('participantIds').eq('itemId', listingId);
      const recipientIds = new Set<string>();
      for (const chat of chats || []) {
        for (const uid of (chat as { participantIds?: string[] }).participantIds || []) {
          if (uid && uid !== callerId) recipientIds.add(uid);
        }
      }
      if (!recipientIds.size) {
        const { data: item } = await supabaseAdmin.from('items').select('userId').eq('id', listingId).maybeSingle();
        const ownerId = String((item as { userId?: string } | null)?.userId || '');
        if (ownerId && ownerId !== callerId) recipientIds.add(ownerId);
      }
      if (!recipientIds.size) return { ok: false, error: 'No pickup recipients found' };
      return { ok: true, recipientUserIds: [...recipientIds] };
    }

    case 'new_comment': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      const ownerId = await (async () => {
        const supabaseAdmin = await getSupabaseAdmin();
        const { data } = await supabaseAdmin.from('items').select('userId').eq('id', listingId).maybeSingle();
        return String((data as { userId?: string } | null)?.userId || '');
      })();
      if (!ownerId || ownerId === callerId) return { ok: false, error: 'No listing owner to notify' };
      return { ok: true, recipientUserIds: [ownerId] };
    }

    case 'saved_item_update': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      if (!(await verifyListingOwner(listingId, callerId))) {
        return { ok: false, error: 'Only the listing owner can notify saved-item subscribers' };
      }
      const supabaseAdmin = await getSupabaseAdmin();
      const { data: rows } = await supabaseAdmin.from('saved_items').select('userId').eq('itemId', listingId);
      const userIds = (rows || [])
        .map((row) => String((row as { userId?: string }).userId || ''))
        .filter((uid) => uid && uid !== callerId);
      if (!userIds.length) return { ok: false, error: 'No saved-item subscribers' };
      return { ok: true, recipientUserIds: userIds };
    }

    default:
      return { ok: false, error: 'Unsupported client notification type' };
  }
}

export async function assertStaffOrDirectorForPush(
  callerId: string,
  eventType: PushEventType,
): Promise<string | null> {
  if (eventType === 'app_update') {
    const role = await getUserRole(callerId);
    if (normalizeUserRole(role) !== 'director') return 'Director access required';
    return null;
  }
  if (eventType === 'announcement' || eventType === 'staff_chat' || eventType === 'support_reply') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) return 'Staff access required';
    return null;
  }
  return null;
}
