import type { StaffInteractionMode } from './staffInteractionMode';
import { normalizeStaffInteractionMode } from './staffInteractionMode';

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
