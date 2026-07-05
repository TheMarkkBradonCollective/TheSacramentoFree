import { CommunityEvent, EventRsvpStatus } from '../types';

/** Grace window after start time before an event is treated as past. */
export const EVENT_PAST_GRACE_MS = 3 * 60 * 60 * 1000;

export function isEventPast(event: Pick<CommunityEvent, 'status' | 'eventStartAt'>): boolean {
  if (event.status !== 'active') return true;
  return new Date(event.eventStartAt).getTime() < Date.now() - EVENT_PAST_GRACE_MS;
}

const UPCOMING_STATUSES = new Set<EventRsvpStatus>(['going', 'maybe', 'not_going']);
const PAST_STATUSES = new Set<EventRsvpStatus>(['gone', 'missed']);

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
