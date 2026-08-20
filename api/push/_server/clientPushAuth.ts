import type { PushEventType } from './pushDelivery';
import { getSupabaseAdmin } from './supabaseAdmin';
import { getUserRole, isStaffRole, normalizeUserRole, roleRank } from './staffRoles';
import type { PushSendBody } from './runPushSend';

/** Events that cannot be sent from the public client API under any circumstance. */
export const WEBHOOK_ONLY_PUSH_EVENTS = new Set<PushEventType>([
  'nearby_item',
  'nearby_request',
  'staff_support',
  'staff_report',
  'pickup_reminder',
  'support_reply',
  'award_unlocked',
]);

/** Fan-out events: recipients are resolved server-side, never from the client payload. */
export const CLIENT_FAN_OUT_PUSH_EVENTS = new Set<PushEventType>([
  'new_item',
  'new_request',
  'feed_post',
  'community_chat',
  'staff_chat',
  'director_alert',
  'announcement',
  'app_update',
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

async function verifyRecentCommunityMessage(
  chatId: string,
  callerId: string,
  tag?: string,
): Promise<boolean> {
  const supabaseAdmin = await getSupabaseAdmin();
  const messageIdMatch = String(tag || '').match(/^(?:community|staff)-msg-(.+)$/);

  if (messageIdMatch) {
    const { data } = await supabaseAdmin
      .from('messages')
      .select('senderId, chatId')
      .eq('id', messageIdMatch[1])
      .maybeSingle();
    if (!data) return false;
    const row = data as { senderId?: string; chatId?: string };
    return row.senderId === callerId && row.chatId === chatId;
  }

  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('messages')
    .select('id')
    .eq('chatId', chatId)
    .eq('senderId', callerId)
    .gte('createdAt', cutoff)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

async function validateDirectorAlertClient(
  callerId: string,
  body: PushSendBody,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const category = String(body.data?.directorCategory || '').trim();
  const tag = String(body.tag || '').trim();

  if (category === 'moderation') {
    const role = await getUserRole(callerId);
    if (!isStaffRole(role)) return { ok: false, error: 'Staff access required' };
    return { ok: true };
  }

  if (category === 'join') {
    const joinUid = tag.startsWith('director-join-') ? tag.slice('director-join-'.length) : '';
    if (!joinUid || joinUid !== callerId) {
      return { ok: false, error: 'Join alerts can only be sent for your own new account' };
    }
    return { ok: true };
  }

  if (tag.startsWith('director-listing-')) {
    const listingId = tag.slice('director-listing-'.length) || String(body.listingId || '');
    if (!listingId || !(await verifyListingOwner(listingId, callerId))) {
      return { ok: false, error: 'Only the listing owner can send this alert' };
    }
    return { ok: true };
  }

  if (tag.startsWith('director-claim-')) {
    const requestId = tag.slice('director-claim-'.length);
    if (!requestId) return { ok: false, error: 'Invalid claim alert' };
    const supabaseAdmin = await getSupabaseAdmin();
    const { data } = await supabaseAdmin
      .from('item_claim_requests')
      .select('claimerUserId')
      .eq('id', requestId)
      .maybeSingle();
    if (String((data as { claimerUserId?: string } | null)?.claimerUserId || '') !== callerId) {
      return { ok: false, error: 'Not the claimer for this request' };
    }
    return { ok: true };
  }

  if (tag.startsWith('director-dmreq-')) {
    const requestId = tag.slice('director-dmreq-'.length);
    if (!requestId) return { ok: false, error: 'Invalid message request alert' };
    const supabaseAdmin = await getSupabaseAdmin();
    const { data } = await supabaseAdmin
      .from('message_requests')
      .select('fromUserId')
      .eq('id', requestId)
      .maybeSingle();
    if (String((data as { fromUserId?: string } | null)?.fromUserId || '') !== callerId) {
      return { ok: false, error: 'Not the sender of this message request' };
    }
    return { ok: true };
  }

  return { ok: true };
}

async function resolveGoGetSessionRecipient(
  callerId: string,
  body: PushSendBody,
): Promise<{ ok: true; recipientUserIds: string[] } | { ok: false; error: string }> {
  const sessionId = String(body.data?.goGetSessionId || '').trim();
  const listingId = String(body.listingId || '').trim();
  if (!sessionId) return { ok: false, error: 'goGetSessionId is required' };
  if (!listingId) return { ok: false, error: 'listingId is required' };

  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('go_get_sessions')
    .select('requesterUserId, fulfillerUserId, itemId')
    .eq('id', sessionId)
    .maybeSingle();
  if (!data) return { ok: false, error: 'Go Get session not found' };
  const row = data as { requesterUserId?: string; fulfillerUserId?: string; itemId?: string };
  if (String(row.itemId || '') !== listingId) {
    return { ok: false, error: 'Listing mismatch for Go Get session' };
  }
  const requesterId = String(row.requesterUserId || '');
  const fulfillerId = String(row.fulfillerUserId || '');
  if (callerId !== requesterId && callerId !== fulfillerId) {
    return { ok: false, error: 'Not a participant in this Go Get session' };
  }
  const recipient = callerId === requesterId ? fulfillerId : requesterId;
  if (!recipient) return { ok: false, error: 'No Go Get recipient' };
  return { ok: true, recipientUserIds: [recipient] };
}

async function validateStaffAccountNotify(
  callerId: string,
  recipientUserId: string,
): Promise<{ ok: true; recipientUserIds: string[] } | { ok: false; error: string }> {
  const role = await getUserRole(callerId);
  if (roleRank(role) < roleRank('city_administrator')) {
    return { ok: false, error: 'City administrator access required' };
  }
  if (!recipientUserId) return { ok: false, error: 'recipient is required' };
  return { ok: true, recipientUserIds: [recipientUserId] };
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
    case 'new_item':
    case 'new_request': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      if (!(await verifyListingOwner(listingId, callerId))) {
        return { ok: false, error: 'Only the listing owner can notify neighbors' };
      }
      return { ok: true };
    }

    case 'community_chat': {
      const chatId = String(body.conversationId || '').trim();
      if (chatId !== 'community-global') return { ok: false, error: 'Invalid community chat' };
      if (!(await verifyRecentCommunityMessage(chatId, callerId, body.tag))) {
        return { ok: false, error: 'No recent community message from you' };
      }
      return { ok: true };
    }

    case 'staff_chat': {
      const chatId = String(body.conversationId || '').trim();
      if (chatId !== 'community-staff') return { ok: false, error: 'Invalid staff chat' };
      const role = await getUserRole(callerId);
      if (!isStaffRole(role)) return { ok: false, error: 'Staff access required' };
      if (!(await verifyRecentCommunityMessage(chatId, callerId, body.tag))) {
        return { ok: false, error: 'No recent staff chat message from you' };
      }
      return { ok: true };
    }

    case 'director_alert': {
      const check = await validateDirectorAlertClient(callerId, body);
      if (!check.ok) return check;
      return { ok: true };
    }

    case 'announcement': {
      const role = await getUserRole(callerId);
      if (!isStaffRole(role)) return { ok: false, error: 'Staff access required' };
      return { ok: true };
    }

    case 'app_update': {
      const role = await getUserRole(callerId);
      if (normalizeUserRole(role) !== 'director') return { ok: false, error: 'Director access required' };
      return { ok: true };
    }

    case 'listing_expiring':
    case 'listing_expired': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      if (!(await verifyListingOwner(listingId, callerId))) {
        return { ok: false, error: 'Only the listing owner can receive expiry reminders' };
      }
      return { ok: true, recipientUserIds: [callerId] };
    }

    case 'account_update': {
      const requested = Array.isArray(body.recipientUserIds)
        ? String(body.recipientUserIds[0] || '').trim()
        : '';
      if (!requested || requested === callerId) {
        return { ok: true, recipientUserIds: [callerId] };
      }

      const callerRole = await getUserRole(callerId);
      if (roleRank(callerRole) < roleRank('city_administrator')) {
        return { ok: false, error: 'Not allowed to notify another account' };
      }

      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('staff_applications')
        .select('id, applicantUserId, reviewedByUserId, status')
        .eq('applicantUserId', requested)
        .eq('reviewedByUserId', callerId)
        .in('status', ['yes', 'no', 'maybe'])
        .order('reviewedAt', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) {
        return { ok: false, error: 'No matching staff application review' };
      }
      return { ok: true, recipientUserIds: [requested] };
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

    case 'on_the_way':
    case 'contactless_pickup_arrived':
    case 'contactless_pickup_left': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data: item } = await supabaseAdmin.from('items').select('userId').eq('id', listingId).maybeSingle();
      const ownerId = String((item as { userId?: string } | null)?.userId || '');
      if (!ownerId) return { ok: false, error: 'Listing not found' };
      if (ownerId === callerId) return { ok: false, error: 'Cannot notify yourself' };
      return { ok: true, recipientUserIds: [ownerId] };
    }

    case 'go_get_availability_request':
    case 'go_get_available_now':
    case 'go_get_schedule_proposed':
    case 'go_get_schedule_confirmed':
    case 'go_get_ready_reminder':
    case 'go_get_fulfiller_ready':
    case 'go_get_started':
    case 'go_get_arrived':
    case 'go_get_completed':
    case 'go_get_cancelled':
      return resolveGoGetSessionRecipient(callerId, body);

    case 'violation_filed': {
      const violationId =
        String(body.tag || '')
          .replace(/^violation-filed-/, '')
          .trim() || String(body.data?.violationId || '').trim();
      if (!violationId) return { ok: false, error: 'violationId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('user_violations')
        .select('userId, reportedByUserId')
        .eq('id', violationId)
        .maybeSingle();
      if (!data) return { ok: false, error: 'Violation not found' };
      const row = data as { userId?: string; reportedByUserId?: string };
      if (String(row.reportedByUserId || '') !== callerId) {
        return { ok: false, error: 'Not the reporter for this violation' };
      }
      return { ok: true, recipientUserIds: [String(row.userId || '')] };
    }

    case 'violation_decision':
    case 'appeal_decision': {
      const violationId =
        String(body.tag || '')
          .replace(/^violation-decision-/, '')
          .replace(/^appeal-decision-/, '')
          .trim() || String(body.data?.violationId || '').trim();
      if (!violationId) return { ok: false, error: 'violationId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin.from('user_violations').select('userId').eq('id', violationId).maybeSingle();
      const userId = String((data as { userId?: string } | null)?.userId || '');
      if (!userId) return { ok: false, error: 'Violation not found' };
      return validateStaffAccountNotify(callerId, userId);
    }

    case 'account_locked': {
      const userId =
        String(body.tag || '')
          .replace(/^account-locked-/, '')
          .trim() || String(body.recipientUserIds?.[0] || '').trim();
      return validateStaffAccountNotify(callerId, userId);
    }

    case 'new_comment': {
      const listingId = String(body.listingId || '').trim();
      if (!listingId) return { ok: false, error: 'listingId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin.from('items').select('userId').eq('id', listingId).maybeSingle();
      const ownerId = String((data as { userId?: string } | null)?.userId || '');
      const requested = body.recipientUserIds?.filter(Boolean) || [];
      const allowed = new Set<string>();
      if (ownerId && ownerId !== callerId) allowed.add(ownerId);
      const { data: commentRows } = await supabaseAdmin.from('item_comments').select('userId').eq('itemId', listingId);
      for (const row of commentRows || []) {
        const uid = String((row as { userId?: string }).userId || '');
        if (uid && uid !== callerId) allowed.add(uid);
      }
      if (requested.length) {
        const valid = requested.filter((uid) => allowed.has(uid));
        if (!valid.length) return { ok: false, error: 'Invalid comment recipients' };
        return { ok: true, recipientUserIds: valid };
      }
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

    case 'feed_comment':
    case 'feed_reply':
    case 'feed_reaction':
    case 'feed_upvote':
    case 'feed_downvote': {
      const postId = String(body.data?.feedPostId || '').trim();
      if (!postId) return { ok: false, error: 'feedPostId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin.from('feed_posts').select('userId').eq('id', postId).maybeSingle();
      const ownerId = String((data as { userId?: string } | null)?.userId || '');
      if (eventType === 'feed_upvote' || eventType === 'feed_downvote' || eventType === 'feed_reaction') {
        if (!ownerId || ownerId === callerId) return { ok: false, error: 'No feed post owner to notify' };
        return { ok: true, recipientUserIds: [ownerId] };
      }

      const requested = body.recipientUserIds?.filter(Boolean) || [];
      const allowed = new Set<string>();
      if (ownerId && ownerId !== callerId) allowed.add(ownerId);

      const parentCommentId = String(body.data?.parentCommentId || '').trim();
      if (parentCommentId) {
        const { data: parent } = await supabaseAdmin
          .from('feed_post_comments')
          .select('userId')
          .eq('id', parentCommentId)
          .maybeSingle();
        const parentAuthorId = String((parent as { userId?: string } | null)?.userId || '');
        if (parentAuthorId && parentAuthorId !== callerId) allowed.add(parentAuthorId);
      }

      if (requested.length) {
        const valid = requested.filter((uid) => allowed.has(uid));
        if (!valid.length) return { ok: false, error: 'Invalid feed comment recipients' };
        return { ok: true, recipientUserIds: valid };
      }

      if (!ownerId || ownerId === callerId) return { ok: false, error: 'No feed post owner to notify' };
      return { ok: true, recipientUserIds: [ownerId] };
    }

    case 'feed_post': {
      const postId = String(body.data?.feedPostId || '').trim();
      if (!postId) return { ok: false, error: 'feedPostId is required' };
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin.from('feed_posts').select('userId').eq('id', postId).maybeSingle();
      const ownerId = String((data as { userId?: string } | null)?.userId || '');
      if (!ownerId || ownerId !== callerId) {
        return { ok: false, error: 'Only the feed post author can broadcast this alert' };
      }
      return { ok: true };
    }

    case 'friend_request': {
      const toUserId = body.recipientUserIds?.[0] || '';
      if (!toUserId || toUserId === callerId) return { ok: false, error: 'Invalid friend request recipient' };
      return { ok: true, recipientUserIds: [toUserId] };
    }

    case 'friend_request_accepted': {
      const fromUserId = body.recipientUserIds?.[0] || '';
      if (!fromUserId || fromUserId === callerId) return { ok: false, error: 'Invalid friend-accept recipient' };
      return { ok: true, recipientUserIds: [fromUserId] };
    }

    case 'event_rsvp':
    case 'event_comment': {
      const eventId = String(body.data?.eventId || '').trim();
      const requested = (body.recipientUserIds || []).filter(Boolean);
      if (!eventId || !requested.length || requested.includes(callerId)) {
        return { ok: false, error: 'Invalid event notification' };
      }
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin.from('community_events').select('userId').eq('id', eventId).maybeSingle();
      const hostId = String((data as { userId?: string } | null)?.userId || '');
      const allowed = new Set<string>();
      if (hostId && hostId !== callerId) allowed.add(hostId);
      if (eventType === 'event_comment') {
        const [{ data: rsvpRows }, { data: commentRows }] = await Promise.all([
          supabaseAdmin.from('event_rsvps').select('userId, rsvpStatus').eq('eventId', eventId),
          supabaseAdmin.from('event_comments').select('userId').eq('eventId', eventId),
        ]);
        for (const row of rsvpRows || []) {
          const status = String((row as { rsvpStatus?: string }).rsvpStatus || '');
          const uid = String((row as { userId?: string }).userId || '');
          if (uid && uid !== callerId && (status === 'going' || status === 'maybe')) allowed.add(uid);
        }
        for (const row of commentRows || []) {
          const uid = String((row as { userId?: string }).userId || '');
          if (uid && uid !== callerId) allowed.add(uid);
        }
      }
      const valid = requested.filter((uid) => allowed.has(uid));
      if (!valid.length) return { ok: false, error: 'Event recipient mismatch' };
      return { ok: true, recipientUserIds: valid };
    }

    case 'announcement_comment': {
      const announcementId = String(body.data?.announcementId || '').trim();
      const requested = (body.recipientUserIds || []).filter(Boolean);
      if (!announcementId || !requested.length || requested.includes(callerId)) {
        return { ok: false, error: 'Invalid announcement comment notification' };
      }
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('help_announcements')
        .select('postedByUserId')
        .eq('id', announcementId)
        .maybeSingle();
      const ownerId = String((data as { postedByUserId?: string } | null)?.postedByUserId || '');
      const allowed = new Set<string>();
      if (ownerId && ownerId !== callerId) allowed.add(ownerId);
      const { data: commentRows } = await supabaseAdmin
        .from('help_announcement_comments')
        .select('userId')
        .eq('announcementId', announcementId);
      for (const row of commentRows || []) {
        const uid = String((row as { userId?: string }).userId || '');
        if (uid && uid !== callerId) allowed.add(uid);
      }
      const valid = requested.filter((uid) => allowed.has(uid));
      if (!valid.length) return { ok: false, error: 'Announcement comment recipient mismatch' };
      return { ok: true, recipientUserIds: valid };
    }

    case 'update_comment': {
      const updateId = String(body.data?.updateId || '').trim();
      const requested = (body.recipientUserIds || []).filter(Boolean);
      if (!updateId || !requested.length || requested.includes(callerId)) {
        return { ok: false, error: 'Invalid update comment notification' };
      }
      const supabaseAdmin = await getSupabaseAdmin();
      const { data } = await supabaseAdmin
        .from('app_updates')
        .select('postedByUserId')
        .eq('id', updateId)
        .maybeSingle();
      const ownerId = String((data as { postedByUserId?: string } | null)?.postedByUserId || '');
      const allowed = new Set<string>();
      if (ownerId && ownerId !== callerId) allowed.add(ownerId);
      const { data: commentRows } = await supabaseAdmin
        .from('app_update_comments')
        .select('userId')
        .eq('updateId', updateId);
      for (const row of commentRows || []) {
        const uid = String((row as { userId?: string }).userId || '');
        if (uid && uid !== callerId) allowed.add(uid);
      }
      const valid = requested.filter((uid) => allowed.has(uid));
      if (!valid.length) return { ok: false, error: 'Update comment recipient mismatch' };
      return { ok: true, recipientUserIds: valid };
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
