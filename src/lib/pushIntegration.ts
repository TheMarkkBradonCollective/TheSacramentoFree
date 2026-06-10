import { supabase } from '../supabase';
import type { DirectorAlertCategory, ItemPost } from '../types';
import {
  notifyAccountUpdate,
  notifyCommunityAnnouncement,
  notifyItemClaimed,
  notifyItemGifted,
  notifyListingExpiringSoon,
  notifyNewComment,
  notifyNewListingPosted,
  notifyMessageRequest,
  notifyMessageRequestAccepted,
  notifyNewMessage,
  notifyPickupScheduled,
  notifyClaimRequestSubmitted,
  notifyListingStatus,
  notifyRequestFulfilled,
  notifyDirectorAlert,
} from './pushEvents';

export async function pushDirectorAlert(params: {
  category: DirectorAlertCategory;
  title: string;
  body: string;
  tag?: string;
  excludeUserIds?: string[];
}) {
  await notifyDirectorAlert(params);
}

async function getItemById(itemId: string): Promise<ItemPost | null> {
  const { data } = await supabase.from('items').select('*').eq('id', itemId).maybeSingle();
  if (!data) return null;
  return data as ItemPost;
}

export async function pushAfterItemCreated(item: ItemPost) {
  await notifyNewListingPosted(item);
  await pushDirectorAlert({
    category: 'listing',
    title: item.type === 'looking' ? 'New neighbor request' : 'New listing posted',
    body: `${item.userDisplayName}: ${item.title} (${item.neighborhood})`,
    tag: `director-listing-${item.id}`,
    excludeUserIds: [item.userId],
  });
}

export async function pushAfterClaimRequest(params: {
  item: ItemPost;
  claimerName: string;
  requestId: string;
}) {
  await notifyClaimRequestSubmitted(params);
  await pushDirectorAlert({
    category: 'claim_request',
    title: 'Claim request',
    body: `${params.claimerName} requested pickup: ${params.item.title}`,
    tag: `director-claim-${params.requestId}`,
    excludeUserIds: [params.item.userId],
  });
}

async function getUserDisplayName(userId: string): Promise<string> {
  const { data } = await supabase.from('users').select('displayName').eq('uid', userId).maybeSingle();
  return String((data as { displayName?: string } | null)?.displayName || 'A neighbor');
}

export async function pushAfterClaimConfirmed(params: {
  itemId: string;
  itemTitle: string;
  posterUserId: string;
  claimerUserId: string;
  claimerName?: string;
}) {
  const item = (await getItemById(params.itemId)) || ({
    id: params.itemId,
    title: params.itemTitle,
    userId: params.posterUserId,
  } as ItemPost);

  const claimerName = params.claimerName || (await getUserDisplayName(params.claimerUserId));

  await notifyItemClaimed({
    item,
    posterUserId: params.posterUserId,
    claimerName,
  });
}

export async function pushAfterItemCompleted(itemId: string, posterUserId: string, claimerUserId: string) {
  const item = await getItemById(itemId);
  if (!item) return;

  if (item.type === 'looking') {
    const ownerName = await getUserDisplayName(posterUserId);
    await notifyRequestFulfilled({
      item,
      helperUserId: claimerUserId,
      ownerName,
    });
    return;
  }

  await notifyItemGifted({ item, posterUserId, claimerUserId });
}

export async function pushAfterMessageRequest(params: {
  requestId: string;
  toUserId: string;
  fromUserName: string;
  message?: string | null;
  fromUserId?: string;
}) {
  await notifyMessageRequest({
    requestId: params.requestId,
    recipientUserId: params.toUserId,
    senderName: params.fromUserName,
    preview: params.message,
  });
  await pushDirectorAlert({
    category: 'message_request',
    title: 'Message request',
    body: `${params.fromUserName} asked to start a chat`,
    tag: `director-dmreq-${params.requestId}`,
    excludeUserIds: params.fromUserId ? [params.fromUserId] : undefined,
  });
}

export async function pushAfterMessageRequestAccepted(params: {
  chatId: string;
  requesterUserId: string;
  accepterName: string;
}) {
  await notifyMessageRequestAccepted({
    chatId: params.chatId,
    recipientUserId: params.requesterUserId,
    accepterName: params.accepterName,
  });
}

export async function pushAfterMessage(chatId: string, senderId: string, text: string) {
  const { data: chat } = await supabase.from('chats').select('*').eq('id', chatId).maybeSingle();
  if (!chat) return;

  const participantIds = (chat as { participantIds?: string[] }).participantIds || [];
  const recipientId = participantIds.find((id) => id !== senderId);
  if (!recipientId) return;

  const names = (chat as { participantNames?: Record<string, string> }).participantNames || {};
  const senderName = names[senderId] || 'A neighbor';

  if (text.startsWith('📍 Pickup location')) {
    const itemId = (chat as { itemId?: string }).itemId;
    if (itemId) {
      const item = await getItemById(itemId);
      if (item) {
        await notifyPickupScheduled({
          item,
          recipientUserIds: participantIds.filter((id) => id !== senderId),
          whenLabel: 'Check messages for pickup details',
        });
        return;
      }
    }
  }

  await notifyNewMessage({
    chatId,
    recipientUserId: recipientId,
    senderName,
    preview: text,
  });
}

export async function pushAfterComment(comment: {
  itemId: string;
  userId: string;
  userName: string;
  text: string;
}) {
  const item = await getItemById(comment.itemId);
  if (!item || item.userId === comment.userId) return;

  await notifyNewComment({
    item,
    commenterName: comment.userName,
    preview: comment.text,
  });
}

function listingStatusLabel(status: string): string {
  switch (status) {
    case 'pending_pickup':
      return 'Pending pickup';
    case 'on_hold':
      return 'On hold';
    case 'completed':
      return 'Gifted';
    case 'withdrawn':
      return 'Withdrawn';
    case 'active':
      return 'Active again';
    default:
      return 'Updated';
  }
}

export async function pushAfterItemStatusChange(
  itemId: string,
  newStatus: string,
  oldStatus?: string,
) {
  if (oldStatus && oldStatus === newStatus) return;

  const item = await getItemById(itemId);
  if (!item) return;

  await notifyListingStatus({
    item: { ...item, status: newStatus as ItemPost['status'] },
    statusLabel: listingStatusLabel(newStatus),
  });

  if (newStatus === 'completed') {
    const { data: claim } = await supabase
      .from('item_claims')
      .select('userId')
      .eq('itemId', itemId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    const claimerUserId = String((claim as { userId?: string } | null)?.userId || '');
    if (claimerUserId) {
      await pushAfterItemCompleted(itemId, item.userId, claimerUserId);
    }
  }
}

export async function pushAfterPendingPickup(itemId: string, actorUserId: string) {
  const item = await getItemById(itemId);
  if (!item) return;

  const { data: chats } = await supabase.from('chats').select('participantIds').eq('itemId', itemId);
  const recipientIds = new Set<string>();
  for (const chat of chats || []) {
    for (const uid of (chat as { participantIds?: string[] }).participantIds || []) {
      if (uid && uid !== actorUserId) recipientIds.add(uid);
    }
  }

  if (!recipientIds.size && item.userId !== actorUserId) {
    recipientIds.add(item.userId);
  }

  if (!recipientIds.size) return;

  await notifyPickupScheduled({
    item,
    recipientUserIds: [...recipientIds],
    whenLabel: 'Marked as pending pickup',
  });
}

export async function pushDirectorAnnouncement(title: string, body: string) {
  await notifyCommunityAnnouncement({
    title,
    body,
  });
}

export async function pushAccountStatusChange(userId: string, title: string, body: string) {
  await notifyAccountUpdate({ userId, title, body });
}

const EXPIRY_DAYS = 14;
const EXPIRY_WARN_DAYS = 12;
const EXPIRY_STORAGE_KEY = 'sbn_expiry_push_v1';

export async function pushListingExpiryReminders(userId: string, posts: ItemPost[]) {
  const sentKey = `${EXPIRY_STORAGE_KEY}:${userId}`;
  const sentRaw = sessionStorage.getItem(sentKey);
  const sent = new Set<string>(sentRaw ? JSON.parse(sentRaw) : []);

  const now = Date.now();
  const toNotify: ItemPost[] = [];

  for (const post of posts) {
    if (post.userId !== userId || post.status !== 'active') continue;
    const created = new Date(post.createdAt).getTime();
    const ageDays = (now - created) / (1000 * 60 * 60 * 24);
    if (ageDays >= EXPIRY_WARN_DAYS && ageDays < EXPIRY_DAYS && !sent.has(post.id)) {
      toNotify.push(post);
      sent.add(post.id);
    }
  }

  if (!toNotify.length) return;

  sessionStorage.setItem(sentKey, JSON.stringify([...sent]));

  for (const item of toNotify) {
    await notifyListingExpiringSoon(item);
  }
}
