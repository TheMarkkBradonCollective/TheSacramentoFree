import { isCommunityChatId, runCommunityChatMessageNotify } from './communityChatNotify';
import { itemCoordsFromDescription } from './itemCoords';
import { runPushSend, type PushSendBody } from './runPushSend';
import { getSupabaseAdmin } from './supabaseAdmin';
import { shouldThrottleVoteNotify } from './voteNotifyCooldown';
import { listingStatusLabel, newListingPushTitle } from '../../../shared/listingStatusLabel';
import {
  isListingExpired,
  isListingInExpiryWarningWindow,
  listingExpiresAtMs,
} from '../../../shared/listingExpiry';

type ItemRow = {
  id?: string;
  userId?: string;
  userDisplayName?: string;
  title?: string;
  neighborhood?: string;
  type?: string;
  status?: string;
  description?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  expiryWarnedAt?: string | null;
};

function listingUrl(itemId: string): string {
  return `/listing/${itemId}`;
}

export function statusLabel(status: string, itemType?: string): string {
  return listingStatusLabel(status, itemType);
}

async function getSavedItemUserIds(itemId: string, excludeUserId?: string): Promise<string[]> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('saved_items').select('userId').eq('itemId', itemId);
  return (data || [])
    .map((row) => String((row as { userId?: string }).userId || ''))
    .filter((uid) => uid && uid !== excludeUserId);
}

async function sendNeighborPush(
  callerId: string,
  payload: PushSendBody,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return runPushSend(callerId, payload);
}

export async function runNeighborNewListingNotify(
  callerId: string,
  item: ItemRow,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const itemId = String(item.id || '');
  const userId = String(item.userId || callerId);
  if (!itemId) {
    return { status: 200, body: { ok: true, skipped: 'missing item id' } };
  }

  const isRequest = item.type === 'looking';
  const eventType = isRequest ? 'new_request' : 'new_item';
  const coords = itemCoordsFromDescription(item.description);
  const displayName = String(item.userDisplayName || 'A neighbor');
  const title = String(item.title || 'New post');

  return sendNeighborPush(userId, {
    eventType,
    title: newListingPushTitle(item.type),
    body: `${displayName}: ${title}`,
    url: listingUrl(itemId),
    listingId: itemId,
    category: String(item.category || ''),
    neighborhood: String(item.neighborhood || ''),
    itemLat: coords?.lat,
    itemLng: coords?.lng,
    excludeUserIds: [userId],
    tag: `${eventType}-${itemId}`,
  });
}

export async function runNeighborClaimRequestNotify(
  callerId: string,
  claim: {
    id?: string;
    itemId?: string;
    claimerUserId?: string;
    claimerName?: string;
    giverUserId?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const claimerUserId = String(claim.claimerUserId || callerId);
  const requestId = String(claim.id || '');
  const itemId = String(claim.itemId || '');
  if (!requestId || !itemId) {
    return { status: 200, body: { ok: true, skipped: 'missing claim request id' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: item } = await supabaseAdmin
    .from('items')
    .select('id, userId, title')
    .eq('id', itemId)
    .maybeSingle();

  if (!item) {
    return { status: 200, body: { ok: true, skipped: 'item not found' } };
  }

  const giverUserId = String((item as { userId?: string }).userId || claim.giverUserId || '');
  const itemTitle = String((item as { title?: string }).title || 'your listing');
  const claimerName = String(claim.claimerName || 'A neighbor');

  return sendNeighborPush(claimerUserId, {
    eventType: 'claim_request',
    title: 'New claim request',
    body: `${claimerName} wants to claim "${itemTitle}"`,
    url: `/requests/${requestId}`,
    listingId: itemId,
    requestId,
    recipientUserIds: [giverUserId],
    tag: `claim-req-${requestId}`,
  });
}

export async function runNeighborMessageRequestNotify(
  callerId: string,
  request: {
    id?: string;
    fromUserId?: string;
    toUserId?: string;
    fromUserName?: string;
    message?: string | null;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const fromUserId = String(request.fromUserId || callerId);
  const requestId = String(request.id || '');
  const toUserId = String(request.toUserId || '');
  if (!requestId || !toUserId) {
    return { status: 200, body: { ok: true, skipped: 'missing message request fields' } };
  }

  const senderName = String(request.fromUserName || 'A neighbor');
  const preview = request.message?.trim();
  const body = preview
    ? `${senderName}: ${preview.slice(0, 120)}`
    : `${senderName} wants to message you`;

  return sendNeighborPush(fromUserId, {
    eventType: 'message_request',
    title: 'New message request',
    body,
    url: '/messages/requests',
    recipientUserIds: [toUserId],
    tag: `dm-req-${requestId}`,
    data: { requestId },
  });
}

export async function runNeighborMessageRequestAcceptedNotify(
  callerId: string,
  request: {
    id?: string;
    fromUserId?: string;
    toUserId?: string;
    fromUserName?: string;
  },
  accepterName?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const toUserId = String(request.toUserId || callerId);
  const requesterUserId = String(request.fromUserId || '');
  if (!requesterUserId) {
    return { status: 200, body: { ok: true, skipped: 'missing requester' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const chatId = [toUserId, requesterUserId].sort().join('_');
  let accepter = accepterName;
  if (!accepter) {
    const { data } = await supabaseAdmin.from('users').select('displayName').eq('uid', toUserId).maybeSingle();
    accepter = String((data as { displayName?: string } | null)?.displayName || 'A neighbor');
  }

  return sendNeighborPush(toUserId, {
    eventType: 'message_request_accepted',
    title: 'Message request accepted',
    body: `${accepter} accepted your message request`,
    url: `/messages/${chatId}`,
    conversationId: chatId,
    recipientUserIds: [requesterUserId],
    tag: `dm-accepted-${chatId}`,
  });
}

export async function runNeighborNewMessageNotify(
  callerId: string,
  message: {
    id?: string;
    chatId?: string;
    senderId?: string;
    text?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const senderId = String(message.senderId || callerId);
  const chatId = String(message.chatId || '');
  const text = String(message.text || '');
  if (!chatId || !text) {
    return { status: 200, body: { ok: true, skipped: 'missing message fields' } };
  }

  if (isCommunityChatId(chatId)) {
    return runCommunityChatMessageNotify(senderId, message);
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: chat } = await supabaseAdmin.from('chats').select('*').eq('id', chatId).maybeSingle();
  if (!chat) {
    return { status: 200, body: { ok: true, skipped: 'chat not found' } };
  }

  const participantIds = (chat as { participantIds?: string[] }).participantIds || [];
  const recipientId = participantIds.find((id) => id !== senderId);
  if (!recipientId) {
    return { status: 200, body: { ok: true, skipped: 'no recipient' } };
  }

  const names = (chat as { participantNames?: Record<string, string> }).participantNames || {};
  const senderName = names[senderId] || 'A neighbor';

  if (text.startsWith('📍 Pickup location')) {
    const itemId = (chat as { itemId?: string }).itemId;
    if (itemId) {
      const { data: item } = await supabaseAdmin.from('items').select('id, title').eq('id', itemId).maybeSingle();
      if (item) {
        const itemTitle = String((item as { title?: string }).title || 'your item');
        const messageId = String(message.id || '');
        return sendNeighborPush(senderId, {
          eventType: 'pickup_scheduled',
          title: 'Pickup scheduled',
          body: `"${itemTitle}" — Check messages for pickup details`,
          url: listingUrl(itemId),
          listingId: itemId,
          recipientUserIds: participantIds.filter((id) => id !== senderId),
          tag: messageId ? `pickup-msg-${messageId}` : `pickup-msg-${itemId}-${Date.now()}`,
        });
      }
    }
  }

  const messageId = String(message.id || '');
  return sendNeighborPush(senderId, {
    eventType: 'new_message',
    title: `Message from ${senderName}`,
    body: text.slice(0, 140),
    url: `/messages/${chatId}`,
    conversationId: chatId,
    recipientUserIds: [recipientId],
    tag: messageId ? `msg-${messageId}` : `msg-${chatId}-${Date.now()}`,
  });
}

export async function runNeighborPickupScheduledNotify(
  callerId: string,
  item: ItemRow,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const itemId = String(item.id || '');
  const actorUserId = String(callerId || item.userId || '');
  if (!itemId) {
    return { status: 200, body: { ok: true, skipped: 'missing item id' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: chats } = await supabaseAdmin.from('chats').select('participantIds').eq('itemId', itemId);
  const recipientIds = new Set<string>();
  for (const chat of chats || []) {
    for (const uid of (chat as { participantIds?: string[] }).participantIds || []) {
      if (uid && uid !== actorUserId) recipientIds.add(uid);
    }
  }

  const ownerId = String(item.userId || '');
  if (!recipientIds.size && ownerId && ownerId !== actorUserId) {
    recipientIds.add(ownerId);
  }
  if (!recipientIds.size) {
    return { status: 200, body: { ok: true, skipped: 'no pickup recipients' } };
  }

  const itemTitle = String(item.title || 'your item');
  return sendNeighborPush(actorUserId, {
    eventType: 'pickup_scheduled',
    title: 'Pickup scheduled',
    body: `"${itemTitle}" — Marked as pending pickup`,
    url: listingUrl(itemId),
    listingId: itemId,
    recipientUserIds: [...recipientIds],
    tag: `pickup-status-${itemId}`,
  });
}

export async function runNeighborItemVoteNotify(
  callerId: string,
  vote: {
    itemId?: string;
    userId?: string;
    voteType?: 'up' | 'down';
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const voterUserId = String(vote.userId || callerId);
  const itemId = String(vote.itemId || '');
  const voteType = vote.voteType;
  if (!itemId || (voteType !== 'up' && voteType !== 'down')) {
    return { status: 200, body: { ok: true, skipped: 'missing vote fields' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: item } = await supabaseAdmin
    .from('items')
    .select('id, userId, title')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) {
    return { status: 200, body: { ok: true, skipped: 'item not found' } };
  }

  const ownerId = String((item as { userId?: string }).userId || '');
  if (!ownerId || ownerId === voterUserId) {
    return { status: 200, body: { ok: true, skipped: 'no vote alert needed' } };
  }

  if (await shouldThrottleVoteNotify(voterUserId)) {
    return { status: 200, body: { ok: true, skipped: 'vote notify cooldown' } };
  }

  const itemTitle = String((item as { title?: string }).title || 'your listing');
  const isUp = voteType === 'up';

  return sendNeighborPush(voterUserId, {
    eventType: isUp ? 'listing_upvote' : 'listing_downvote',
    title: isUp ? 'New upvote on your listing' : 'Feedback on your listing',
    body: `Someone ${isUp ? 'upvoted' : 'downvoted'} "${itemTitle}"`,
    url: listingUrl(itemId),
    listingId: itemId,
    recipientUserIds: [ownerId],
    tag: `vote-${voteType}-${itemId}-${voterUserId}`,
  });
}

export async function runSavedItemsActivityNotify(
  callerId: string,
  params: {
    itemId: string;
    ownerId?: string;
    title: string;
    body: string;
    tag: string;
    excludeUserIds?: string[];
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const itemId = String(params.itemId || '');
  if (!itemId) {
    return { status: 200, body: { ok: true, skipped: 'missing item id' } };
  }

  const exclude = new Set(params.excludeUserIds || []);
  const userIds = (await getSavedItemUserIds(itemId, params.ownerId)).filter((uid) => !exclude.has(uid));
  if (!userIds.length) {
    return { status: 200, body: { ok: true, skipped: 'no saved-item subscribers' } };
  }

  return sendNeighborPush(callerId, {
    eventType: 'saved_item_update',
    title: params.title,
    body: params.body.slice(0, 200),
    url: listingUrl(itemId),
    listingId: itemId,
    recipientUserIds: userIds,
    tag: params.tag,
  });
}

export async function runNeighborNewCommentNotify(
  callerId: string,
  comment: {
    id?: string;
    itemId?: string;
    userId?: string;
    userName?: string;
    text?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const commenterId = String(comment.userId || callerId);
  const itemId = String(comment.itemId || '');
  const commentId = String(comment.id || `comment_${Date.now()}`);
  if (!itemId) {
    return { status: 200, body: { ok: true, skipped: 'missing item id' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: item } = await supabaseAdmin.from('items').select('id, userId, title').eq('id', itemId).maybeSingle();
  if (!item) {
    return { status: 200, body: { ok: true, skipped: 'item not found' } };
  }

  const ownerId = String((item as { userId?: string }).userId || '');
  const commenterName = String(comment.userName || 'A neighbor');
  const preview = String(comment.text || '').trim().slice(0, 120);
  if (!preview) {
    return { status: 200, body: { ok: true, skipped: 'empty comment' } };
  }

  const itemTitle = String((item as { title?: string }).title || 'your listing');
  const results: Array<{ status: number; body: Record<string, unknown> }> = [];

  if (ownerId && ownerId !== commenterId) {
    results.push(
      await sendNeighborPush(commenterId, {
        eventType: 'new_comment',
        title: 'New comment on your listing',
        body: `${commenterName}: ${preview}`,
        url: listingUrl(itemId),
        listingId: itemId,
        recipientUserIds: [ownerId],
        tag: `comment-${commentId}`,
      }),
    );
  }

  const { data: commentRows } = await supabaseAdmin.from('item_comments').select('userId').eq('itemId', itemId);
  const threadIds = [
    ...new Set(
      (commentRows || [])
        .map((row) => String((row as { userId?: string }).userId || ''))
        .filter((id) => id && id !== commenterId && id !== ownerId),
    ),
  ];
  if (threadIds.length) {
    results.push(
      await sendNeighborPush(commenterId, {
        eventType: 'new_comment',
        title: 'New reply on a listing you commented on',
        body: `${commenterName} on "${itemTitle}": ${preview}`,
        url: listingUrl(itemId),
        listingId: itemId,
        recipientUserIds: threadIds,
        tag: `listing-thread-${commentId}`,
      }),
    );
  }

  results.push(
    await runSavedItemsActivityNotify(commenterId, {
      itemId,
      ownerId,
      title: 'New comment on saved item',
      body: `${commenterName} on "${itemTitle}": ${preview}`,
      tag: `saved-comment-${commentId}`,
      excludeUserIds: [ownerId, commenterId],
    }),
  );

  const sent = results.reduce((sum, r) => sum + Number(r.body.sent || 0), 0);
  const skipped = results.every((r) => r.body.skipped);
  return { status: 200, body: { ok: true, skipped: skipped && sent === 0, sent, handlers: results.map((r) => r.body) } };
}

export async function runSavedItemsListingUpdatedNotify(
  callerId: string,
  item: {
    id?: string;
    userId?: string;
    title?: string;
    updatedAt?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const itemId = String(item.id || '');
  const ownerId = String(item.userId || callerId);
  if (!itemId) {
    return { status: 200, body: { ok: true, skipped: 'missing item id' } };
  }

  const itemTitle = String(item.title || 'Saved item');
  const updatedAt = String(item.updatedAt || Date.now());

  return runSavedItemsActivityNotify(ownerId, {
    itemId,
    ownerId,
    title: 'Saved listing updated',
    body: `"${itemTitle}" was edited by the owner`,
    tag: `saved-edit-${itemId}-${updatedAt}`,
    excludeUserIds: [ownerId],
  });
}

export async function runNeighborItemClaimedNotify(
  callerId: string,
  claim: {
    itemId?: string;
    claimerUserId?: string;
    claimerName?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const claimerUserId = String(claim.claimerUserId || callerId);
  const itemId = String(claim.itemId || '');
  if (!itemId) {
    return { status: 200, body: { ok: true, skipped: 'missing item id' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: item } = await supabaseAdmin
    .from('items')
    .select('id, userId, title')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) {
    return { status: 200, body: { ok: true, skipped: 'item not found' } };
  }

  const posterUserId = String((item as { userId?: string }).userId || '');
  const itemTitle = String((item as { title?: string }).title || 'your item');

  let claimerName = String(claim.claimerName || '').trim();
  if (!claimerName && claimerUserId) {
    const { data: claimer } = await supabaseAdmin
      .from('users')
      .select('displayName')
      .eq('uid', claimerUserId)
      .maybeSingle();
    claimerName = String((claimer as { displayName?: string } | null)?.displayName || 'A neighbor');
  }
  if (!claimerName) claimerName = 'A neighbor';

  return sendNeighborPush(claimerUserId, {
    eventType: 'item_claimed',
    title: 'Your item was claimed',
    body: `${claimerName} claimed "${itemTitle}"`,
    url: listingUrl(itemId),
    listingId: itemId,
    recipientUserIds: [posterUserId],
    tag: `claimed-${itemId}`,
  });
}

export async function runListingStatusNotify(
  callerId: string,
  item: ItemRow,
  previousStatus?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const itemId = String(item.id || '');
  const ownerId = String(item.userId || '');
  const status = String(item.status || '');
  if (!itemId || !ownerId || !status) {
    return { status: 200, body: { ok: true, skipped: 'missing item status fields' } };
  }
  if (previousStatus && previousStatus === status) {
    return { status: 200, body: { ok: true, skipped: 'status unchanged' } };
  }

  const itemTitle = String(item.title || 'your listing');
  const label = statusLabel(status, item.type);

  return sendNeighborPush(ownerId, {
    eventType: 'listing_status',
    title: 'Listing status updated',
    body: `"${itemTitle}" — ${label}`,
    url: listingUrl(itemId),
    listingId: itemId,
    recipientUserIds: [ownerId],
    tag: `status-${itemId}-${status}`,
  });
}

export async function runSavedItemsStatusNotify(
  callerId: string,
  item: ItemRow,
  previousStatus?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const itemId = String(item.id || '');
  const ownerId = String(item.userId || '');
  const status = String(item.status || '');
  if (!itemId || !status) {
    return { status: 200, body: { ok: true, skipped: 'missing item fields' } };
  }
  if (previousStatus && previousStatus === status) {
    return { status: 200, body: { ok: true, skipped: 'status unchanged' } };
  }

  const userIds = await getSavedItemUserIds(itemId, ownerId);
  if (!userIds.length) {
    return { status: 200, body: { ok: true, skipped: 'no saved-item subscribers' } };
  }

  const itemTitle = String(item.title || 'Saved item');
  const label = statusLabel(status, item.type);

  return sendNeighborPush(ownerId || callerId, {
    eventType: 'saved_item_update',
    title: 'Saved item update',
    body: `"${itemTitle}" — ${label}`,
    url: listingUrl(itemId),
    listingId: itemId,
    recipientUserIds: userIds,
    tag: `saved-${itemId}-${status}`,
  });
}

export async function runItemCompletedNotify(
  callerId: string,
  item: ItemRow,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const itemId = String(item.id || '');
  const posterUserId = String(item.userId || '');
  if (!itemId || !posterUserId) {
    return { status: 200, body: { ok: true, skipped: 'missing item fields' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: claim } = await supabaseAdmin
    .from('item_claims')
    .select('claimerUserId')
    .eq('itemId', itemId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  const claimerUserId = String((claim as { claimerUserId?: string } | null)?.claimerUserId || '');
  const itemTitle = String(item.title || 'your listing');
  const isRequest = item.type === 'looking';
  const isTrade = item.type === 'trade';

  if (isRequest && claimerUserId) {
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('displayName')
      .eq('uid', posterUserId)
      .maybeSingle();
    const ownerName = String((owner as { displayName?: string } | null)?.displayName || 'A neighbor');

    return sendNeighborPush(posterUserId, {
      eventType: 'request_fulfilled',
      title: 'Request fulfilled',
      body: `${ownerName} marked "${itemTitle}" as fulfilled`,
      url: listingUrl(itemId),
      listingId: itemId,
      recipientUserIds: [claimerUserId],
      tag: `fulfilled-${itemId}`,
    });
  }

  if (isTrade) {
    return sendNeighborPush(posterUserId, {
      eventType: 'listing_status',
      title: 'Listing status updated',
      body: `"${itemTitle}" — marked as traded`,
      url: listingUrl(itemId),
      listingId: itemId,
      recipientUserIds: [posterUserId],
      tag: `status-${itemId}-completed`,
    });
  }

  const recipients = [posterUserId];
  if (claimerUserId && claimerUserId !== posterUserId) recipients.push(claimerUserId);

  return sendNeighborPush(posterUserId, {
    eventType: 'item_gifted',
    title: 'Item gifted successfully',
    body: `"${itemTitle}" has been marked as gifted`,
    url: listingUrl(itemId),
    listingId: itemId,
    recipientUserIds: recipients,
    tag: `gifted-${itemId}`,
  });
}

export async function runListingExpiryCron(): Promise<{ status: number; body: Record<string, unknown> }> {
  const supabaseAdmin = await getSupabaseAdmin();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const { data: activeRows, error } = await supabaseAdmin
    .from('items')
    .select('id, userId, title, type, createdAt, updatedAt, expiresAt, expiryWarnedAt, status')
    .eq('status', 'active');

  if (error) {
    return { status: 500, body: { ok: false, error: error.message } };
  }

  let expiringSent = 0;
  let expiredWithdrawn = 0;

  for (const row of activeRows || []) {
    const item = row as ItemRow;
    const itemId = String(item.id || '');
    const ownerId = String(item.userId || '');
    if (!itemId || !ownerId) continue;

    const title = String(item.title || 'Your listing');

    if (isListingExpired(item, nowMs)) {
      const { error: withdrawError } = await supabaseAdmin
        .from('items')
        .update({ status: 'withdrawn', updatedAt: nowIso })
        .eq('id', itemId)
        .eq('status', 'active');

      if (withdrawError) continue;

      const result = await sendNeighborPush('system', {
        eventType: 'listing_expired',
        title: 'Listing expired',
        body: `"${title}" was withdrawn after 30 days — edit and repost from your profile to relist`,
        url: listingUrl(itemId),
        listingId: itemId,
        recipientUserIds: [ownerId],
        tag: `expired-${itemId}`,
      });
      if (result.status === 200 && !result.body.skipped && !result.body.deduped) expiredWithdrawn += 1;
      continue;
    }

    if (!isListingInExpiryWarningWindow(item, nowMs)) continue;
    if (item.expiryWarnedAt) continue;

    const daysLeft = Math.max(
      1,
      Math.ceil((listingExpiresAtMs(item, nowMs) - nowMs) / (24 * 60 * 60 * 1000)),
    );

    const result = await sendNeighborPush('system', {
      eventType: 'listing_expiring',
      title: 'Listing expiring soon',
      body: `"${title}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — edit it to reset the timer, or mark it gifted`,
      url: listingUrl(itemId),
      listingId: itemId,
      recipientUserIds: [ownerId],
      tag: `expiring-${itemId}`,
    });

    if (result.status === 200 && !result.body.skipped && !result.body.deduped) {
      expiringSent += 1;
      await supabaseAdmin
        .from('items')
        .update({ expiryWarnedAt: nowIso })
        .eq('id', itemId)
        .eq('status', 'active');
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      expiringSent,
      expiredWithdrawn,
      checked: (activeRows || []).length,
    },
  };
}

export async function runPickupReminderCron(): Promise<{ status: number; body: Record<string, unknown> }> {
  const supabaseAdmin = await getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, userId, title, updatedAt, status')
    .eq('status', 'pending_pickup')
    .lte('updatedAt', cutoff);

  let sent = 0;
  for (const row of items || []) {
    const item = row as ItemRow;
    const itemId = String(item.id || '');
    if (!itemId) continue;

    const { data: chats } = await supabaseAdmin.from('chats').select('participantIds').eq('itemId', itemId);
    const recipientIds = new Set<string>();
    for (const chat of chats || []) {
      for (const uid of (chat as { participantIds?: string[] }).participantIds || []) {
        if (uid) recipientIds.add(uid);
      }
    }
    if (!recipientIds.size) {
      const ownerId = String(item.userId || '');
      if (ownerId) recipientIds.add(ownerId);
    }
    if (!recipientIds.size) continue;

    const itemTitle = String(item.title || 'your item');
    const result = await sendNeighborPush('system', {
      eventType: 'pickup_reminder',
      title: 'Pickup reminder',
      body: `Don't forget to pick up "${itemTitle}"`,
      url: listingUrl(itemId),
      listingId: itemId,
      recipientUserIds: [...recipientIds],
      tag: `pickup-reminder-${itemId}`,
    });
    if (result.status === 200 && !result.body.skipped && !result.body.deduped) sent += 1;
  }

  return { status: 200, body: { ok: true, pickupRemindersSent: sent, checked: (items || []).length } };
}
