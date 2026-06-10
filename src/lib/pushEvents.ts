import { convertPercentToLatLng, extractGPSCoordinates } from '../types';
import type { DirectorAlertCategory, ItemPost } from '../types';
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

  await sendPushNotification({
    eventType,
    title: isRequest ? 'New neighbor request' : 'New free item posted',
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

export async function notifyMessageRequest(params: {
  requestId: string;
  recipientUserId: string;
  senderName: string;
  preview?: string | null;
}) {
  const preview = params.preview?.trim();
  const body = preview
    ? `${params.senderName}: ${preview.slice(0, 120)}`
    : `${params.senderName} wants to message you`;

  await sendPushNotification({
    eventType: 'message_request',
    title: 'New message request',
    body,
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
    title: 'Message request accepted',
    body: `${params.accepterName} accepted your message request`,
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
  messageId?: string;
}) {
  const messageId = params.messageId?.trim();
  await sendPushNotification({
    eventType: 'new_message',
    title: `Message from ${params.senderName}`,
    body: params.preview.slice(0, 140),
    url: pushUrlForConversation(params.chatId),
    conversationId: params.chatId,
    recipientUserIds: [params.recipientUserId],
    tag: messageId ? `msg-${messageId}` : `msg-${params.chatId}-${Date.now()}`,
  });
}

export async function notifyNewComment(params: {
  item: ItemPost;
  commenterName: string;
  preview: string;
  commentId?: string;
}) {
  const tag = params.commentId
    ? `comment-${params.commentId}`
    : `comment-${params.item.id}-${Date.now()}`;

  await sendPushNotification({
    eventType: 'new_comment',
    title: 'New comment on your listing',
    body: `${params.commenterName}: ${params.preview.slice(0, 120)}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag,
  });
}

/** Notify neighbors who bookmarked this listing (comments, edits, status). */
export async function notifySavedListingActivity(params: {
  item: ItemPost;
  title: string;
  body: string;
  tag: string;
  excludeUserIds?: string[];
}) {
  await sendPushNotification({
    eventType: 'saved_item_update',
    title: params.title,
    body: params.body.slice(0, 200),
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    excludeUserIds: params.excludeUserIds,
    tag: params.tag,
  });
}

export async function notifyListingUpvote(params: {
  item: ItemPost;
  voterName: string;
  voterUserId: string;
}) {
  await sendPushNotification({
    eventType: 'listing_upvote',
    title: 'New upvote on your listing',
    body: `${params.voterName} upvoted "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `vote-up-${params.item.id}-${params.voterUserId}`,
  });
}

export async function notifyListingDownvote(params: {
  item: ItemPost;
  voterName: string;
  voterUserId: string;
}) {
  await sendPushNotification({
    eventType: 'listing_downvote',
    title: 'Downvote on your listing',
    body: `${params.voterName} downvoted "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `vote-down-${params.item.id}-${params.voterUserId}`,
  });
}

export async function notifyPickupScheduled(params: {
  item: ItemPost;
  recipientUserIds: string[];
  whenLabel: string;
  messageId?: string;
}) {
  const messageId = params.messageId?.trim();
  const itemId = params.item.id;
  await sendPushNotification({
    eventType: 'pickup_scheduled',
    title: 'Pickup scheduled',
    body: `"${params.item.title}" — ${params.whenLabel}`,
    url: pushUrlForListing(itemId),
    listingId: itemId,
    recipientUserIds: params.recipientUserIds,
    tag: messageId ? `pickup-msg-${messageId}` : `pickup-status-${itemId}`,
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

export async function notifyListingStatus(params: {
  item: ItemPost;
  statusLabel: string;
}) {
  await sendPushNotification({
    eventType: 'listing_status',
    title: 'Listing status updated',
    body: `"${params.item.title}" — ${params.statusLabel}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `status-${params.item.id}-${params.item.status}`,
  });
}

export async function notifyAppUpdate(params: {
  title: string;
  body: string;
  updateId?: string;
}) {
  const updateId = params.updateId?.trim();
  await sendPushNotification({
    eventType: 'app_update',
    title: params.title,
    body: params.body,
    url: '/updates',
    tag: updateId ? `app-update-${updateId}` : `app-update-${Date.now()}`,
  });
}

export async function notifyCommunityAnnouncement(params: {
  title: string;
  body: string;
  cities?: string[];
  updateId?: string;
}) {
  const updateId = params.updateId?.trim();
  await sendPushNotification({
    eventType: 'announcement',
    title: params.title,
    body: params.body,
    url: '/help/announcements',
    cities: params.cities,
    tag: updateId ? `announcement-${updateId}` : `announcement-${Date.now()}`,
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

export async function notifyDirectorAlert(params: {
  category: DirectorAlertCategory;
  title: string;
  body: string;
  tag?: string;
  excludeUserIds?: string[];
}) {
  await sendPushNotification({
    eventType: 'director_alert',
    title: params.title,
    body: params.body.slice(0, 200),
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
    title: 'Saved item update',
    body: `"${params.item.title}" — ${params.statusLabel}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.recipientUserId],
    tag: `saved-status-${params.item.id}-${params.item.status}`,
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
    body: `${params.claimerName} wants to claim "${params.item.title}"`,
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
    title: 'Request fulfilled',
    body: `${params.ownerName} marked "${params.item.title}" as fulfilled`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.helperUserId],
    tag: `fulfilled-${params.item.id}`,
  });
}
