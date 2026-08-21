/** Guards for profile identity fields — prevent defaults from overwriting saved neighbor data. */

import type { UserProfile } from '../types';

export function isDicebearAvatarUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes('api.dicebear.com/');
}

export function sanitizeRemotePhotoUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return null;
}

/** DB/API write: real photos only — never persist dicebear placeholders. */
export function photoUrlForProfileUpsert(photoURL?: string | null): string | undefined {
  if (photoURL == null || photoURL === '') return undefined;
  const sanitized = sanitizeRemotePhotoUrl(photoURL);
  if (!sanitized || isDicebearAvatarUrl(sanitized)) return undefined;
  return sanitized;
}

export function emailPrefixDisplayName(email?: string | null): string | null {
  const trimmed = email?.trim();
  if (!trimmed || !trimmed.includes('@')) return null;
  const prefix = trimmed.split('@')[0]?.trim();
  return prefix || null;
}

/** True when a name looks like the auto-generated email prefix default. */
export function isLikelyDefaultDisplayName(displayName: string, email?: string | null): boolean {
  const name = displayName.trim().toLowerCase();
  if (!name) return true;
  const prefix = emailPrefixDisplayName(email)?.toLowerCase();
  if (prefix && name === prefix) return true;
  if (name === 'sacramento neighbor' || name === 'neighbor') return true;
  return false;
}

/**
 * Identity photo update rules:
 * - Explicit real upload always wins
 * - Never write dicebear/null over an existing real photo unless allowClearPhoto
 */
export function resolveIdentityPhotoUrl(params: {
  existingPhotoURL?: string | null;
  incomingPhotoURL?: string | null;
  allowClearPhoto?: boolean;
}): string | undefined {
  const incoming = photoUrlForProfileUpsert(params.incomingPhotoURL);
  const existing = sanitizeRemotePhotoUrl(params.existingPhotoURL);
  const existingIsReal = !!existing && !isDicebearAvatarUrl(existing);

  if (incoming) return incoming;

  if (params.allowClearPhoto) return undefined;

  if (existingIsReal) return undefined;

  return undefined;
}

/**
 * Identity name update rules:
 * - Explicit non-default name always wins
 * - Never replace a custom name with an email-prefix default from stale client state
 */
export function resolveIdentityDisplayName(params: {
  existingDisplayName?: string | null;
  incomingDisplayName: string;
  email?: string | null;
  force?: boolean;
}): string {
  const incoming = params.incomingDisplayName.trim();
  if (!incoming) return params.existingDisplayName?.trim() || 'Neighbor';

  if (params.force) return incoming;

  const existing = params.existingDisplayName?.trim();
  if (!existing) return incoming;

  if (
    isLikelyDefaultDisplayName(incoming, params.email) &&
    !isLikelyDefaultDisplayName(existing, params.email)
  ) {
    return existing;
  }

  return incoming;
}

/** Merge a DB profile row into in-memory state without downgrading saved identity. */
export function mergeProfileFromDbRead(prev: UserProfile | null, fromDb: UserProfile): UserProfile {
  if (!prev || prev.uid !== fromDb.uid) return fromDb;

  const email = fromDb.email || prev.email;
  const displayName = resolveIdentityDisplayName({
    existingDisplayName: prev.displayName,
    incomingDisplayName: fromDb.displayName,
    email,
  });

  const incomingPhoto = photoUrlForProfileUpsert(fromDb.photoURL);
  const prevPhoto = photoUrlForProfileUpsert(prev.photoURL);
  const photoURL = incomingPhoto || prevPhoto || fromDb.photoURL || prev.photoURL;

  return {
    ...fromDb,
    displayName,
    photoURL,
  };
}
