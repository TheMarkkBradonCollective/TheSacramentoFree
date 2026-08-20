import type { AppPreferences, UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import { mergeAppPreferences, normalizeAppPreferences } from './appPreferencesModel';

const STORAGE_KEY = 'sbn_app_prefs_v1';
const APP_PREFS_EVENT = 'sbn-app-prefs-changed';

export type StoredAppPrefs = {
  uid: string;
  appPreferences: AppPreferences;
  savedAt: number;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function profileToStoredAppPrefs(profile: UserProfile): StoredAppPrefs {
  return {
    uid: profile.uid,
    appPreferences: normalizeAppPreferences(profile.appPreferences),
    savedAt: Date.now(),
  };
}

export function readStoredAppPrefs(uid?: string): StoredAppPrefs | null {
  if (typeof window === 'undefined') return null;
  const parsed = safeParse<StoredAppPrefs>(window.localStorage.getItem(STORAGE_KEY));
  if (!parsed?.uid) return null;
  if (uid && parsed.uid !== uid) return null;
  return {
    uid: parsed.uid,
    appPreferences: normalizeAppPreferences(parsed.appPreferences),
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
  };
}

function emitStoredAppPrefs(next: StoredAppPrefs): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<StoredAppPrefs>(APP_PREFS_EVENT, { detail: next }));
}

export function writeStoredAppPrefs(
  prefs: Omit<StoredAppPrefs, 'savedAt'> & { savedAt?: number },
): StoredAppPrefs {
  const next: StoredAppPrefs = {
    uid: prefs.uid,
    appPreferences: normalizeAppPreferences(prefs.appPreferences),
    savedAt: prefs.savedAt ?? Date.now(),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
    emitStoredAppPrefs(next);
  }
  return next;
}

export function clearStoredAppPrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function mergeStoredAppPreferencesIntoProfile(profile: UserProfile): UserProfile {
  const stored = readStoredAppPrefs(profile.uid);
  if (!stored) return profile;
  return {
    ...profile,
    appPreferences: mergeAppPreferences(profile.appPreferences, stored.appPreferences),
  };
}

export function subscribeStoredAppPrefs(
  uid: string,
  listener: (prefs: StoredAppPrefs | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const notify = () => listener(readStoredAppPrefs(uid));
  const onCustom = () => notify();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    notify();
  };

  window.addEventListener(APP_PREFS_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  notify();

  return () => {
    window.removeEventListener(APP_PREFS_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export async function persistUserAppPreferencesCached(
  profile: UserProfile,
  patch: Partial<AppPreferences>,
): Promise<{ ok: boolean; profile?: UserProfile; errorMessage?: string }> {
  const appPreferences = mergeAppPreferences(mergeStoredAppPreferencesIntoProfile(profile).appPreferences, patch);
  writeStoredAppPrefs({ uid: profile.uid, appPreferences });
  const updated: UserProfile = { ...profile, appPreferences };
  const result = await upsertSupabaseProfile(updated);
  if (!result.ok) return result;
  return { ok: true, profile: updated };
}
