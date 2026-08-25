/**
 * Notification priority and delivery metadata.
 * Every event type maps to a priority and delivery mode so the engine
 * can decide inbox vs push without each caller re-implementing rules.
 */

export type NotificationPriority = 'silent' | 'normal' | 'important' | 'urgent';

export type DeliveryMode = 'in_app' | 'push' | 'push_and_in_app' | 'urgent_push';

export type AndroidNotificationChannel =
  | 'messages'
  | 'listings'
  | 'community'
  | 'pickup'
  | 'account'
  | 'staff'
  | 'urgent';

export type NotificationEventType =
  | 'new_item'
  | 'new_request'
  | 'item_claimed'
  | 'item_gifted'
  | 'pickup_scheduled'
  | 'pickup_reminder'
  | 'on_the_way'
  | 'new_message'
  | 'community_chat'
  | 'staff_chat'
  | 'message_request'
  | 'message_request_accepted'
  | 'new_comment'
  | 'listing_upvote'
  | 'listing_downvote'
  | 'listing_approved'
  | 'listing_denied'
  | 'listing_expiring'
  | 'listing_expired'
  | 'nearby_item'
  | 'nearby_request'
  | 'claim_request'
  | 'request_fulfilled'
  | 'announcement'
  | 'app_update'
  | 'account_update'
  | 'support_reply'
  | 'staff_support'
  | 'staff_report'
  | 'director_alert'
  | 'saved_item_update'
  | 'listing_status'
  | 'go_get_availability_request'
  | 'go_get_available_now'
  | 'go_get_schedule_proposed'
  | 'go_get_schedule_confirmed'
  | 'go_get_pickup_tomorrow'
  | 'go_get_pickup_in_one_hour'
  | 'go_get_ready_reminder'
  | 'go_get_fulfiller_ready'
  | 'go_get_started'
  | 'go_get_arrived'
  | 'go_get_completed'
  | 'go_get_cancelled'
  | 'contactless_pickup_arrived'
  | 'contactless_pickup_left'
  | 'feed_comment'
  | 'feed_reaction'
  | 'feed_upvote'
  | 'feed_downvote'
  | 'feed_post'
  | 'feed_reply'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'award_unlocked'
  | 'event_rsvp'
  | 'event_comment'
  | 'announcement_comment'
  | 'update_comment'
  | 'violation_filed'
  | 'violation_decision'
  | 'account_locked'
  | 'appeal_decision';

export interface EventMetadata {
  priority: NotificationPriority;
  deliveryMode: DeliveryMode;
  androidChannel: AndroidNotificationChannel;
  /** Urgent events bypass quiet hours when quietHoursAllowUrgent is enabled. */
  bypassQuietHours?: boolean;
  /** Milliseconds after creation when inbox rows may be purged (future use). */
  expiresAfterMs?: number;
}

const DEFAULT_METADATA: EventMetadata = {
  priority: 'normal',
  deliveryMode: 'push_and_in_app',
  androidChannel: 'community',
};

/** Per-event priority, delivery mode, and Android channel. */
export const EVENT_METADATA: Record<NotificationEventType, EventMetadata> = {
  // Listings — discovery
  new_item: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  new_request: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  nearby_item: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  nearby_request: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  feed_post: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },

  // Listings — your items (important)
  item_claimed: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  item_gifted: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  claim_request: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  request_fulfilled: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  saved_item_update: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  listing_status: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  listing_expiring: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  listing_expired: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  listing_approved: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  listing_denied: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },

  // Votes & reactions — in-app only (no push spam)
  listing_upvote: { priority: 'silent', deliveryMode: 'in_app', androidChannel: 'listings' },
  listing_downvote: { priority: 'silent', deliveryMode: 'in_app', androidChannel: 'listings' },
  feed_upvote: { priority: 'silent', deliveryMode: 'in_app', androidChannel: 'community' },
  feed_downvote: { priority: 'silent', deliveryMode: 'in_app', androidChannel: 'community' },
  feed_reaction: { priority: 'silent', deliveryMode: 'in_app', androidChannel: 'community' },

  // Comments — normal push
  new_comment: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'listings' },
  feed_comment: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },
  feed_reply: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },

  // Messages
  new_message: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'messages' },
  message_request: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'messages' },
  message_request_accepted: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'messages' },
  community_chat: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },
  staff_chat: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'staff' },
  friend_request: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'messages' },
  friend_request_accepted: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'messages' },

  // Pickup & Go Get — important/urgent
  pickup_scheduled: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup', bypassQuietHours: true },
  pickup_reminder: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup', bypassQuietHours: true },
  on_the_way: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'urgent', bypassQuietHours: true },
  go_get_availability_request: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'urgent', bypassQuietHours: true },
  go_get_available_now: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup', bypassQuietHours: true },
  go_get_schedule_proposed: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup' },
  go_get_schedule_confirmed: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup' },
  go_get_pickup_tomorrow: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup', bypassQuietHours: true },
  go_get_pickup_in_one_hour: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup', bypassQuietHours: true },
  go_get_ready_reminder: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup', bypassQuietHours: true },
  go_get_fulfiller_ready: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup' },
  go_get_started: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'urgent', bypassQuietHours: true },
  go_get_arrived: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'urgent', bypassQuietHours: true },
  go_get_completed: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'pickup' },
  go_get_cancelled: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'pickup' },
  contactless_pickup_arrived: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'urgent', bypassQuietHours: true },
  contactless_pickup_left: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'pickup' },

  // Community news
  announcement: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },
  app_update: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },
  announcement_comment: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },
  update_comment: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },

  // Events & awards
  event_rsvp: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },
  event_comment: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },
  award_unlocked: { priority: 'normal', deliveryMode: 'push_and_in_app', androidChannel: 'community' },

  // Account & safety — urgent
  account_update: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'account', bypassQuietHours: true },
  support_reply: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'account' },
  violation_filed: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'account', bypassQuietHours: true },
  violation_decision: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'account', bypassQuietHours: true },
  account_locked: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'account', bypassQuietHours: true },
  appeal_decision: { priority: 'urgent', deliveryMode: 'urgent_push', androidChannel: 'account', bypassQuietHours: true },

  // Staff
  staff_support: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'staff' },
  staff_report: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'staff' },
  director_alert: { priority: 'important', deliveryMode: 'push_and_in_app', androidChannel: 'staff' },
};

export function getEventMetadata(eventType: string): EventMetadata {
  return EVENT_METADATA[eventType as NotificationEventType] ?? DEFAULT_METADATA;
}

export function shouldDeliverPush(deliveryMode: DeliveryMode): boolean {
  return deliveryMode === 'push' || deliveryMode === 'push_and_in_app' || deliveryMode === 'urgent_push';
}

export function shouldDeliverInApp(deliveryMode: DeliveryMode): boolean {
  return deliveryMode === 'in_app' || deliveryMode === 'push_and_in_app' || deliveryMode === 'urgent_push';
}

export function webPushUrgency(priority: NotificationPriority): 'high' | 'normal' {
  return priority === 'important' || priority === 'urgent' ? 'high' : 'normal';
}

export function fcmAndroidPriority(priority: NotificationPriority): 'high' | 'normal' {
  return priority === 'urgent' || priority === 'important' ? 'high' : 'normal';
}
