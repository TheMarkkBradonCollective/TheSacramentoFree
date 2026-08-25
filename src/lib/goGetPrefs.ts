import type { GoGetRingPattern, PickupAvailabilitySchedule, UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import { normalizeGoGetRingDuration, normalizeGoGetRingPattern } from './goGetRing';
import { normalizePickupAvailability } from './pickupAvailability';
import { writeCachedProfile } from './sessionCache';

const STORAGE_KEY = 'sbn_goget_prefs_v1';
const GOGET_PREFS_EVENT = 'sbn-goget-prefs-changed';

export type StoredGoGetPrefs = {
  uid: string;
  goGetEnabled: boolean;
  pickupAvailability: PickupAvailabilitySchedule;
  goGetRingDurationSeconds: number;
  goGetRingPattern: GoGetRingPattern;
  savedAt: number;
};

export type GoGetSettingsPatch = Partial<
  Pick<UserProfile, 'goGetEnabled' | 'pickupAvailability' | 'goGetRingDurationSeconds' | 'goGetRingPattern'>
>;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeStoredGoGetPrefs(raw: unknown, uid?: string): StoredGoGetPrefs | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const resolvedUid = typeof source.uid === 'string' ? source.uid : uid;
  if (!resolvedUid) return null;
  return {
    uid: resolvedUid,
    goGetEnabled: source.goGetEnabled === true,
    pickupAvailability: normalizePickupAvailability(source.pickupAvailability),
    goGetRingDurationSeconds: normalizeGoGetRingDuration(source.goGetRingDurationSeconds),
    goGetRingPattern: normalizeGoGetRingPattern(source.goGetRingPattern),
    savedAt: typeof source.savedAt === 'number' ? source.savedAt : Date.now(),
  };
}

export function profileToStoredGoGetPrefs(profile: UserProfile): StoredGoGetPrefs {
  return {
    uid: profile.uid,
    goGetEnabled: profile.goGetEnabled === true,
    pickupAvailability: normalizePickupAvailability(profile.pickupAvailability),
    goGetRingDurationSeconds: normalizeGoGetRingDuration(profile.goGetRingDurationSeconds),
    goGetRingPattern: normalizeGoGetRingPattern(profile.goGetRingPattern),
    savedAt: Date.now(),
  };
}

export function readStoredGoGetPrefs(uid?: string): StoredGoGetPrefs | null {
  if (typeof window === 'undefined') return null;
  const parsed = safeParse<unknown>(window.localStorage.getItem(STORAGE_KEY));
  const normalized = normalizeStoredGoGetPrefs(parsed, uid);
  if (!normalized) return null;
  if (uid && normalized.uid !== uid) return null;
  return normalized;
}

function emitStoredGoGetPrefs(next: StoredGoGetPrefs): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<StoredGoGetPrefs>(GOGET_PREFS_EVENT, { detail: next }));
}

export function writeStoredGoGetPrefs(
  prefs: Omit<StoredGoGetPrefs, 'savedAt'> & { savedAt?: number },
): StoredGoGetPrefs {
  const next: StoredGoGetPrefs = {
    uid: prefs.uid,
    goGetEnabled: prefs.goGetEnabled === true,
    pickupAvailability: normalizePickupAvailability(prefs.pickupAvailability),
    goGetRingDurationSeconds: normalizeGoGetRingDuration(prefs.goGetRingDurationSeconds),
    goGetRingPattern: normalizeGoGetRingPattern(prefs.goGetRingPattern),
    savedAt: prefs.savedAt ?? Date.now(),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
    emitStoredGoGetPrefs(next);
  }
  return next;
}

export function clearStoredGoGetPrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer saved device prefs so profile edits cannot wipe Go Get settings before DB sync. */
export function mergeGoGetPrefsIntoProfile(profile: UserProfile): UserProfile {
  const stored = readStoredGoGetPrefs(profile.uid);
  if (!stored) return profile;
  return {
    ...profile,
    goGetEnabled: stored.goGetEnabled,
    pickupAvailability: stored.pickupAvailability,
    goGetRingDurationSeconds: stored.goGetRingDurationSeconds,
    goGetRingPattern: stored.goGetRingPattern,
  };
}

export function applyStoredGoGetPrefsToProfile(profile: UserProfile): UserProfile {
  return mergeGoGetPrefsIntoProfile(profile);
}

export function subscribeStoredGoGetPrefs(
  uid: string,
  listener: (prefs: StoredGoGetPrefs | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const notify = () => listener(readStoredGoGetPrefs(uid));
  const onCustom = () => notify();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    notify();
  };

  window.addEventListener(GOGET_PREFS_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  notify();

  return () => {
    window.removeEventListener(GOGET_PREFS_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export async function persistUserGoGetSettings(
  profile: UserProfile,
  patch: GoGetSettingsPatch,
): Promise<{ ok: boolean; profile?: UserProfile; errorMessage?: string }> {
  const previousStored = readStoredGoGetPrefs(profile.uid);
  const updated = mergeGoGetPrefsIntoProfile({ ...profile, ...patch });
  writeStoredGoGetPrefs(profileToStoredGoGetPrefs(updated));
  const result = await upsertSupabaseProfile(updated, { scope: 'preferences' });
  if (!result.ok) {
    if (previousStored) {
      writeStoredGoGetPrefs(previousStored);
    } else {
      writeStoredGoGetPrefs(profileToStoredGoGetPrefs(mergeGoGetPrefsIntoProfile(profile)));
    }
    return result;
  }
  writeCachedProfile(updated);
  return { ok: true, profile: updated };
}
