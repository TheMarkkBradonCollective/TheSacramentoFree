import type { CoordinationMode, GoGetHandshakeMode, ItemPost } from '../types';

export type { CoordinationMode };

/**
 * Unified pickup coordination modes. UI labels differ; one engine powers all of them.
 * Curb Alert stays first-come (navigation only). Other modes share the session lifecycle.
 */
export type PickupTravelerRole = 'requester' | 'fulfiller';

export interface PickupModeConfig {
  mode: CoordinationMode;
  label: string;
  handshakeMode: GoGetHandshakeMode;
  availability: boolean;
  schedule: boolean;
  navigation: boolean;
  liveLocation: boolean;
  handoff: boolean;
  /** Who typically travels to the pin. Meet-up sets bothTravel so both neighbors navigate. */
  travelerRole: PickupTravelerRole;
  bothTravel: boolean;
}

export const PICKUP_MODE_CONFIG: Record<CoordinationMode, PickupModeConfig> = {
  go_get: {
    mode: 'go_get',
    label: 'Go Get',
    handshakeMode: 'availability',
    availability: true,
    schedule: true,
    navigation: true,
    liveLocation: true,
    handoff: true,
    travelerRole: 'requester',
    bothTravel: true,
  },
  curb_alert: {
    mode: 'curb_alert',
    label: 'Pick Up',
    handshakeMode: 'instant',
    availability: false,
    schedule: false,
    navigation: true,
    liveLocation: false,
    handoff: false,
    travelerRole: 'requester',
    bothTravel: false,
  },
  porch_pickup: {
    mode: 'porch_pickup',
    label: 'Go Get',
    handshakeMode: 'instant',
    availability: false,
    schedule: false,
    navigation: true,
    liveLocation: true,
    handoff: true,
    travelerRole: 'requester',
    bothTravel: false,
  },
  drop_off: {
    mode: 'drop_off',
    label: 'Drop off',
    handshakeMode: 'availability',
    availability: true,
    schedule: true,
    navigation: true,
    liveLocation: true,
    handoff: true,
    // Looking poster waits (fulfiller). Neighbor bringing the item travels (requester in DB).
    travelerRole: 'requester',
    bothTravel: true,
  },
  meet_up: {
    mode: 'meet_up',
    label: 'Meet up',
    handshakeMode: 'availability',
    availability: true,
    schedule: true,
    navigation: true,
    liveLocation: true,
    handoff: true,
    travelerRole: 'requester',
    bothTravel: true,
  },
};

export function coordinationModeFromItem(item: Pick<ItemPost, 'type' | 'category'>): CoordinationMode {
  if (item.type === 'looking') return 'drop_off';
  if (item.type === 'trade') return 'meet_up';
  if (item.type === 'giveaway' && item.category === 'Curb Alert') return 'curb_alert';
  if (item.type === 'giveaway' && item.category === 'Porch Pickup') return 'porch_pickup';
  return 'go_get';
}

export function pickupModeConfigForItem(item: Pick<ItemPost, 'type' | 'category'>): PickupModeConfig {
  return PICKUP_MODE_CONFIG[coordinationModeFromItem(item)];
}

export function handshakeModeForCoordination(mode: CoordinationMode): GoGetHandshakeMode {
  return PICKUP_MODE_CONFIG[mode].handshakeMode;
}

export function normalizeCoordinationMode(raw: unknown): CoordinationMode {
  if (
    raw === 'go_get' ||
    raw === 'curb_alert' ||
    raw === 'porch_pickup' ||
    raw === 'drop_off' ||
    raw === 'meet_up'
  ) {
    return raw;
  }
  return 'go_get';
}

export function isInstantPickupMode(mode: CoordinationMode): boolean {
  return PICKUP_MODE_CONFIG[mode].handshakeMode === 'instant';
}

/** Curb Alert: navigate to the pin with no session handshake. */
export function isNavigationOnlyMode(mode: CoordinationMode): boolean {
  return mode === 'curb_alert';
}

export function formatRingCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatPickupCountdown(
  scheduledAt: string,
  now = new Date(),
  eventNoun = 'Pickup',
): string {
  const target = new Date(scheduledAt).getTime();
  if (Number.isNaN(target)) return '';
  const deltaMs = target - now.getTime();
  if (deltaMs <= 0) return `${eventNoun} time is here`;
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return `${eventNoun} in under a minute`;
  if (minutes === 1) return `${eventNoun} in 1 minute`;
  if (minutes < 120) return `${eventNoun} in ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return `${eventNoun} in 1 hour`;
  return `${eventNoun} in ${hours} hours`;
}

export function formatScheduledWhen(scheduledAt: string): string {
  const at = new Date(scheduledAt);
  if (Number.isNaN(at.getTime())) return '';
  const now = new Date();
  const sameDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    at.getFullYear() === tomorrow.getFullYear() &&
    at.getMonth() === tomorrow.getMonth() &&
    at.getDate() === tomorrow.getDate();
  const time = at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return at.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const DEFAULT_READY_WINDOW_MINUTES = 15;
export const ARRIVAL_GEOFENCE_METERS = 120;
export const NO_SHOW_WAIT_MS = 5 * 60 * 1000;
export const APPROACHING_ETA_SECONDS = 90;

export type PickupStartAction = 'navigate_only' | 'create_session';

/** What tapping the listing coordination button should do. */
export function pickupStartActionForItem(item: Pick<ItemPost, 'type' | 'category' | 'status'>): PickupStartAction {
  if (item.status !== 'active') return 'create_session';
  if (isNavigationOnlyMode(coordinationModeFromItem(item))) return 'navigate_only';
  return 'create_session';
}
