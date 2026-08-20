import type { UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import { isStaffRole } from './roles';
import {
  DEFAULT_STAFF_INTERACTION_MODE,
  normalizeStaffInteractionMode,
  type StaffInteractionMode,
} from './staffInteractionMode';

const KEY_PREFIX = 'sbn_staff_interaction_mode_v1:';

function keyFor(uid: string): string {
  return `${KEY_PREFIX}${uid}`;
}

/** Persist staff/user mode on device so it survives app close before Supabase sync finishes. */
export function readStaffInteractionModePref(uid: string): StaffInteractionMode | null {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (raw === 'staff' || raw === 'neighbor') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStaffInteractionModePref(uid: string, mode: StaffInteractionMode): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(uid), normalizeStaffInteractionMode(mode));
  } catch {
    /* storage full — ignore */
  }
}

export function clearStaffInteractionModePref(uid: string): void {
  if (!uid || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(keyFor(uid));
  } catch {
    /* ignore */
  }
}

export function clearAllStaffInteractionModePrefs(): void {
  if (typeof window === 'undefined') return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(KEY_PREFIX)) {
        localStorage.removeItem(storageKey);
      }
    }
  } catch {
    /* ignore */
  }
}

/** Apply saved device preference when profile row is missing staffInteractionMode. */
export function mergeStaffInteractionModePref(profile: {
  uid: string;
  staffInteractionMode?: StaffInteractionMode;
}): StaffInteractionMode | undefined {
  const fromProfile = profile.staffInteractionMode;
  if (fromProfile === 'staff' || fromProfile === 'neighbor') return fromProfile;
  return readStaffInteractionModePref(profile.uid) ?? undefined;
}

/** Prefer saved device prefs so profile edits cannot wipe staff/user mode before DB sync. */
export function mergeStaffInteractionModeIntoProfile(profile: UserProfile): UserProfile {
  if (!isStaffRole(profile.role)) return profile;
  const local = readStaffInteractionModePref(profile.uid);
  if (local) {
    return { ...profile, staffInteractionMode: local };
  }
  return {
    ...profile,
    staffInteractionMode: normalizeStaffInteractionMode(
      profile.staffInteractionMode ?? DEFAULT_STAFF_INTERACTION_MODE,
    ),
  };
}

export function applyStoredStaffModeToProfile(profile: UserProfile): UserProfile {
  return mergeStaffInteractionModeIntoProfile(profile);
}

export async function persistUserStaffInteractionMode(
  profile: UserProfile,
  mode: StaffInteractionMode,
): Promise<{ ok: boolean; profile?: UserProfile; errorMessage?: string }> {
  const next = normalizeStaffInteractionMode(mode);
  writeStaffInteractionModePref(profile.uid, next);
  const updated: UserProfile = { ...profile, staffInteractionMode: next };
  const result = await upsertSupabaseProfile(updated);
  if (!result.ok) return result;
  return { ok: true, profile: updated };
}
