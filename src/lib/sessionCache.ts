import type { ItemPost, UserProfile } from '../types';
import {
  isPersistableListingImageUrl,
  plainListingDescription,
} from './listingContent';
import { normalizeGoGetRingDuration, normalizeGoGetRingPattern } from './goGetRing';
import { normalizePickupAvailability } from './pickupAvailability';
import { clearStoredGoGetPrefs } from './goGetPrefs';
import { clearStoredNavPrefs } from './navPrefs';
import { normalizeNavigationSettings } from './navigationSettings';
import { isStaffRole, normalizeUserRole } from './roles';
import { mergeStaffInteractionModePref, clearAllStaffInteractionModePrefs } from './staffModePrefs';

const PROFILE_KEY = 'sbn_profile_cache_v2';
const LEGACY_PROFILE_KEY = 'sbn_profile_cache_v1';
const ITEMS_KEY = 'sbn_items_cache_v1';

/** Fields safe to cache offline — staff role + Go Get prefs for instant shell restore. */
type CachedProfile = Pick<
  UserProfile,
  | 'uid'
  | 'displayName'
  | 'photoURL'
  | 'neighborhood'
  | 'bio'
  | 'createdAt'
  | 'goGetEnabled'
  | 'pickupAvailability'
  | 'goGetRingDurationSeconds'
  | 'goGetRingPattern'
  | 'navigationSettings'
> & {
  role?: UserProfile['role'];
  staffInteractionMode?: UserProfile['staffInteractionMode'];
};

type ItemsCache = { savedAt: number; items: ItemPost[] };

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toCachedProfile(profile: UserProfile): CachedProfile {
  const cached: CachedProfile = {
    uid: profile.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    neighborhood: profile.neighborhood,
    bio: profile.bio,
    createdAt: profile.createdAt,
    goGetEnabled: profile.goGetEnabled === true,
    pickupAvailability: normalizePickupAvailability(profile.pickupAvailability),
    goGetRingDurationSeconds: normalizeGoGetRingDuration(profile.goGetRingDurationSeconds),
    goGetRingPattern: normalizeGoGetRingPattern(profile.goGetRingPattern),
    navigationSettings: normalizeNavigationSettings(profile.navigationSettings),
  };
  if (isStaffRole(profile.role)) {
    cached.role = normalizeUserRole(profile.role);
    cached.staffInteractionMode =
      profile.staffInteractionMode === 'neighbor' ? 'neighbor' : 'staff';
  }
  return cached;
}

function fromCachedProfile(cached: CachedProfile): UserProfile {
  const role = cached.role ? normalizeUserRole(cached.role) : 'user';
  const staffInteractionMode = mergeStaffInteractionModePref({
    uid: cached.uid,
    staffInteractionMode: cached.staffInteractionMode,
  });
  return {
    ...cached,
    email: '',
    role,
    staffInteractionMode,
    accountStatus: 'active',
    goGetEnabled: cached.goGetEnabled === true,
    pickupAvailability: normalizePickupAvailability(cached.pickupAvailability),
    goGetRingDurationSeconds: normalizeGoGetRingDuration(cached.goGetRingDurationSeconds),
    goGetRingPattern: normalizeGoGetRingPattern(cached.goGetRingPattern),
    navigationSettings: normalizeNavigationSettings(cached.navigationSettings),
  };
}

export function readCachedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const profile =
    safeParse<CachedProfile>(localStorage.getItem(PROFILE_KEY)) ??
    safeParse<CachedProfile>(localStorage.getItem(LEGACY_PROFILE_KEY));
  return profile?.uid ? fromCachedProfile(profile) : null;
}

export function writeCachedProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(toCachedProfile(profile)));
  } catch {
    /* storage full — ignore */
  }
}

export function readCachedItems(): ItemPost[] {
  if (typeof window === 'undefined') return [];
  const cache = safeParse<ItemsCache>(localStorage.getItem(ITEMS_KEY));
  if (!cache?.items?.length) return [];
  return cache.items.map((item) => ({
    ...item,
    description: plainListingDescription(item.description),
    imageUrl: isPersistableListingImageUrl(item.imageUrl) ? item.imageUrl : undefined,
    imageUrls: item.imageUrls?.filter((url) => isPersistableListingImageUrl(url)),
  }));
}

export function writeCachedItems(items: ItemPost[]): void {
  if (!items.length) return;
  try {
    const slim = items.slice(0, 300).map((item) => ({
      ...item,
      description: plainListingDescription(item.description),
      imageUrl: isPersistableListingImageUrl(item.imageUrl) ? item.imageUrl : undefined,
      imageUrls: item.imageUrls?.filter((url) => isPersistableListingImageUrl(url)),
    }));
    const payload: ItemsCache = { savedAt: Date.now(), items: slim };
    localStorage.setItem(ITEMS_KEY, JSON.stringify(payload));
  } catch {
    /* storage full — ignore */
  }
}

export function clearSessionCache(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    localStorage.removeItem(ITEMS_KEY);
    clearAllStaffInteractionModePrefs();
    clearStoredGoGetPrefs();
    clearStoredNavPrefs();
  } catch {
    /* ignore */
  }
}

/** Minimal auth user stub so the signed-in shell can render while Supabase restores session. */
export function sessionStubFromProfile(profile: UserProfile) {
  return { id: profile.uid, email: profile.email };
}
