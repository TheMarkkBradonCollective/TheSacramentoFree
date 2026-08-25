import type { GoGetSession, GoGetSessionStatus } from '../types';

const TERMINAL_STATUSES: GoGetSessionStatus[] = ['completed', 'cancelled', 'expired', 'disputed'];

const LIVE_QUERY_STATUSES: GoGetSessionStatus[] = [
  'awaiting_availability',
  'awaiting_schedule',
  'window_offered',
  'scheduled',
  'active',
  'arrived',
];

export function isGoGetTripLockStatus(status: GoGetSessionStatus): boolean {
  return LIVE_QUERY_STATUSES.includes(status);
}

/**
 * Whether this user should stay in the full-screen pickup coordinator
 * (schedule, ready, navigation, arrival, handoff) instead of the listing page.
 *
 * Poster incoming ring stays on GoGetIncomingRingOverlay.
 * Instant porch trips lock the picker only — the poster did not accept a meetup.
 */
export function isGoGetTripLocked(session: GoGetSession, userId: string): boolean {
  if (TERMINAL_STATUSES.includes(session.status)) return false;

  const isFulfiller = session.fulfillerUserId === userId;
  const isRequester = session.requesterUserId === userId;
  if (!isFulfiller && !isRequester) return false;

  if (session.status === 'awaiting_availability') return isRequester;
  if (session.status === 'awaiting_schedule' || session.status === 'window_offered') return isRequester;
  if (session.status === 'scheduled') return true;
  if (session.status === 'active') {
    if (session.handshakeMode === 'instant' && isFulfiller) return false;
    return true;
  }
  if (session.status === 'arrived') return true;
  return false;
}

function lockRank(session: GoGetSession): number {
  if (session.status === 'arrived') return 4;
  if (session.status === 'active') return 3;
  if (session.status === 'scheduled') return 2;
  if (session.status === 'awaiting_availability') return 1;
  return 0;
}

/** Prefer the most "live" session when a user somehow has more than one. */
export function pickPreferredLockedGoGetSession(
  sessions: GoGetSession[],
  userId: string,
): GoGetSession | null {
  const locked = sessions.filter((session) => isGoGetTripLocked(session, userId));
  if (locked.length === 0) return null;
  return locked.sort((a, b) => {
    const rank = lockRank(b) - lockRank(a);
    if (rank !== 0) return rank;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })[0];
}
