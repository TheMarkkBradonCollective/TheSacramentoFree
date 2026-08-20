import type { UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import {
  normalizeNavigationSettings,
  writeNavigationSettings,
  type NavigationSettings,
} from './navigationSettings';

const STORAGE_KEY = 'sbn_nav_prefs_v1';
const NAV_PREFS_EVENT = 'sbn-nav-prefs-changed';

export type StoredNavPrefs = {
  uid: string;
  settings: NavigationSettings;
  savedAt: number;
};

export type NavigationSettingsPatch = Partial<NavigationSettings>;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeStoredNavPrefs(raw: unknown, uid?: string): StoredNavPrefs | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const resolvedUid = typeof source.uid === 'string' ? source.uid : uid;
  if (!resolvedUid) return null;
  return {
    uid: resolvedUid,
    settings: normalizeNavigationSettings(source.settings),
    savedAt: typeof source.savedAt === 'number' ? source.savedAt : Date.now(),
  };
}

export function profileToStoredNavPrefs(profile: UserProfile): StoredNavPrefs {
  return {
    uid: profile.uid,
    settings: normalizeNavigationSettings(profile.navigationSettings),
    savedAt: Date.now(),
  };
}

export function readStoredNavPrefs(uid?: string): StoredNavPrefs | null {
  if (typeof window === 'undefined') return null;
  const parsed = safeParse<unknown>(window.localStorage.getItem(STORAGE_KEY));
  const normalized = normalizeStoredNavPrefs(parsed, uid);
  if (!normalized) return null;
  if (uid && normalized.uid !== uid) return null;
  return normalized;
}

function emitStoredNavPrefs(next: StoredNavPrefs): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<StoredNavPrefs>(NAV_PREFS_EVENT, { detail: next }));
}

export function writeStoredNavPrefs(
  prefs: Omit<StoredNavPrefs, 'savedAt'> & { savedAt?: number },
): StoredNavPrefs {
  const next: StoredNavPrefs = {
    uid: prefs.uid,
    settings: normalizeNavigationSettings(prefs.settings),
    savedAt: prefs.savedAt ?? Date.now(),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
    writeNavigationSettings(next.settings, { localOnly: true });
    emitStoredNavPrefs(next);
  }
  return next;
}

export function clearStoredNavPrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer saved device prefs so profile edits cannot wipe navigation settings before DB sync. */
export function mergeNavigationPrefsIntoProfile(profile: UserProfile): UserProfile {
  const stored = readStoredNavPrefs(profile.uid);
  if (!stored) return profile;
  return {
    ...profile,
    navigationSettings: stored.settings,
  };
}

export function applyStoredNavPrefsToProfile(profile: UserProfile): UserProfile {
  return mergeNavigationPrefsIntoProfile(profile);
}

export function subscribeStoredNavPrefs(
  uid: string,
  listener: (prefs: StoredNavPrefs | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const notify = () => listener(readStoredNavPrefs(uid));
  const onCustom = () => notify();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    notify();
  };

  window.addEventListener(NAV_PREFS_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  notify();

  return () => {
    window.removeEventListener(NAV_PREFS_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export async function persistUserNavigationSettings(
  profile: UserProfile,
  patch: NavigationSettingsPatch,
): Promise<{ ok: boolean; profile?: UserProfile; errorMessage?: string }> {
  const navigationSettings = normalizeNavigationSettings({
    ...normalizeNavigationSettings(mergeNavigationPrefsIntoProfile(profile).navigationSettings),
    ...patch,
  });
  writeStoredNavPrefs({ uid: profile.uid, settings: navigationSettings });
  const updated: UserProfile = { ...profile, navigationSettings };
  const result = await upsertSupabaseProfile(updated);
  if (!result.ok) return result;
  return { ok: true, profile: updated };
}
