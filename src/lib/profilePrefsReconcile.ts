import type { UserProfile } from '../types';
import { appPreferencesIsEmpty, normalizeAppPreferences } from './appPreferencesModel';
import { mergeStoredAppPreferencesIntoProfile, readStoredAppPrefs } from './appPrefsCache';
import { mergeGoGetPrefsIntoProfile, readStoredGoGetPrefs } from './goGetPrefs';
import { mergeNavigationPrefsIntoProfile, readStoredNavPrefs } from './navPrefs';
import { mergeStaffInteractionModeIntoProfile } from './staffModePrefs';
import { normalizeNavigationSettings } from './navigationSettings';

/** Recent local saves may still be syncing — do not let heartbeat rows stomp them. */
const PENDING_LOCAL_PREFS_MS = 60_000;

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function shouldPreferStoredAppPrefs(profile: UserProfile): boolean {
  const stored = readStoredAppPrefs(profile.uid);
  if (!stored || appPreferencesIsEmpty(stored.appPreferences)) return false;
  if (appPreferencesIsEmpty(profile.appPreferences)) return true;
  if (Date.now() - stored.savedAt > PENDING_LOCAL_PREFS_MS) return false;
  return !jsonEqual(stored.appPreferences, normalizeAppPreferences(profile.appPreferences));
}

function shouldPreferStoredNavPrefs(profile: UserProfile): boolean {
  const stored = readStoredNavPrefs(profile.uid);
  if (!stored) return false;
  if (profile.navigationSettings == null) return true;
  if (Date.now() - stored.savedAt > PENDING_LOCAL_PREFS_MS) return false;
  return !jsonEqual(stored.settings, normalizeNavigationSettings(profile.navigationSettings));
}

function storedGoGetPrefsMatchProfile(
  stored: NonNullable<ReturnType<typeof readStoredGoGetPrefs>>,
  profile: UserProfile,
): boolean {
  return (
    stored.goGetEnabled === (profile.goGetEnabled === true) &&
    jsonEqual(stored.pickupAvailability, profile.pickupAvailability ?? null) &&
    stored.goGetRingDurationSeconds === profile.goGetRingDurationSeconds &&
    stored.goGetRingPattern === profile.goGetRingPattern
  );
}

/** Keep device Go Get prefs until the cloud row confirms the same values (not a fixed timeout). */
function shouldPreferStoredGoGetPrefs(profile: UserProfile): boolean {
  const stored = readStoredGoGetPrefs(profile.uid);
  if (!stored) return false;
  if (storedGoGetPrefsMatchProfile(stored, profile)) return false;
  // Recent explicit saves still win over heartbeat rows that have not caught up yet.
  if (Date.now() - stored.savedAt <= PENDING_LOCAL_PREFS_MS) return true;
  // After the grace window, only keep local prefs when the server still disagrees.
  return !storedGoGetPrefsMatchProfile(stored, profile);
}

/** Prefer device-local prefs when the DB row is empty or a heartbeat arrives before cloud sync finishes. */
export function reconcileProfileWithStoredPreferences(profile: UserProfile): UserProfile {
  let next = profile;
  if (shouldPreferStoredAppPrefs(profile)) {
    next = mergeStoredAppPreferencesIntoProfile(next);
  }
  if (shouldPreferStoredNavPrefs(profile)) {
    next = mergeNavigationPrefsIntoProfile(next);
  }
  if (shouldPreferStoredGoGetPrefs(profile)) {
    next = mergeGoGetPrefsIntoProfile(next);
  }
  return mergeStaffInteractionModeIntoProfile(next);
}
