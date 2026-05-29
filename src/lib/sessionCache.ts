import type { ItemPost, UserProfile } from '../types';

const PROFILE_KEY = 'sbn_profile_cache_v1';
const ITEMS_KEY = 'sbn_items_cache_v1';

type ItemsCache = { savedAt: number; items: ItemPost[] };

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readCachedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const profile = safeParse<UserProfile>(localStorage.getItem(PROFILE_KEY));
  return profile?.uid ? profile : null;
}

export function writeCachedProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* storage full — ignore */
  }
}

export function readCachedItems(): ItemPost[] {
  if (typeof window === 'undefined') return [];
  const cache = safeParse<ItemsCache>(localStorage.getItem(ITEMS_KEY));
  return cache?.items?.length ? cache.items : [];
}

export function writeCachedItems(items: ItemPost[]): void {
  if (!items.length) return;
  try {
    const payload: ItemsCache = { savedAt: Date.now(), items: items.slice(0, 300) };
    localStorage.setItem(ITEMS_KEY, JSON.stringify(payload));
  } catch {
    /* storage full — ignore */
  }
}

export function clearSessionCache(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(ITEMS_KEY);
  } catch {
    /* ignore */
  }
}

/** Minimal auth user stub so the signed-in shell can render while Supabase restores session. */
export function sessionStubFromProfile(profile: UserProfile) {
  return { id: profile.uid, email: profile.email };
}
