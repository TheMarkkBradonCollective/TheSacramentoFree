import type { ItemPost, UserProfile } from '../types';
import {
  isPersistableListingImageUrl,
  plainListingDescription,
} from './listingContent';

const PROFILE_KEY = 'sbn_profile_cache_v1';
const ITEMS_KEY = 'sbn_items_cache_v1';

type ItemsCache = { savedAt: number; items: ItemPost[] };

/** Fields safe to cache offline — never store role, email, or moderation state. */
type CachedProfile = Pick<
  UserProfile,
  'uid' | 'displayName' | 'photoURL' | 'neighborhood' | 'bio' | 'createdAt'
>;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toCachedProfile(profile: UserProfile): CachedProfile {
  return {
    uid: profile.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    neighborhood: profile.neighborhood,
    bio: profile.bio,
    createdAt: profile.createdAt,
  };
}

function fromCachedProfile(cached: CachedProfile): UserProfile {
  return {
    ...cached,
    email: '',
    role: 'user',
    accountStatus: 'active',
  };
}

export function readCachedProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const profile = safeParse<CachedProfile>(localStorage.getItem(PROFILE_KEY));
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
    localStorage.removeItem(ITEMS_KEY);
  } catch {
    /* ignore */
  }
}

/** Minimal auth user stub so the signed-in shell can render while Supabase restores session. */
export function sessionStubFromProfile(profile: UserProfile) {
  return { id: profile.uid, email: profile.email };
}
