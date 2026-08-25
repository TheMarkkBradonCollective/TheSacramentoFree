import type { AppPreferences, UserProfile } from '../types';
import { writeStoredNavPrefs, profileToStoredNavPrefs } from './navPrefs';
import { writeStoredAppPrefs, profileToStoredAppPrefs, persistUserAppPreferencesCached, mergeStoredAppPreferencesIntoProfile } from './appPrefsCache';
import { writeChatCategoryFilter, writeChatStatusFilter } from './chatInboxFilters';
import {
  writeEventsViewMode,
  writeFeedAudienceScope,
  writeFeedContentFilter,
  writeFeedViewMode,
} from './feedDisplayPrefs';
import { isStaffRole } from './roles';
import {
  DEFAULT_STAFF_INTERACTION_MODE,
  normalizeStaffInteractionMode,
} from './staffInteractionMode';
import { writeStaffInteractionModePref } from './staffModePrefs';
import { normalizeAppPreferences } from './appPreferencesModel';
import { reconcileProfileWithStoredPreferences } from './profilePrefsReconcile';

export { mergeAppPreferences, normalizeAppPreferences } from './appPreferencesModel';

const THEME_SYNC_EVENT = 'sbn-theme-sync';

type Theme = NonNullable<AppPreferences['theme']>;

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** Apply cloud profile prefs to this device (local caches + theme event). */
export function applyUserPreferencesToDevice(profile: UserProfile): void {
  const reconciled = reconcileProfileWithStoredPreferences(profile);
  writeStoredNavPrefs(profileToStoredNavPrefs(reconciled));
  // Go Get prefs are written only by persistUserGoGetSettings — do not let heartbeats
  // overwrite a neighbor's explicit opt-in before the users row catches up.
  writeStoredAppPrefs(profileToStoredAppPrefs(reconciled));
  if (isStaffRole(reconciled.role)) {
    writeStaffInteractionModePref(
      reconciled.uid,
      normalizeStaffInteractionMode(reconciled.staffInteractionMode ?? DEFAULT_STAFF_INTERACTION_MODE),
    );
  }

  const prefs = normalizeAppPreferences(reconciled.appPreferences);
  if (prefs.feedViewMode) writeFeedViewMode(prefs.feedViewMode);
  if (prefs.eventsViewMode) writeEventsViewMode(prefs.eventsViewMode);
  if (prefs.feedContentFilter) writeFeedContentFilter(prefs.feedContentFilter);
  if (prefs.feedAudienceScope) writeFeedAudienceScope(prefs.feedAudienceScope);
  if (prefs.chatInbox?.category) writeChatCategoryFilter(prefs.chatInbox.category);
  if (prefs.chatInbox?.status) writeChatStatusFilter(prefs.chatInbox.status);

  if (prefs.theme && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('sbn_theme', prefs.theme);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(THEME_SYNC_EVENT, { detail: prefs.theme }));
  }
}

export function subscribeThemeSyncFromProfile(listener: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onSync = (event: Event) => {
    const theme = (event as CustomEvent<Theme>).detail;
    if (isTheme(theme)) listener(theme);
  };
  window.addEventListener(THEME_SYNC_EVENT, onSync);
  return () => window.removeEventListener(THEME_SYNC_EVENT, onSync);
}

export async function persistUserAppPreferences(
  profile: UserProfile,
  patch: Partial<AppPreferences>,
): Promise<{ ok: boolean; profile?: UserProfile; errorMessage?: string }> {
  const result = await persistUserAppPreferencesCached(profile, patch);
  if (!result.ok || !result.profile) return result;
  applyUserPreferencesToDevice(result.profile);
  return result;
}

export { mergeStoredAppPreferencesIntoProfile } from './appPrefsCache';
