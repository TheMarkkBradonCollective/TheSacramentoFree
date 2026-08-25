/**
 * Go Get + Pickup push integration spec.
 *
 * Architecture rule (non-negotiable):
 * > Session state lives in go_get_sessions. Push is an event-delivery layer only.
 * > Never treat a push notification as authoritative state — always re-query Supabase.
 */

export type PushPriority = 'normal' | 'high' | 'critical';

export type PushEventCategory = 'pickup' | 'general';

/** Server-resolved push intent — never trust client recipientIds for Go Get. */
export interface GoGetPushEvent {
  type: string;
  sessionId: string;
  listingId: string;
  actorId?: string;
  recipientIds: string[];
  deepLink: string;
  priority: PushPriority;
  category: 'pickup';
  /** Deterministic idempotency key segment (engine appends recipientId). */
  dedupVersion?: string;
  data?: Record<string, string>;
}

/** All Go Get / pickup events — Android FCM only (never Web Push). */
export const GO_GET_PICKUP_EVENT_TYPES = new Set<string>([
  'go_get_availability_request',
  'go_get_available_now',
  'go_get_schedule_proposed',
  'go_get_schedule_confirmed',
  'go_get_schedule_changed',
  'go_get_pickup_tomorrow',
  'go_get_pickup_in_one_hour',
  'go_get_pickup_thirty_min',
  'go_get_ready_reminder',
  'go_get_fulfiller_ready',
  'go_get_started',
  'on_the_way',
  'go_get_approaching',
  'go_get_arrived',
  'go_get_completed',
  'go_get_cancelled',
  'go_get_ring_expired',
  'go_get_disputed',
  'pickup_scheduled',
  'pickup_reminder',
  'contactless_pickup_arrived',
  'contactless_pickup_left',
]);

export function isPickupCategoryEvent(eventType: string): boolean {
  return GO_GET_PICKUP_EVENT_TYPES.has(eventType);
}

export function goGetDeepLink(sessionId: string): string {
  return `/go-get/${sessionId}`;
}

/** Spec name → implementation event type (backward compatible). */
export const GO_GET_EVENT_ALIASES: Record<string, string> = {
  go_get_requested: 'go_get_availability_request',
  go_get_ring_started: 'go_get_availability_request',
  go_get_available: 'go_get_available_now',
  go_get_trip_started: 'go_get_started',
  go_get_on_the_way: 'on_the_way',
  go_get_handoff_confirmed: 'go_get_completed',
};

export function resolveGoGetEventType(type: string): string {
  return GO_GET_EVENT_ALIASES[type] || type;
}
