import { supabase } from '../supabase';
import type { ItemPost } from '../types';
import {
  notifyAccountUpdate,
  notifyCommunityAnnouncement,
  notifyItemClaimed,
  notifyItemGifted,
  notifyListingApproved,
  notifyListingExpiringSoon,
  notifyNewComment,
  notifyNewListingPosted,
  notifyNewMessage,
  notifyPickupScheduled,
  notifyClaimRequestSubmitted,
} from './pushEvents';

async function getItemById(itemId: string): Promise<ItemPost | null> {
  const { data } = await supabase.from('items').select('*').eq('id', itemId).maybeSingle();
  if (!data) return null;
  return data as ItemPost;
}

export async function pushAfterItemCreated(item: ItemPost) {
  await notifyNewListingPosted(item);
  await notifyListingApproved(item);
}

export async function pushAfterClaimRequest(params: {
  item: ItemPost;
  claimerName: string;
  requestId: string;
}) {
  await notifyClaimRequestSubmitted(params);
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
  await notifyItemGifted({ item, posterUserId, claimerUserId });
}

export async function pushAfterMessage(chatId: string, senderId: string, text: string) {
  const { data: chat } = await supabase.from('chats').select('*').eq('id', chatId).maybeSingle();
  if (!chat) return;

  const participantIds = (chat as { participantIds?: string[] }).participantIds || [];
  const recipientId = participantIds.find((id) => id !== senderId);
  if (!recipientId) return;

  const names = (chat as { participantNames?: Record<string, string> }).participantNames || {};
  const senderName = names[senderId] || 'A neighbor';

  if (text.includes('📍 Pickup location') || text.toLowerCase().includes('pickup')) {
    const itemId = (chat as { itemId?: string }).itemId;
    if (itemId) {
      const item = await getItemById(itemId);
      if (item) {
        await notifyPickupScheduled({
          item,
          recipientUserIds: participantIds.filter((id) => id !== senderId),
          whenLabel: 'Check messages for pickup details',
        });
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

export async function pushAfterPendingPickup(itemId: string, participantIds: string[]) {
  const item = await getItemById(itemId);
  if (!item) return;
  await notifyPickupScheduled({
    item,
    recipientUserIds: participantIds,
    whenLabel: 'Marked as pending pickup',
  });
}

export async function pushDirectorAnnouncement(headline: string) {
  await notifyCommunityAnnouncement({
    title: 'Community announcement',
    body: headline,
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
