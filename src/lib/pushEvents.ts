import { convertPercentToLatLng, extractGPSCoordinates } from '../types';
import type { DirectorAlertCategory, ItemPost } from '../types';
import { sendPushNotification } from './pushNotifications';
import {
  isListingInExpiryWarningWindow,
  listingExpiryDaysRemaining,
} from '../../shared/listingExpiry';
import {
  pushUrlForConversation,
  pushUrlForListing,
  pushUrlForMessageRequests,
  pushUrlForRequest,
  pushUrlForDirectorOverview,
  pushUrlForFeedPost,
  pushUrlForEvent,
  pushUrlForNeighborProfile,
  pushUrlForAwards,
  pushUrlForAnnouncement,
  pushUrlForAppUpdate,
} from './pushDeepLink';

function itemCoords(item: ItemPost): { lat: number; lng: number } | null {
  const gps = extractGPSCoordinates(item.description);
  if (!gps) return null;
  return convertPercentToLatLng(gps.x, gps.y);
}

export async function notifyNewListingPosted(item: ItemPost) {
  const isRequest = item.type === 'looking';
  const isTrade = item.type === 'trade';
  const eventType = isRequest ? 'new_request' : 'new_item';
  const coords = itemCoords(item);

  await sendPushNotification({
    eventType,
    title: isRequest
      ? 'New neighbor request'
      : isTrade
        ? 'New trade offer'
        : 'New free item posted',
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

export async function notifyCommunityChatMessage(params: {
  senderName: string;
  preview: string;
  messageId?: string;
}) {
  const messageId = params.messageId?.trim();
  await sendPushNotification({
    eventType: 'community_chat',
    title: `Community chat — ${params.senderName}`,
    body: params.preview.slice(0, 140),
    url: pushUrlForConversation('community-global'),
    conversationId: 'community-global',
    tag: messageId ? `community-msg-${messageId}` : `community-msg-${Date.now()}`,
  });
}

export async function notifyStaffChatMessage(params: {
  senderName: string;
  preview: string;
  messageId?: string;
}) {
  const messageId = params.messageId?.trim();
  await sendPushNotification({
    eventType: 'staff_chat',
    title: `Staff chat — ${params.senderName}`,
    body: params.preview.slice(0, 140),
    url: pushUrlForConversation('community-staff'),
    conversationId: 'community-staff',
    tag: messageId ? `staff-msg-${messageId}` : `staff-msg-${Date.now()}`,
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

export async function notifyListingCommentReply(params: {
  item: ItemPost;
  commenterName: string;
  preview: string;
  commentId: string;
  recipientUserIds: string[];
}) {
  if (!params.recipientUserIds.length) return;
  await sendPushNotification({
    eventType: 'new_comment',
    title: 'New reply on a listing you commented on',
    body: `${params.commenterName} on "${params.item.title}": ${params.preview.slice(0, 120)}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: params.recipientUserIds,
    tag: `listing-thread-${params.commentId}`,
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
  voterUserId: string;
}) {
  await sendPushNotification({
    eventType: 'listing_upvote',
    title: 'New upvote on your listing',
    body: `Someone upvoted "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `vote-up-${params.item.id}-${params.voterUserId}`,
  });
}

export async function notifyListingDownvote(params: {
  item: ItemPost;
  voterUserId: string;
}) {
  await sendPushNotification({
    eventType: 'listing_downvote',
    title: 'Feedback on your listing',
    body: `Someone downvoted "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `vote-down-${params.item.id}-${params.voterUserId}`,
  });
}

export async function notifyFeedComment(params: {
  postId: string;
  authorUserId: string;
  commenterName: string;
  preview: string;
  commentId?: string;
  title?: string;
  parentCommentId?: string;
  eventType?: 'feed_comment' | 'feed_reply';
}) {
  const eventType = params.eventType || 'feed_comment';
  const tag = params.commentId
    ? `feed-comment-${params.commentId}`
    : `feed-comment-${params.postId}-${Date.now()}`;

  await sendPushNotification({
    eventType,
    title: params.title || (eventType === 'feed_reply' ? 'New reply to your comment' : 'New comment on your feed post'),
    body: `${params.commenterName}: ${params.preview.slice(0, 120)}`,
    url: pushUrlForFeedPost(params.postId),
    recipientUserIds: [params.authorUserId],
    tag,
    data: {
      feedPostId: params.postId,
      actorName: params.commenterName,
      ...(params.parentCommentId ? { parentCommentId: params.parentCommentId } : {}),
    },
  });
}

export async function notifyFeedPost(params: {
  postId: string;
  authorUserId: string;
  authorName: string;
  preview: string;
  neighborhood: string;
}) {
  await sendPushNotification({
    eventType: 'feed_post',
    title: 'New community feed post',
    body: `${params.authorName} in ${params.neighborhood}: ${params.preview.slice(0, 120)}`,
    url: pushUrlForFeedPost(params.postId),
    excludeUserIds: [params.authorUserId],
    tag: `feed-post-${params.postId}`,
    data: { feedPostId: params.postId },
    neighborhood: params.neighborhood,
  });
}

export async function notifyFeedReaction(params: {
  postId: string;
  authorUserId: string;
  reactorUserId: string;
  emoji: string;
  preview: string;
}) {
  await sendPushNotification({
    eventType: 'feed_reaction',
    title: 'New reaction on your feed post',
    body: `Someone reacted ${params.emoji} to "${params.preview.slice(0, 80)}"`,
    url: pushUrlForFeedPost(params.postId),
    recipientUserIds: [params.authorUserId],
    tag: `feed-react-${params.postId}-${params.reactorUserId}-${params.emoji}`,
    data: { feedPostId: params.postId, emoji: params.emoji },
  });
}

export async function notifyFeedUpvote(params: { postId: string; authorUserId: string; voterUserId: string }) {
  await sendPushNotification({
    eventType: 'feed_upvote',
    title: 'New upvote on your feed post',
    body: 'Someone upvoted your feed post',
    url: pushUrlForFeedPost(params.postId),
    recipientUserIds: [params.authorUserId],
    tag: `feed-vote-up-${params.postId}-${params.voterUserId}`,
    data: { feedPostId: params.postId },
  });
}

export async function notifyFeedDownvote(params: { postId: string; authorUserId: string; voterUserId: string }) {
  await sendPushNotification({
    eventType: 'feed_downvote',
    title: 'Feedback on your feed post',
    body: 'Someone downvoted your feed post',
    url: pushUrlForFeedPost(params.postId),
    recipientUserIds: [params.authorUserId],
    tag: `feed-vote-down-${params.postId}-${params.voterUserId}`,
    data: { feedPostId: params.postId },
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

export async function notifyPosterOnTheWay(params: {
  item: ItemPost;
  travelerUserId: string;
  travelerName: string;
  distanceLabel: string;
  durationLabel: string;
}) {
  await sendPushNotification({
    eventType: 'on_the_way',
    title: 'Neighbor on the way',
    body: `${params.travelerName} is heading to "${params.item.title}" — ${params.distanceLabel} away (${params.durationLabel})`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    tag: `on-the-way-${params.item.id}-${params.travelerUserId}`,
    data: {
      actorName: params.travelerName,
      actorUserId: params.travelerUserId,
    },
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
  const daysLeft = listingExpiryDaysRemaining(item);
  const body = isListingInExpiryWarningWindow(item)
    ? `"${item.title}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — edit it to reset the timer, or mark it gifted`
    : `"${item.title}" will expire soon — edit it to reset the timer, or mark it gifted`;

  await sendPushNotification({
    eventType: 'listing_expiring',
    title: 'Listing expiring soon',
    body,
    url: pushUrlForListing(item.id),
    listingId: item.id,
    recipientUserIds: [item.userId],
    tag: `expiring-${item.id}`,
  });
}

export async function notifyListingExpired(item: Pick<ItemPost, 'id' | 'title' | 'userId'>) {
  await sendPushNotification({
    eventType: 'listing_expired',
    title: 'Listing expired',
    body: `"${item.title}" was withdrawn after 30 days — edit and repost from your profile to relist`,
    url: pushUrlForListing(item.id),
    listingId: item.id,
    recipientUserIds: [item.userId],
    tag: `expired-${item.id}`,
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
  tag?: string;
}) {
  await sendPushNotification({
    eventType: 'account_update',
    title: params.title,
    body: params.body,
    url: '/profile',
    recipientUserIds: [params.userId],
    tag: params.tag || `account-${params.userId}`,
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
    tag: `saved-${params.item.id}-${params.item.status}`,
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

// =========================================================
// "Go Get" pickup sessions
// =========================================================

export async function notifyGoGetAvailabilityRequest(params: {
  item: ItemPost;
  fulfillerUserId: string;
  requesterName: string;
  sessionId: string;
  ringDurationSeconds?: number;
  ringPattern?: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_availability_request',
    title: 'Ready for pickup?',
    body: `${params.requesterName} wants to Go Get "${params.item.title}" — are you available now?`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.fulfillerUserId],
    tag: `go-get-availability-${params.sessionId}`,
    data: {
      goGetSessionId: params.sessionId,
      urgentGoGetRing: 'true',
      ringDurationSeconds: String(params.ringDurationSeconds ?? 140),
      ringPattern: params.ringPattern ?? 'ring',
    },
  });
}

export async function notifyGoGetAvailableNow(params: {
  item: ItemPost;
  requesterUserId: string;
  fulfillerName: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_available_now',
    title: `${params.fulfillerName} is available now`,
    body: `Tap Go Get to start heading to "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.requesterUserId],
    tag: `go-get-available-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetScheduleProposed(params: {
  item: ItemPost;
  requesterUserId: string;
  fulfillerName: string;
  windowLabel: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_schedule_proposed',
    title: `${params.fulfillerName} isn't available right now`,
    body: `Free ${params.windowLabel} for "${params.item.title}" — pick a pickup time`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.requesterUserId],
    tag: `go-get-schedule-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetScheduleConfirmed(params: {
  item: ItemPost;
  fulfillerUserId: string;
  requesterName: string;
  whenLabel: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_schedule_confirmed',
    title: 'Pickup time confirmed',
    body: `${params.requesterName} will Go Get "${params.item.title}" ${params.whenLabel}`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.fulfillerUserId],
    tag: `go-get-confirmed-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetReadyReminder(params: {
  item: ItemPost;
  fulfillerUserId: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_ready_reminder',
    title: 'Pickup time is here',
    body: `Tap Ready when you're set for "${params.item.title}" — the neighbor is waiting on you.`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.fulfillerUserId],
    tag: `go-get-ready-reminder-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetFulfillerReady(params: {
  item: ItemPost;
  requesterUserId: string;
  fulfillerName: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_fulfiller_ready',
    title: `${params.fulfillerName} is ready`,
    body: `Tap Go Get to start heading to "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.requesterUserId],
    tag: `go-get-fulfiller-ready-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetStarted(params: {
  item: ItemPost;
  fulfillerUserId: string;
  requesterName: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_started',
    title: `${params.requesterName} is on the way`,
    body: `Heading to pick up "${params.item.title}" now`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.fulfillerUserId],
    tag: `go-get-started-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetArrived(params: {
  item: ItemPost;
  fulfillerUserId: string;
  requesterName: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_arrived',
    title: `${params.requesterName} has arrived`,
    body: `Confirm the pickup for "${params.item.title}" once it's handed off`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.fulfillerUserId],
    tag: `go-get-arrived-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetCompleted(params: {
  item: ItemPost;
  requesterUserId: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_completed',
    title: 'Pickup confirmed',
    body: `"${params.item.title}" pickup is complete — thanks for using Go Get!`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.requesterUserId],
    tag: `go-get-completed-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

export async function notifyGoGetCancelled(params: {
  item: ItemPost;
  recipientUserId: string;
  cancelledByName: string;
  sessionId: string;
}) {
  await sendPushNotification({
    eventType: 'go_get_cancelled',
    title: 'Go Get cancelled',
    body: `${params.cancelledByName} cancelled the pickup for "${params.item.title}"`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.recipientUserId],
    tag: `go-get-cancelled-${params.sessionId}`,
    data: { goGetSessionId: params.sessionId },
  });
}

// =========================================================
// Contactless pickup notifications (Curb Alert / Porch Pickup)
// No GPS tracking — picker chooses if/when to notify poster.
// =========================================================

export async function notifyContactlessPickupArrived(params: {
  item: ItemPost;
  pickerName: string;
}) {
  await sendPushNotification({
    eventType: 'contactless_pickup_arrived',
    title: `${params.pickerName} is at your ${params.item.category.toLowerCase()}`,
    body: `They're picking up "${params.item.title}" now`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `contactless-arrived-${params.item.id}`,
  });
}

export async function notifyContactlessPickupLeft(params: {
  item: ItemPost;
  pickerName: string;
}) {
  await sendPushNotification({
    eventType: 'contactless_pickup_left',
    title: `${params.pickerName} picked up from your ${params.item.category.toLowerCase()}`,
    body: `"${params.item.title}" — mark it as claimed if it's gone`,
    url: pushUrlForListing(params.item.id),
    listingId: params.item.id,
    recipientUserIds: [params.item.userId],
    tag: `contactless-left-${params.item.id}`,
  });
}

// =========================================================
// "Go Get" violations
// =========================================================

export async function notifyViolationFiled(params: { userId: string; violationId: string }) {
  await sendPushNotification({
    eventType: 'violation_filed',
    title: 'A report was filed on your account',
    body: 'A neighbor reported an issue with a recent Go Get pickup. Staff will review it shortly.',
    url: '/profile',
    recipientUserIds: [params.userId],
    tag: `violation-filed-${params.violationId}`,
  });
}

export async function notifyViolationDecision(params: {
  userId: string;
  violationId: string;
  strikeCount: number;
  confirmed: boolean;
}) {
  await sendPushNotification({
    eventType: 'violation_decision',
    title: params.confirmed ? 'Violation confirmed' : 'Report dismissed',
    body: params.confirmed
      ? `A Go Get violation on your account was confirmed (${params.strikeCount}/6 strikes). You can appeal from Messages → Support.`
      : 'A report filed against you was reviewed and dismissed — no action needed.',
    url: '/profile',
    recipientUserIds: [params.userId],
    tag: `violation-decision-${params.violationId}`,
  });
}

export async function notifyAccountLockedForViolations(params: { userId: string }) {
  await sendPushNotification({
    eventType: 'account_locked',
    title: 'Account locked',
    body: 'Your account was automatically locked after 6 confirmed Go Get violations. Contact support to appeal.',
    url: '/profile',
    recipientUserIds: [params.userId],
    tag: `account-locked-${params.userId}`,
  });
}

export async function notifyAppealDecision(params: {
  userId: string;
  violationId: string;
  upheld: boolean;
}) {
  await sendPushNotification({
    eventType: 'appeal_decision',
    title: params.upheld ? 'Appeal granted' : 'Appeal denied',
    body: params.upheld
      ? 'Your appeal was reviewed and the violation was overturned — it no longer counts as a strike.'
      : 'Your appeal was reviewed and the original decision was upheld.',
    url: '/profile',
    recipientUserIds: [params.userId],
    tag: `appeal-decision-${params.violationId}`,
  });
}

export async function notifyFriendRequest(params: {
  requestId: string;
  toUserId: string;
  fromUserId: string;
  fromUserName: string;
}) {
  await sendPushNotification({
    eventType: 'friend_request',
    title: 'New friend request',
    body: `${params.fromUserName} wants to be friends`,
    url: pushUrlForNeighborProfile(params.fromUserId),
    recipientUserIds: [params.toUserId],
    tag: `friend-req-${params.requestId}`,
    data: { profileUserId: params.fromUserId, actorUserId: params.fromUserId, actorName: params.fromUserName },
  });
}

export async function notifyFriendRequestAccepted(params: {
  requestId: string;
  fromUserId: string;
  accepterUserId: string;
  accepterName: string;
}) {
  await sendPushNotification({
    eventType: 'friend_request_accepted',
    title: 'Friend request accepted',
    body: `${params.accepterName} accepted your friend request`,
    url: pushUrlForNeighborProfile(params.accepterUserId),
    recipientUserIds: [params.fromUserId],
    tag: `friend-accepted-${params.requestId}`,
    data: {
      profileUserId: params.accepterUserId,
      actorUserId: params.accepterUserId,
      actorName: params.accepterName,
    },
  });
}

export async function notifyEventRsvp(params: {
  eventId: string;
  eventTitle: string;
  hostUserId: string;
  rsvpUserId: string;
  rsvpName: string;
  statusLabel: string;
  rsvpStatus?: string;
}) {
  await sendPushNotification({
    eventType: 'event_rsvp',
    title: 'New RSVP on your event',
    body: `${params.rsvpName} ${params.statusLabel} to "${params.eventTitle}"`,
    url: pushUrlForEvent(params.eventId),
    recipientUserIds: [params.hostUserId],
    tag: `event-rsvp-${params.eventId}-${params.rsvpUserId}-${params.rsvpStatus || params.statusLabel}`,
    data: { eventId: params.eventId, actorUserId: params.rsvpUserId, actorName: params.rsvpName },
  });
}

export async function notifyEventComment(params: {
  eventId: string;
  eventTitle: string;
  hostUserId: string;
  commenterName: string;
  commenterUserId: string;
  preview: string;
  commentId?: string;
  recipientUserIds?: string[];
  title?: string;
  tagSuffix?: string;
}) {
  const recipients = params.recipientUserIds?.length ? params.recipientUserIds : [params.hostUserId];
  if (!recipients.length) return;
  await sendPushNotification({
    eventType: 'event_comment',
    title: params.title || 'New comment on your event',
    body: `${params.commenterName} on "${params.eventTitle}": ${params.preview.slice(0, 120)}`,
    url: pushUrlForEvent(params.eventId),
    recipientUserIds: recipients,
    tag: `event-comment-${params.commentId || `${params.eventId}-${Date.now()}`}-${params.tagSuffix || 'host'}`,
    data: { eventId: params.eventId, actorUserId: params.commenterUserId, actorName: params.commenterName },
  });
}

export async function notifyAnnouncementComment(params: {
  announcementId: string;
  title: string;
  authorUserId: string;
  commenterName: string;
  commenterUserId: string;
  preview: string;
  commentId?: string;
  recipientUserIds?: string[];
  notificationTitle?: string;
  tagSuffix?: string;
}) {
  const recipients = params.recipientUserIds?.length ? params.recipientUserIds : [params.authorUserId];
  if (!recipients.length) return;
  await sendPushNotification({
    eventType: 'announcement_comment',
    title: params.notificationTitle || 'New comment on your news post',
    body: `${params.commenterName} on "${params.title}": ${params.preview.slice(0, 120)}`,
    url: pushUrlForAnnouncement(params.announcementId),
    recipientUserIds: recipients,
    tag: `announcement-comment-${params.commentId || params.announcementId}-${params.tagSuffix || 'owner'}`,
    data: { announcementId: params.announcementId, actorUserId: params.commenterUserId, actorName: params.commenterName },
  });
}

export async function notifyUpdateComment(params: {
  updateId: string;
  title: string;
  authorUserId: string;
  commenterName: string;
  commenterUserId: string;
  preview: string;
  commentId?: string;
  recipientUserIds?: string[];
  notificationTitle?: string;
  tagSuffix?: string;
}) {
  const recipients = params.recipientUserIds?.length ? params.recipientUserIds : [params.authorUserId];
  if (!recipients.length) return;
  await sendPushNotification({
    eventType: 'update_comment',
    title: params.notificationTitle || 'New comment on your update',
    body: `${params.commenterName} on "${params.title}": ${params.preview.slice(0, 120)}`,
    url: pushUrlForAppUpdate(params.updateId),
    recipientUserIds: recipients,
    tag: `update-comment-${params.commentId || params.updateId}-${params.tagSuffix || 'owner'}`,
    data: { updateId: params.updateId, actorUserId: params.commenterUserId, actorName: params.commenterName },
  });
}
