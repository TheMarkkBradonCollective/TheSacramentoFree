import { CommunityEvent, EventRsvpStatus, EventStatus } from '../types';

/** Grace window after start time before an event is treated as past. */
export const EVENT_PAST_GRACE_MS = 3 * 60 * 60 * 1000;

const UPCOMING_STATUSES = new Set<EventRsvpStatus>(['going', 'maybe', 'not_going']);
const PAST_STATUSES = new Set<EventRsvpStatus>(['gone', 'missed']);

/** Map legacy DB values to the current status vocabulary. */
export function normalizeStoredEventStatus(status: string | undefined | null): EventStatus | 'active' {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'past') return 'past';
  if (status === 'upcoming') return 'upcoming';
  if (status === 'active') return 'active';
  return 'upcoming';
}

function isStartTimePast(eventStartAt: string): boolean {
  return new Date(eventStartAt).getTime() < Date.now() - EVENT_PAST_GRACE_MS;
}

/** Effective status used across the app (date-aware for upcoming events). */
export function resolveEventStatus(
  event: Pick<CommunityEvent, 'status' | 'eventStartAt'>,
): EventStatus {
  const stored = normalizeStoredEventStatus(event.status);
  if (stored === 'cancelled') return 'cancelled';
  if (stored === 'past') return 'past';
  if (isStartTimePast(event.eventStartAt)) return 'past';
  return 'upcoming';
}

export function isEventUpcoming(event: Pick<CommunityEvent, 'status' | 'eventStartAt'>): boolean {
  return resolveEventStatus(event) === 'upcoming';
}

export function isEventCancelled(event: Pick<CommunityEvent, 'status'>): boolean {
  return normalizeStoredEventStatus(event.status) === 'cancelled';
}

export function isEventPast(event: Pick<CommunityEvent, 'status' | 'eventStartAt'>): boolean {
  return resolveEventStatus(event) !== 'upcoming';
}

export function isEventEditable(event: Pick<CommunityEvent, 'status' | 'eventStartAt'>): boolean {
  return resolveEventStatus(event) === 'upcoming';
}

export function eventStatusLabel(status: EventStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Upcoming';
    case 'past':
      return 'Past';
    case 'cancelled':
      return 'Cancelled';
  }
}

/** Match listing status pill styles from `sbn-badge` in index.css. */
export function getEventStatusBadgeClass(status: EventStatus): string {
  switch (status) {
    case 'upcoming':
      return '';
    case 'past':
      return 'sbn-badge-done';
    case 'cancelled':
      return 'sbn-badge-withdrawn';
  }
}

export function isUpcomingRsvpStatus(status: EventRsvpStatus): boolean {
  return UPCOMING_STATUSES.has(status);
}

export function isPastRsvpStatus(status: EventRsvpStatus): boolean {
  return PAST_STATUSES.has(status);
}

/** Map legacy pre-event RSVP to how it should read once the event has passed. */
export function legacyRsvpToPast(status: EventRsvpStatus): EventRsvpStatus {
  if (status === 'going') return 'gone';
  if (status === 'maybe' || status === 'not_going') return 'missed';
  return status;
}

/** Status shown/selected in the UI for a past event (includes legacy mapping). */
export function effectivePastRsvp(status: EventRsvpStatus | null): EventRsvpStatus | null {
  if (!status) return null;
  if (isPastRsvpStatus(status)) return status;
  if (isUpcomingRsvpStatus(status)) return legacyRsvpToPast(status);
  return status;
}

export function countPastRsvps(
  statuses: EventRsvpStatus[],
): { gone: number; missed: number } {
  let gone = 0;
  let missed = 0;
  for (const status of statuses) {
    const effective = effectivePastRsvp(status);
    if (effective === 'gone') gone += 1;
    else if (effective === 'missed') missed += 1;
  }
  return { gone, missed };
}
