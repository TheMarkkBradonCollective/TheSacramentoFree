/**
 * Deterministic dedup keys for the notification engine.
 * Format: {eventType}:{entityId}:{secondaryEntityId?}:{recipientUserId}
 *
 * Per-recipient keys prevent fan-out collisions and let client + webhook
 * paths deduplicate reliably without a time window.
 */

export interface DedupKeyInput {
  eventType: string;
  recipientUserId: string;
  tag?: string;
  entityId?: string;
  secondaryEntityId?: string;
  data?: Record<string, string>;
}

const ENTITY_DATA_KEYS = [
  'messageId',
  'goGetSessionId',
  'sessionId',
  'claimRequestId',
  'commentId',
  'postId',
  'requestId',
  'sessionId',
  'listingId',
  'itemId',
  'conversationId',
  'eventId',
  'ticketId',
  'awardId',
] as const;

/** Event types where postId should be primary and commentId secondary. */
const POST_COMMENT_EVENTS = new Set(['feed_comment', 'feed_reply', 'new_comment', 'event_comment', 'announcement_comment', 'update_comment']);

function primaryEntityForEvent(eventType: string, data?: Record<string, string>): string {
  if (!data) return '';
  if (POST_COMMENT_EVENTS.has(eventType)) {
    return data.postId?.trim() || data.listingId?.trim() || data.itemId?.trim() || '';
  }
  return primaryEntityFromData(data);
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function primaryEntityFromData(data?: Record<string, string>, exclude?: string): string {
  if (!data) return '';
  for (const key of ENTITY_DATA_KEYS) {
    const value = data[key]?.trim();
    if (value && value !== exclude) return value;
  }
  return '';
}

function secondaryEntityFromData(data?: Record<string, string>, primary?: string): string {
  if (!data) return '';
  const commentId = data.commentId?.trim();
  if (commentId && commentId !== primary) return commentId;
  const messageId = data.messageId?.trim();
  if (messageId && messageId !== primary) return messageId;
  return '';
}

/**
 * Derive entity id from legacy tag patterns like `msg-abc123` or `claimed-item_xyz`.
 */
function entityFromLegacyTag(tag: string, eventType: string): string | undefined {
  const trimmed = tag.trim();
  if (!trimmed) return undefined;

  const prefixes = [
    'msg-',
    'claimed-',
    'gifted-',
    'claim-req-',
    'dm-req-',
    'dm-accepted-',
    'vote-',
    'feed-vote-',
  ];
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }

  const eventPrefix = `${eventType}-`;
  if (trimmed.startsWith(eventPrefix)) return trimmed.slice(eventPrefix.length);

  return undefined;
}

export function computeDedupKey(input: DedupKeyInput): string {
  const { eventType, recipientUserId, tag, entityId, secondaryEntityId, data } = input;

  const fromTag = tag ? entityFromLegacyTag(tag, eventType) : undefined;
  const primary =
    entityId?.trim() ||
    fromTag ||
    primaryEntityForEvent(eventType, data) ||
    (tag && !tag.includes(':') ? tag : '');

  const secondary = secondaryEntityId?.trim() || secondaryEntityFromData(data, primary);

  const parts = [sanitizeSegment(eventType), sanitizeSegment(primary)];
  if (secondary) parts.push(sanitizeSegment(secondary));
  parts.push(sanitizeSegment(recipientUserId));

  return parts.filter(Boolean).join(':');
}
