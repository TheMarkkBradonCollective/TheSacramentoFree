/**
 * Deterministic dedup keys for the notification engine.
 * Format: {eventType}:{occurrenceId}:{secondaryEntityId?}:{recipientUserId}
 *
 * Per-recipient keys prevent fan-out collisions and let client + webhook
 * paths deduplicate reliably without a time window.
 *
 * Occurrence IDs must identify *this* notification (message, comment, view),
 * not a parent container (conversation, listing). Parent-only keys collapse
 * every later event of the same type into one permanent claim — the send
 * adapter passes listingId/conversationId as entityId.
 */

export interface DedupKeyInput {
  eventType: string;
  recipientUserId: string;
  tag?: string;
  entityId?: string;
  secondaryEntityId?: string;
  data?: Record<string, string>;
}

const INSTANCE_DATA_KEYS = ['messageId', 'commentId', 'claimRequestId', 'viewerUserId'] as const;

const PARENT_DATA_KEYS = [
  'goGetSessionId',
  'sessionId',
  'postId',
  'feedPostId',
  'requestId',
  'listingId',
  'itemId',
  'conversationId',
  'eventId',
  'ticketId',
  'awardId',
  'announcementId',
  'updateId',
] as const;

/** Event types that fire many times against the same parent entity. */
const REPEATABLE_EVENTS = new Set([
  'new_message',
  'community_chat',
  'staff_chat',
  'new_comment',
  'feed_comment',
  'feed_reply',
  'event_comment',
  'announcement_comment',
  'update_comment',
  'listing_upvote',
  'listing_downvote',
  'listing_viewed',
  'feed_upvote',
  'feed_downvote',
  'feed_reaction',
  'event_rsvp',
]);

/** Post/listing is primary and commentId is secondary. */
const POST_COMMENT_EVENTS = new Set([
  'feed_comment',
  'feed_reply',
  'new_comment',
  'event_comment',
  'announcement_comment',
  'update_comment',
]);

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function firstDataValue(data: Record<string, string> | undefined, keys: readonly string[]): string {
  if (!data) return '';
  for (const key of keys) {
    const value = data[key]?.trim();
    if (value) return value;
  }
  return '';
}

function instanceIdFromData(eventType: string, data?: Record<string, string>): string {
  if (!data) return '';

  if (eventType === 'new_message' || eventType === 'community_chat' || eventType === 'staff_chat') {
    return data.messageId?.trim() || '';
  }
  if (POST_COMMENT_EVENTS.has(eventType)) {
    return data.commentId?.trim() || '';
  }
  if (eventType === 'listing_viewed') {
    return data.viewerUserId?.trim() || '';
  }
  if (
    eventType === 'listing_upvote' ||
    eventType === 'listing_downvote' ||
    eventType === 'feed_upvote' ||
    eventType === 'feed_downvote' ||
    eventType === 'feed_reaction'
  ) {
    const actor = data.actorUserId?.trim() || data.voterUserId?.trim() || '';
    const target =
      data.listingId?.trim() || data.itemId?.trim() || data.postId?.trim() || data.feedPostId?.trim() || '';
    if (target && actor) return `${target}-${actor}`;
    return actor;
  }
  if (eventType === 'claim_request') {
    return data.claimRequestId?.trim() || data.requestId?.trim() || '';
  }

  return firstDataValue(data, INSTANCE_DATA_KEYS);
}

function parentIdFromData(eventType: string, data?: Record<string, string>): string {
  if (!data) return '';
  if (POST_COMMENT_EVENTS.has(eventType)) {
    return (
      data.postId?.trim() ||
      data.feedPostId?.trim() ||
      data.listingId?.trim() ||
      data.itemId?.trim() ||
      data.eventId?.trim() ||
      data.announcementId?.trim() ||
      data.updateId?.trim() ||
      ''
    );
  }
  return firstDataValue(data, PARENT_DATA_KEYS);
}

/**
 * Longest-prefix-first so `listing-thread-` wins over shorter prefixes.
 */
const TAG_PREFIXES = [
  'announcement-comment-',
  'update-comment-',
  'listing-thread-',
  'saved-comment-',
  'community-msg-',
  'pickup-reminder-',
  'director-listing-',
  'director-claim-',
  'director-dmreq-',
  'director-join-',
  'director-leave-',
  'director-mod-',
  'friend-accepted-',
  'friend-req-',
  'feed-comment-',
  'feed-react-',
  'feed-post-',
  'feed-vote-',
  'event-comment-',
  'event-rsvp-',
  'staff-msg-',
  'pickup-msg-',
  'pickup-status-',
  'claim-req-',
  'dm-accepted-',
  'dm-req-',
  'app-update-',
  'announcement-',
  'go-get-',
  'saved-edit-',
  'fulfilled-',
  'expiring-',
  'expired-',
  'claimed-',
  'gifted-',
  'status-',
  'saved-',
  'comment-',
  'view-',
  'vote-',
  'msg-',
];

/** Derive a unique occurrence id from tags like `msg-abc123` or `community-msg-xyz`. */
export function entityFromLegacyTag(tag: string, eventType: string): string | undefined {
  const trimmed = tag.trim();
  if (!trimmed) return undefined;

  for (const prefix of TAG_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length);
      if (rest) return rest;
    }
  }

  const eventPrefix = `${eventType}-`;
  if (trimmed.startsWith(eventPrefix)) {
    const rest = trimmed.slice(eventPrefix.length);
    if (rest) return rest;
  }

  return undefined;
}

export function computeDedupKey(input: DedupKeyInput): string {
  const { eventType, recipientUserId, tag, entityId, secondaryEntityId, data } = input;

  const tagOccurrence = tag ? entityFromLegacyTag(tag, eventType) : undefined;
  const dataOccurrence = instanceIdFromData(eventType, data);
  const uniqueTag = tag && !tag.includes(':') ? tag.trim() : '';
  const parent = entityId?.trim() || parentIdFromData(eventType, data) || '';
  const occurrence = dataOccurrence || tagOccurrence || '';

  let primary = '';
  let secondary = secondaryEntityId?.trim() || '';

  if (POST_COMMENT_EVENTS.has(eventType) && parent && occurrence && occurrence !== parent) {
    primary = parent;
    if (!secondary) secondary = occurrence;
  } else if (eventType === 'listing_viewed' && parent && occurrence && occurrence !== parent) {
    primary = parent;
    if (!secondary) secondary = occurrence;
  } else if (REPEATABLE_EVENTS.has(eventType) && (occurrence || uniqueTag)) {
    primary = occurrence || uniqueTag;
  } else {
    primary = occurrence || parent || uniqueTag;
  }

  if (!secondary && data) {
    const fromData =
      data.commentId?.trim() ||
      data.messageId?.trim() ||
      data.viewerUserId?.trim() ||
      data.voterUserId?.trim() ||
      data.actorUserId?.trim() ||
      '';
    if (fromData && fromData !== primary) secondary = fromData;
  }

  if (secondary === primary) secondary = '';

  const parts = [sanitizeSegment(eventType), sanitizeSegment(primary)];
  if (secondary) parts.push(sanitizeSegment(secondary));
  parts.push(sanitizeSegment(recipientUserId));

  return parts.filter(Boolean).join(':');
}
