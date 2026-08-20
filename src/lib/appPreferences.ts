import type { AppPreferences, FeedViewMode, UserProfile } from '../types';
import { upsertSupabaseProfile } from '../supabase';
import { writeStoredGoGetPrefs, profileToStoredGoGetPrefs } from './goGetPrefs';
import { writeStoredNavPrefs, profileToStoredNavPrefs } from './navPrefs';
import { writeEventsViewMode, writeFeedViewMode } from './feedDisplayPrefs';
import { isStaffRole } from './roles';
import {
  DEFAULT_STAFF_INTERACTION_MODE,
  normalizeStaffInteractionMode,
} from './staffInteractionMode';
import { writeStaffInteractionModePref } from './staffModePrefs';

const THEME_SYNC_EVENT = 'sbn-theme-sync';

type Theme = NonNullable<AppPreferences['theme']>;

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function isFeedViewMode(value: unknown): value is FeedViewMode {
  return value === 'list' || value === 'grid';
}

export function normalizeAppPreferences(raw: unknown): AppPreferences {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prefs: AppPreferences = {};
  if (isFeedViewMode(source.feedViewMode)) prefs.feedViewMode = source.feedViewMode;
  if (isFeedViewMode(source.eventsViewMode)) prefs.eventsViewMode = source.eventsViewMode;
  if (isTheme(source.theme)) prefs.theme = source.theme;
  return prefs;
}

export function mergeAppPreferences(
  current: AppPreferences | null | undefined,
  patch: Partial<AppPreferences>,
): AppPreferences {
  return normalizeAppPreferences({ ...normalizeAppPreferences(current), ...patch });
}

/** Apply cloud profile prefs to this device (local caches + theme event). */
export function applyUserPreferencesToDevice(profile: UserProfile): void {
  writeStoredNavPrefs(profileToStoredNavPrefs(profile));
  writeStoredGoGetPrefs(profileToStoredGoGetPrefs(profile));
  if (isStaffRole(profile.role)) {
    writeStaffInteractionModePref(
      profile.uid,
      normalizeStaffInteractionMode(profile.staffInteractionMode ?? DEFAULT_STAFF_INTERACTION_MODE),
    );
  }

  const prefs = normalizeAppPreferences(profile.appPreferences);
  if (prefs.feedViewMode) writeFeedViewMode(prefs.feedViewMode);
  if (prefs.eventsViewMode) writeEventsViewMode(prefs.eventsViewMode);

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
  const appPreferences = mergeAppPreferences(profile.appPreferences, patch);
  applyUserPreferencesToDevice({ ...profile, appPreferences });
  const updated: UserProfile = { ...profile, appPreferences };
  const result = await upsertSupabaseProfile(updated);
  if (!result.ok) return result;
  return { ok: true, profile: updated };
}
