/**
 * Go Get pickup notification state machine.
 * Notifications attach to session status transitions — not ad-hoc one-offs.
 */

export type GoGetSessionStatus =
  | 'awaiting_availability'
  | 'awaiting_schedule'
  | 'window_offered'
  | 'scheduled'
  | 'active'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed';

export type GoGetPushEventType =
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
  | 'contactless_pickup_left';

/** Cron-driven advance reminders for scheduled pickups. */
export const GO_GET_SCHEDULED_REMINDER_EVENTS = new Set<GoGetPushEventType>([
  'go_get_pickup_tomorrow',
  'go_get_pickup_in_one_hour',
  'go_get_ready_reminder',
]);

/** Live-trip events — always bypass quiet hours and use urgent channel when applicable. */
export const GO_GET_LIVE_TRIP_EVENTS = new Set<GoGetPushEventType>([
  'go_get_availability_request',
  'go_get_started',
  'go_get_arrived',
  'contactless_pickup_arrived',
]);

export interface GoGetSessionSnapshot {
  id: string;
  itemId: string;
  fulfillerUserId: string;
  fulfillerName: string;
  requesterUserId: string;
  requesterName: string;
  status: GoGetSessionStatus;
  handshakeMode?: string;
  scheduledAt?: string | null;
  fulfillerReadyAt?: string | null;
  startedAt?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  ringDurationSeconds?: number | null;
}

export interface GoGetTransition {
  eventType: GoGetPushEventType;
  recipientUserId: string;
  tag: string;
}

function otherParty(session: GoGetSessionSnapshot, actorUserId: string): string {
  return actorUserId === session.requesterUserId ? session.fulfillerUserId : session.requesterUserId;
}

/**
 * Map a session status transition to the notification that should fire.
 * Returns null when no push is warranted (dedup + engine handle the rest).
 */
export function goGetTransitionFromStatusChange(
  session: GoGetSessionSnapshot,
  previous: Partial<GoGetSessionSnapshot>,
): GoGetTransition | null {
  const prevStatus = previous.status;
  const nextStatus = session.status;
  if (!prevStatus || prevStatus === nextStatus) return null;

  const sessionId = session.id;
  const base = { sessionId, listingId: session.itemId };

  if (nextStatus === 'cancelled') {
    const cancelledBy = session.cancelledByUserId || '';
    const recipient = cancelledBy ? otherParty(session, cancelledBy) : session.requesterUserId;
    return {
      eventType: 'go_get_cancelled',
      recipientUserId: recipient,
      tag: `go-get-cancelled-${sessionId}`,
    };
  }

  if (prevStatus !== 'active' && nextStatus === 'active' && session.startedAt) {
    return {
      eventType: 'go_get_started',
      recipientUserId: session.fulfillerUserId,
      tag: `go-get-started-${sessionId}`,
    };
  }

  if (prevStatus !== 'arrived' && nextStatus === 'arrived') {
    return {
      eventType: 'go_get_arrived',
      recipientUserId: session.fulfillerUserId,
      tag: `go-get-arrived-${sessionId}`,
    };
  }

  if (nextStatus === 'completed') {
    return {
      eventType: 'go_get_completed',
      recipientUserId: session.requesterUserId,
      tag: `go-get-completed-${sessionId}`,
    };
  }

  if (prevStatus === 'awaiting_schedule' && nextStatus === 'scheduled') {
    return {
      eventType: 'go_get_schedule_confirmed',
      recipientUserId: session.fulfillerUserId,
      tag: `go-get-confirmed-${sessionId}`,
    };
  }

  if (prevStatus === 'awaiting_availability' && nextStatus === 'scheduled') {
    const scheduledMs = session.scheduledAt ? new Date(session.scheduledAt).getTime() : 0;
    const isImmediate = scheduledMs > 0 && Math.abs(scheduledMs - Date.now()) < 5 * 60 * 1000;
    return {
      eventType: isImmediate ? 'go_get_available_now' : 'go_get_schedule_confirmed',
      recipientUserId: isImmediate ? session.requesterUserId : session.fulfillerUserId,
      tag: isImmediate ? `go-get-available-${sessionId}` : `go-get-confirmed-${sessionId}`,
    };
  }

  void base;
  return null;
}

/** Fulfiller tapped Ready — requester can start the trip. */
export function goGetFulfillerReadyTransition(session: GoGetSessionSnapshot): GoGetTransition {
  return {
    eventType: 'go_get_fulfiller_ready',
    recipientUserId: session.requesterUserId,
    tag: `go-get-fulfiller-ready-${session.id}`,
  };
}

/** New live ring — fulfiller must answer availability. */
export function goGetAvailabilityRequestTransition(session: GoGetSessionSnapshot): GoGetTransition {
  return {
    eventType: 'go_get_availability_request',
    recipientUserId: session.fulfillerUserId,
    tag: `go-get-availability-${session.id}`,
  };
}

export function formatGoGetWhenLabel(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return 'soon';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
