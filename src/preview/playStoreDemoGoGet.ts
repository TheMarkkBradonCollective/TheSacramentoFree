/**
 * Fictional Go Get pickup coordination fixtures for Play Store screenshots.
 * Sacramento landmarks only — never live member locations.
 */
import type { GoGetFulfillerLiveLocation, GoGetLiveLocation, GoGetSession, UserProfile } from '../types';
import { PLAY_STORE_DEMO_ITEMS, PLAY_STORE_DEMO_PROFILE, isPlayStoreDemo } from './playStoreDemo';

export const DEMO_GOGET_SESSION_ID = 'demo-goget-chair';

/** Major Sacramento locations used in mock pickup flows. */
export const SACRAMENTO_LOCATIONS = {
  capitol: { lat: 38.5767, lng: -121.4934, label: 'California State Capitol' },
  midtown: { lat: 38.575, lng: -121.483, label: 'Midtown Sacramento' },
  eastSac: { lat: 38.567, lng: -121.459, label: 'East Sacramento' },
  towerBridge: { lat: 38.5804, lng: -121.5063, label: 'Tower Bridge' },
  landPark: { lat: 38.54, lng: -121.498, label: 'Land Park' },
  curtisPark: { lat: 38.5596, lng: -121.4714, label: 'Curtis Park' },
  oakPark: { lat: 38.549, lng: -121.456, label: 'Oak Park' },
  downtown: { lat: 38.5816, lng: -121.4944, label: 'Downtown Sacramento' },
} as const;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function avatar(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}

export const DEMO_GOGET_AVERY_PROFILE: UserProfile = {
  uid: 'demo-neighbor-avery',
  displayName: 'Avery Quinn',
  email: 'avery.quinn.demo@example.com',
  neighborhood: 'East Sacramento',
  bio: 'East Sac neighbor — porch pickups welcome.',
  photoURL: avatar('Avery Quinn'),
  role: 'user',
  accountStatus: 'active',
  goGetEnabled: true,
  createdAt: hoursAgo(24 * 60),
  lastActiveAt: hoursAgo(0.5),
};

export const DEMO_GOGET_JORDAN_PROFILE: UserProfile = {
  uid: 'demo-neighbor-jordan',
  displayName: 'Jordan Hale',
  email: 'jordan.hale.demo@example.com',
  neighborhood: 'Midtown',
  photoURL: avatar('Jordan Hale'),
  role: 'user',
  accountStatus: 'active',
  goGetEnabled: true,
  createdAt: hoursAgo(24 * 45),
  lastActiveAt: hoursAgo(1),
};

export const DEMO_GOGET_RILEY_PROFILE: UserProfile = {
  uid: 'demo-neighbor-riley',
  displayName: 'Riley Nguyen',
  email: 'riley.nguyen.demo@example.com',
  neighborhood: 'Land Park',
  photoURL: avatar('Riley Nguyen'),
  role: 'user',
  accountStatus: 'active',
  goGetEnabled: true,
  createdAt: hoursAgo(24 * 35),
  lastActiveAt: hoursAgo(2),
};

const DEMO_PROFILES: Record<string, UserProfile> = {
  [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE,
  [DEMO_GOGET_AVERY_PROFILE.uid]: DEMO_GOGET_AVERY_PROFILE,
  [DEMO_GOGET_JORDAN_PROFILE.uid]: DEMO_GOGET_JORDAN_PROFILE,
  [DEMO_GOGET_RILEY_PROFILE.uid]: DEMO_GOGET_RILEY_PROFILE,
};

export function getPlayStoreDemoProfile(uid: string): UserProfile | null {
  return DEMO_PROFILES[uid] ?? null;
}

export function getPlayStoreDemoItemById(itemId: string) {
  return PLAY_STORE_DEMO_ITEMS.find((item) => item.id === itemId) ?? null;
}

function baseChairSession(overrides: Partial<GoGetSession>): GoGetSession {
  return {
    id: DEMO_GOGET_SESSION_ID,
    itemId: 'demo-item-chair',
    itemType: 'giveaway',
    fulfillerUserId: DEMO_GOGET_AVERY_PROFILE.uid,
    fulfillerName: DEMO_GOGET_AVERY_PROFILE.displayName,
    requesterUserId: PLAY_STORE_DEMO_PROFILE.uid,
    requesterName: PLAY_STORE_DEMO_PROFILE.displayName,
    chatId: 'demo-chat-chair',
    handshakeMode: 'availability',
    status: 'awaiting_availability',
    destinationLat: SACRAMENTO_LOCATIONS.eastSac.lat,
    destinationLng: SACRAMENTO_LOCATIONS.eastSac.lng,
    destinationLabel: `${SACRAMENTO_LOCATIONS.eastSac.label} porch`,
    ringExpiresAt: minutesFromNow(2),
    ringDurationSeconds: 140,
    fulfillerSharingLocation: false,
    createdAt: hoursAgo(0.05),
    updatedAt: hoursAgo(0.05),
    ...overrides,
  };
}

export const DEMO_GOGET_RING_SESSION = baseChairSession({
  status: 'awaiting_availability',
});

export const DEMO_GOGET_WAITING_SESSION = baseChairSession({
  status: 'awaiting_availability',
});

export const DEMO_GOGET_ACTIVE_SESSION = baseChairSession({
  status: 'active',
  ringExpiresAt: null,
  startedAt: hoursAgo(0.08),
  fulfillerSharingLocation: true,
});

export const DEMO_GOGET_ARRIVED_SESSION = baseChairSession({
  status: 'arrived',
  ringExpiresAt: null,
  startedAt: hoursAgo(0.15),
  arrivedAt: hoursAgo(0.02),
  fulfillerSharingLocation: true,
});

export const DEMO_GOGET_LIVE_LOCATION: GoGetLiveLocation = {
  sessionId: DEMO_GOGET_SESSION_ID,
  lat: 38.5715,
  lng: -121.472,
  heading: 72,
  speedMph: 18,
  etaSeconds: 6 * 60 + 20,
  distanceMeters: 2100,
  updatedAt: new Date().toISOString(),
};

export const DEMO_GOGET_FULFILLER_LIVE_LOCATION: GoGetFulfillerLiveLocation = {
  sessionId: DEMO_GOGET_SESSION_ID,
  lat: SACRAMENTO_LOCATIONS.eastSac.lat + 0.0008,
  lng: SACRAMENTO_LOCATIONS.eastSac.lng + 0.0012,
  heading: 210,
  updatedAt: new Date().toISOString(),
};

export function parsePlayStoreGoGetScene(): string | null {
  if (typeof window === 'undefined' || !isPlayStoreDemo()) return null;
  const scene = new URLSearchParams(window.location.search).get('scene');
  return scene?.startsWith('goget-') ? scene : null;
}

export function getPlayStoreDemoGoGetSession(sessionId: string): GoGetSession | null {
  if (sessionId !== DEMO_GOGET_SESSION_ID) return null;
  const scene = parsePlayStoreGoGetScene();
  if (scene === 'goget-ring' || scene === 'goget-waiting') return DEMO_GOGET_RING_SESSION;
  if (scene === 'goget-navigation' || scene === 'goget-meeting') return DEMO_GOGET_ACTIVE_SESSION;
  if (scene === 'goget-tracking') return DEMO_GOGET_ACTIVE_SESSION;
  if (scene === 'goget-arrived') return DEMO_GOGET_ARRIVED_SESSION;
  return DEMO_GOGET_RING_SESSION;
}

export function getPlayStoreDemoActiveGoGetSession(itemId: string, userId: string): GoGetSession | null {
  const scene = parsePlayStoreGoGetScene();
  if (!scene?.startsWith('goget-')) return null;
  const session = getPlayStoreDemoGoGetSession(DEMO_GOGET_SESSION_ID);
  if (!session || session.itemId !== itemId) return null;
  if (session.fulfillerUserId !== userId && session.requesterUserId !== userId) return null;
  if (scene === 'goget-listing' || scene === 'goget-chat') return null;
  return session;
}

export function getPlayStoreDemoLiveLocation(sessionId: string): GoGetLiveLocation | null {
  if (sessionId !== DEMO_GOGET_SESSION_ID) return null;
  return DEMO_GOGET_LIVE_LOCATION;
}

export function getPlayStoreDemoFulfillerLiveLocation(sessionId: string): GoGetFulfillerLiveLocation | null {
  if (sessionId !== DEMO_GOGET_SESSION_ID) return null;
  return DEMO_GOGET_FULFILLER_LIVE_LOCATION;
}
