import type { GoGetSession, GoGetSessionStatus } from '../types';
import { DEFAULT_READY_WINDOW_MINUTES, PICKUP_MODE_CONFIG, normalizeCoordinationMode } from './pickupEngine';

export type PickupTransitionAction =
  | 'expire_ring'
  | 'abandon_ring'
  | 'available_now'
  | 'decline'
  | 'propose_window'
  | 'pick_time'
  | 'propose_schedule'
  | 'mark_ready'
  | 'start_trip'
  | 'mark_arrived'
  | 'confirm_complete'
  | 'dispute'
  | 'cancel';

export type PickupActorRole = 'requester' | 'fulfiller' | 'staff';

const TERMINAL: ReadonlySet<GoGetSessionStatus> = new Set([
  'completed',
  'cancelled',
  'expired',
  'disputed',
]);

/** Allowed from → to for each action. Empty array means "any non-terminal". */
const ACTION_TRANSITIONS: Record<PickupTransitionAction, { from: GoGetSessionStatus[]; to: GoGetSessionStatus }> = {
  expire_ring: { from: ['awaiting_availability'], to: 'awaiting_schedule' },
  abandon_ring: { from: ['awaiting_availability'], to: 'cancelled' },
  available_now: { from: ['awaiting_availability'], to: 'scheduled' },
  decline: { from: ['awaiting_availability'], to: 'cancelled' },
  propose_window: { from: ['awaiting_availability'], to: 'window_offered' },
  pick_time: { from: ['window_offered'], to: 'scheduled' },
  propose_schedule: { from: ['awaiting_schedule'], to: 'scheduled' },
  mark_ready: { from: ['scheduled'], to: 'scheduled' },
  start_trip: { from: ['scheduled'], to: 'active' },
  mark_arrived: { from: ['active'], to: 'arrived' },
  confirm_complete: { from: ['arrived'], to: 'completed' },
  dispute: { from: ['arrived'], to: 'disputed' },
  cancel: { from: [], to: 'cancelled' },
};

const ACTION_ROLES: Record<PickupTransitionAction, PickupActorRole[]> = {
  expire_ring: ['requester', 'fulfiller', 'staff'],
  abandon_ring: ['requester', 'fulfiller', 'staff'],
  available_now: ['fulfiller', 'staff'],
  decline: ['fulfiller', 'staff'],
  propose_window: ['fulfiller', 'staff'],
  pick_time: ['requester', 'staff'],
  propose_schedule: ['requester', 'staff'],
  mark_ready: ['fulfiller', 'staff'],
  start_trip: ['requester', 'fulfiller', 'staff'],
  mark_arrived: ['requester', 'fulfiller', 'staff'],
  confirm_complete: ['fulfiller', 'staff'],
  dispute: ['requester', 'fulfiller', 'staff'],
  cancel: ['requester', 'fulfiller', 'staff'],
};

export function isTerminalPickupStatus(status: GoGetSessionStatus): boolean {
  return TERMINAL.has(status);
}

export function roleForPickupSession(
  session: Pick<GoGetSession, 'fulfillerUserId' | 'requesterUserId'>,
  userId: string,
  isStaff = false,
): PickupActorRole | null {
  if (session.fulfillerUserId === userId) return 'fulfiller';
  if (session.requesterUserId === userId) return 'requester';
  if (isStaff) return 'staff';
  return null;
}

export function travelerUserId(
  session: Pick<GoGetSession, 'fulfillerUserId' | 'requesterUserId' | 'coordinationMode'>,
): string {
  const mode = normalizeCoordinationMode(session.coordinationMode);
  return PICKUP_MODE_CONFIG[mode].travelerRole === 'fulfiller'
    ? session.fulfillerUserId
    : session.requesterUserId;
}

export function waiterUserId(
  session: Pick<GoGetSession, 'fulfillerUserId' | 'requesterUserId' | 'coordinationMode'>,
): string {
  const traveler = travelerUserId(session);
  return traveler === session.requesterUserId ? session.fulfillerUserId : session.requesterUserId;
}

export function readyWindowMinutesForSession(session: Pick<GoGetSession, 'readyWindowMinutes'>): number {
  const raw = session.readyWindowMinutes;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 5 && raw <= 60) return raw;
  return DEFAULT_READY_WINDOW_MINUTES;
}

export function getReadyWindowBounds(
  scheduledAt: string,
  windowMinutes = DEFAULT_READY_WINDOW_MINUTES,
): { start: Date; end: Date } | null {
  const at = new Date(scheduledAt);
  if (Number.isNaN(at.getTime())) return null;
  const ms = windowMinutes * 60 * 1000;
  return {
    start: new Date(at.getTime() - ms),
    end: new Date(at.getTime() + ms),
  };
}

/** Ready / start-trip is allowed from (scheduled − window) onward. Late pickups stay allowed. */
export function isWithinReadyWindow(
  scheduledAt: string | null | undefined,
  now = new Date(),
  windowMinutes = DEFAULT_READY_WINDOW_MINUTES,
): boolean {
  if (!scheduledAt) return false;
  const bounds = getReadyWindowBounds(scheduledAt, windowMinutes);
  if (!bounds) return false;
  return now.getTime() >= bounds.start.getTime();
}

/** Block starting navigation hours before the scheduled time. */
export function isTooEarlyToStartTrip(
  scheduledAt: string | null | undefined,
  now = new Date(),
  windowMinutes = DEFAULT_READY_WINDOW_MINUTES,
): boolean {
  return !isWithinReadyWindow(scheduledAt, now, windowMinutes);
}

export type PickupTransitionCheck =
  | { ok: true; nextStatus: GoGetSessionStatus }
  | { ok: false; error: string };

export function canPerformPickupAction(params: {
  session: GoGetSession;
  action: PickupTransitionAction;
  actorUserId: string;
  isStaff?: boolean;
  now?: Date;
  cancelReason?: string;
}): PickupTransitionCheck {
  const { session, action, actorUserId } = params;
  const now = params.now ?? new Date();
  const role = roleForPickupSession(session, actorUserId, params.isStaff === true);
  if (!role) return { ok: false, error: 'You are not part of this pickup.' };

  if (!ACTION_ROLES[action].includes(role)) {
    return { ok: false, error: 'That action is not available for your role.' };
  }

  if (action !== 'cancel' && isTerminalPickupStatus(session.status)) {
    return { ok: false, error: 'This pickup is already finished.' };
  }

  const spec = ACTION_TRANSITIONS[action];
  if (action === 'cancel') {
    if (isTerminalPickupStatus(session.status)) {
      return { ok: false, error: 'This pickup is already finished.' };
    }
    if (cancelRequiresReason(session.status) && !params.cancelReason?.trim()) {
      return { ok: false, error: 'Choose a reason to cancel this pickup.' };
    }
    return { ok: true, nextStatus: 'cancelled' };
  }

  if (spec.from.length > 0 && !spec.from.includes(session.status)) {
    return { ok: false, error: actionErrorForStatus(action, session.status) };
  }

  if (action === 'mark_ready') {
    if (session.fulfillerReadyAt) return { ok: false, error: 'Already marked ready.' };
    if (isTooEarlyToStartTrip(session.scheduledAt, now, readyWindowMinutesForSession(session))) {
      return { ok: false, error: 'Too early to mark ready. Wait until the pickup window opens.' };
    }
  }

  if (action === 'start_trip') {
    if (!session.fulfillerReadyAt) {
      return { ok: false, error: `${session.fulfillerName} hasn't confirmed they're ready yet.` };
    }
    if (isTooEarlyToStartTrip(session.scheduledAt, now, readyWindowMinutesForSession(session))) {
      return { ok: false, error: 'Too early to start this pickup.' };
    }
    const bothTravel = PICKUP_MODE_CONFIG[normalizeCoordinationMode(session.coordinationMode)].bothTravel;
    if (!bothTravel && role === 'fulfiller') {
      return { ok: false, error: 'Waiting for the other neighbor to start heading over.' };
    }
  }

  if (action === 'mark_arrived') {
    const bothTravel = PICKUP_MODE_CONFIG[normalizeCoordinationMode(session.coordinationMode)].bothTravel;
    if (!bothTravel && role === 'fulfiller') {
      return { ok: false, error: 'The neighbor on the way confirms arrival.' };
    }
  }

  if (action === 'expire_ring') {
    const expires = session.ringExpiresAt ? new Date(session.ringExpiresAt).getTime() : 0;
    if (expires && now.getTime() < expires) {
      return { ok: false, error: 'Still waiting for a response.' };
    }
  }

  return { ok: true, nextStatus: spec.to };
}

function actionErrorForStatus(action: PickupTransitionAction, status: GoGetSessionStatus): string {
  switch (action) {
    case 'expire_ring':
    case 'abandon_ring':
    case 'available_now':
    case 'decline':
    case 'propose_window':
      return status === 'awaiting_availability'
        ? 'This request was already answered.'
        : 'This request is no longer ringing.';
    case 'pick_time':
      return 'This pickup is not awaiting a scheduled time.';
    case 'propose_schedule':
      return 'This pickup is not awaiting a scheduled time.';
    case 'mark_ready':
      return 'Nothing to confirm right now.';
    case 'start_trip':
      return 'This pickup is not ready to start.';
    case 'mark_arrived':
      return 'This trip is not active.';
    case 'confirm_complete':
    case 'dispute':
      return 'Nothing to confirm yet.';
    default:
      return 'This pickup cannot be updated right now.';
  }
}

export function cancelRequiresReason(status: GoGetSessionStatus): boolean {
  return status === 'scheduled' || status === 'active' || status === 'arrived';
}
