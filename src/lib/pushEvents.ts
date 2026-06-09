import { convertPercentToLatLng, extractGPSCoordinates } from '../types';
import type { ItemPost } from '../types';
import { sendPushNotification } from './pushNotifications';
import { pushUrlForConversation, pushUrlForListing, pushUrlForRequest } from './pushDeepLink';

function itemCoords(item: ItemPost): { lat: number; lng: number } | null {
  const gps = extractGPSCoordinates(item.description);
  if (!gps) return null;
  return convertPercentToLatLng(gps.x, gps.y);
}

export async function notifyNewListingPosted(item: ItemPost) {
  const isRequest = item.type === 'looking';
  const eventType = isRequest ? 'new_request' : 'new_item';
  const coords = itemCoords(item);

  await sendPushNotification({
    eventType,
    title: isRequest ? 'New request nearby' : 'New free item posted',
    body: `${item.userDisplayName}: ${item.title}`,
    url: pushUrlForListing(item.id),
    listingId: item.id,
    category: item.category,
    neighborhood: item.neighborhood,
    itemLat: coords?.lat,
    itemLng: coords?.lng,
    excludeUserIds: [item.userId],
    tag: `${eventType}-${item.id}`,
  });

  if (!isRequest) {
    await sendPushNotification({
      eventType: 'nearby_item',
      title: 'Nearby free item',
      body: `${item.title} in ${item.neighborhood}`,
      url: pushUrlForListing(item.id),
      listingId: item.id,
      category: item.category,
      neighborhood: item.neighborhood,
      itemLat: coords?.lat,
      itemLng: coords?.lng,
      excludeUserIds: [item.userId],
      tag: `nearby-${item.id}`,
    });
  }
}

export async function notifyItemClaimed(params: {
  item: ItemPost;
  posterUserId: string;
  claimerName: string;
}) {
  await sendPushNotification({
    eventType: 'item_claimed',
    title: 'Your item was claimed',
    body: `${params.claimerName} claimed "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.posterUserId],
    tag: `claimed-${params.item.id}`,
  });
}

export async function notifyItemGifted(params: {
  item: ItemPost;
  posterUserId: string;
  claimerUserId: string;
}) {
  await sendPushNotification({
    eventType: 'item_gifted',
    title: 'Item gifted successfully',
    body: `"${params.item.title}" has been marked as gifted`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.posterUserId, params.claimerUserId],
    tag: `gifted-${params.item.id}`,
  });
}

export async function notifyNewMessage(params: {
  chatId: string;
  recipientUserId: string;
  senderName: string;
  preview: string;
}) {
  await sendPushNotification({
    eventType: 'new_message',
    title: `Message from ${params.senderName}`,
    body: params.preview.slice(0, 140),
    url: pushUrlForConversation(params.chatId),
    conversationId: params.chatId,
    recipientUserIds: [params.recipientUserId],
    tag: `msg-${params.chatId}`,
  });
}

export async function notifyNewComment(params: {
  item: ItemPost;
  commenterName: string;
  preview: string;
}) {
  await sendPushNotification({
    eventType: 'new_comment',
    title: 'New comment on your listing',
    body: `${params.commenterName}: ${params.preview.slice(0, 120)}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `comment-${params.item.id}`,
  });
}

export async function notifyPickupScheduled(params: {
  item: ItemPost;
  recipientUserIds: string[];
  whenLabel: string;
}) {
  await sendPushNotification({
    eventType: 'pickup_scheduled',
    title: 'Pickup scheduled',
    body: `"${params.item.title}" — ${params.whenLabel}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: params.recipientUserIds,
    tag: `pickup-${params.item.id}`,
  });
}

export async function notifyPickupReminder(params: {
  item: ItemPost;
  recipientUserIds: string[];
}) {
  await sendPushNotification({
    eventType: 'pickup_reminder',
    title: 'Pickup reminder',
    body: `Don't forget to pick up "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: params.recipientUserIds,
    tag: `pickup-reminder-${params.item.id}`,
  });
}

export async function notifyListingApproved(item: ItemPost) {
  await sendPushNotification({
    eventType: 'listing_approved',
    title: 'Listing approved',
    body: `"${item.title}" is now live in the community`,
    url: pushUrlForListing(item.id),
    listingId: item.id,
    recipientUserIds: [item.userId],
    tag: `approved-${item.id}`,
  });
}

export async function notifyListingDenied(item: ItemPost, reason?: string) {
  await sendPushNotification({
    eventType: 'listing_denied',
    title: 'Listing not approved',
    body: reason || `"${item.title}" needs changes before it can go live`,
    url: pushUrlForListing(item.id),
    listingId: item.id,
    recipientUserIds: [item.userId],
    tag: `denied-${item.id}`,
  });
}

export async function notifyListingExpiringSoon(item: ItemPost) {
  await sendPushNotification({
    eventType: 'listing_expiring',
    title: 'Listing expiring soon',
    body: `"${item.title}" will expire soon — renew or mark as gifted`,
    url: pushUrlForListing(item.id),
    listingId: item.id,
    recipientUserIds: [item.userId],
    tag: `expiring-${item.id}`,
  });
}

export async function notifyCommunityAnnouncement(params: {
  title: string;
  body: string;
  cities?: string[];
}) {
  await sendPushNotification({
    eventType: 'announcement',
    title: params.title,
    body: params.body,
    url: '/notifications',
    cities: params.cities,
    tag: 'community-announcement',
  });
}

export async function notifyAccountUpdate(params: {
  userId: string;
  title: string;
  body: string;
}) {
  await sendPushNotification({
    eventType: 'account_update',
    title: params.title,
    body: params.body,
    url: '/profile',
    recipientUserIds: [params.userId],
    tag: `account-${params.userId}`,
  });
}

export async function notifySupportReply(params: {
  ticketId: string;
  recipientUserId: string;
  subject: string;
  preview: string;
}) {
  await sendPushNotification({
    eventType: 'support_reply',
    title: 'Support reply',
    body: `${params.subject}: ${params.preview.slice(0, 120)}`,
    url: '/menu',
    recipientUserIds: [params.recipientUserId],
    tag: `support-${params.ticketId}`,
  });
}

export async function notifySavedItemUpdate(params: {
  item: ItemPost;
  recipientUserId: string;
  statusLabel: string;
}) {
  await sendPushNotification({
    eventType: 'saved_item_update',
    title: 'Saved item update',
    body: `"${params.item.title}" — ${params.statusLabel}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.recipientUserId],
    tag: `saved-${params.item.id}`,
  });
}

export async function notifyClaimRequestSubmitted(params: {
  item: ItemPost;
  claimerName: string;
  requestId: string;
}) {
  await sendPushNotification({
    eventType: 'item_claimed',
    title: 'New claim request',
    body: `${params.claimerName} wants to claim "${params.item.title}"`,
    url: pushUrlForRequest(params.requestId),
    listingId: params.item.id,
    requestId: params.requestId,
    recipientUserIds: [params.item.userId],
    tag: `claim-req-${params.requestId}`,
  });
}
