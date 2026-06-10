import { convertPercentToLatLng, extractGPSCoordinates } from '../types';
import type { DirectorAlertCategory, ItemPost } from '../types';
import { clip, directorAlert, listingAlert, neighborMessage } from './pushCopy';
import { sendPushNotification } from './pushNotifications';
import {
  pushUrlForConversation,
  pushUrlForListing,
  pushUrlForMessageRequests,
  pushUrlForRequest,
  pushUrlForDirectorOverview,
} from './pushDeepLink';

function itemCoords(item: ItemPost): { lat: number; lng: number } | null {
  const gps = extractGPSCoordinates(item.description);
  if (!gps) return null;
  return convertPercentToLatLng(gps.x, gps.y);
}

export async function notifyNewListingPosted(item: ItemPost) {
  const isRequest = item.type === 'looking';
  const eventType = isRequest ? 'new_request' : 'new_item';
  const coords = itemCoords(item);
  const copy = listingAlert(
    isRequest ? 'New neighbor request' : 'New free item',
    item.userDisplayName,
    `${item.title} · ${item.neighborhood}`,
  );

  await sendPushNotification({
    eventType,
    title: copy.title,
    body: copy.body,
    url: pushUrlForListing(item.id),
    listingId: item.id,
    category: item.category,
    neighborhood: item.neighborhood,
    itemLat: coords?.lat,
    itemLng: coords?.lng,
    excludeUserIds: [item.userId],
    tag: `${eventType}-${item.id}`,
  });
}

export async function notifyItemClaimed(params: {
  item: ItemPost;
  posterUserId: string;
  claimerName: string;
}) {
  await sendPushNotification({
    eventType: 'item_claimed',
    title: 'Your item was claimed',
    body: clip(`${params.claimerName} wants "${params.item.title}" — coordinate pickup in chat`),
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
    title: 'Item marked gifted',
    body: clip(`"${params.item.title}" was gifted in the community`),
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.posterUserId, params.claimerUserId],
    tag: `gifted-${params.item.id}`,
  });
}

export async function notifyMessageRequest(params: {
  requestId: string;
  recipientUserId: string;
  senderName: string;
  preview?: string | null;
}) {
  const copy = neighborMessage(
    params.senderName,
    params.preview || '',
    `${params.senderName} wants to start a chat with you`,
  );

  await sendPushNotification({
    eventType: 'message_request',
    title: 'Message request',
    body: clip(`${copy.title}: ${copy.body}`),
    url: pushUrlForMessageRequests(),
    recipientUserIds: [params.recipientUserId],
    tag: `dm-req-${params.requestId}`,
    data: { requestId: params.requestId },
  });
}

export async function notifyMessageRequestAccepted(params: {
  chatId: string;
  recipientUserId: string;
  accepterName: string;
}) {
  await sendPushNotification({
    eventType: 'message_request_accepted',
    title: 'Chat request accepted',
    body: clip(`${params.accepterName} accepted your message request — you can chat now`),
    url: pushUrlForConversation(params.chatId),
    conversationId: params.chatId,
    recipientUserIds: [params.recipientUserId],
    tag: `dm-accepted-${params.chatId}`,
  });
}

export async function notifyNewMessage(params: {
  chatId: string;
  recipientUserId: string;
  senderName: string;
  preview: string;
}) {
  const copy = neighborMessage(params.senderName, params.preview, 'Sent you a new message');

  await sendPushNotification({
    eventType: 'new_message',
    title: copy.title,
    body: copy.body,
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
    title: `Comment on "${clip(params.item.title, 40)}"`,
    body: clip(`${params.commenterName}: ${params.preview}`),
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
    body: clip(`"${params.item.title}" — ${params.whenLabel}`),
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
    body: clip(`Don't forget to pick up "${params.item.title}" — check messages for details`),
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: params.recipientUserIds,
    tag: `pickup-reminder-${params.item.id}`,
  });
}

export async function notifyListingApproved(item: ItemPost) {
  await sendPushNotification({
    eventType: 'listing_approved',
    title: 'Listing is live',
    body: clip(`"${item.title}" is now visible to neighbors`),
    url: pushUrlForListing(item.id),
    listingId: item.id,
    recipientUserIds: [item.userId],
    tag: `approved-${item.id}`,
  });
}

export async function notifyListingDenied(item: ItemPost, reason?: string) {
  await sendPushNotification({
    eventType: 'listing_denied',
    title: 'Listing needs changes',
    body: clip(reason || `"${item.title}" was not approved yet — check your messages for details`),
    url: pushUrlForListing(item.id),
    listingId: item.id,
    recipientUserIds: [item.userId],
    tag: `denied-${item.id}`,
  });
}

export async function notifyListingStatusChange(params: {
  item: ItemPost;
  statusLabel: string;
}) {
  await sendPushNotification({
    eventType: 'listing_status',
    title: 'Your listing was updated',
    body: clip(`"${params.item.title}" — ${params.statusLabel}`),
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `status-${params.item.id}`,
  });
}

export async function notifyListingExpiringSoon(item: ItemPost) {
  await sendPushNotification({
    eventType: 'listing_expiring',
    title: 'Listing expiring soon',
    body: clip(`"${item.title}" will expire soon — renew it or mark as gifted`),
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
    title: clip(params.title, 80),
    body: clip(params.body, 180),
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
    title: clip(params.title, 80),
    body: clip(params.body, 180),
    url: '/profile',
    recipientUserIds: [params.userId],
    tag: `account-${params.userId}`,
  });
}

export async function notifyDirectorAlert(params: {
  category: DirectorAlertCategory;
  title: string;
  body: string;
  tag?: string;
  excludeUserIds?: string[];
}) {
  const copy = directorAlert(params.title, params.body);
  await sendPushNotification({
    eventType: 'director_alert',
    title: copy.title,
    body: copy.body,
    url: pushUrlForDirectorOverview(),
    excludeUserIds: params.excludeUserIds,
    tag: params.tag || 'director-alert',
    data: { directorCategory: params.category },
  });
}

export async function notifySavedItemUpdate(params: {
  item: ItemPost;
  recipientUserId: string;
  statusLabel: string;
}) {
  await sendPushNotification({
    eventType: 'saved_item_update',
    title: 'Saved listing updated',
    body: clip(`"${params.item.title}" — ${params.statusLabel}`),
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
    eventType: 'claim_request',
    title: 'New claim request',
    body: clip(`${params.claimerName} wants to claim "${params.item.title}"`),
    url: pushUrlForRequest(params.requestId),
    listingId: params.item.id,
    requestId: params.requestId,
    recipientUserIds: [params.item.userId],
    tag: `claim-req-${params.requestId}`,
  });
}

export async function notifyRequestFulfilled(params: {
  item: ItemPost;
  helperUserId: string;
  ownerName: string;
}) {
  await sendPushNotification({
    eventType: 'request_fulfilled',
    title: 'Your request was fulfilled',
    body: clip(`${params.ownerName} marked "${params.item.title}" as fulfilled`),
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.helperUserId],
    tag: `fulfilled-${params.item.id}`,
  });
}
