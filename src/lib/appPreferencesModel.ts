import type { AppPreferences, FeedViewMode } from '../types';
import { normalizeEventsFilterPreferences } from './eventsFilterPrefs';
import { normalizeFeedFilterPreferences } from './feedFilterPrefs';

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
  const eventsFilters = normalizeEventsFilterPreferences(source.eventsFilters);
  if (Object.keys(eventsFilters).length > 0) prefs.eventsFilters = eventsFilters;
  const feedFilters = normalizeFeedFilterPreferences(source.feedFilters);
  if (Object.keys(feedFilters).length > 0) prefs.feedFilters = feedFilters;
  return prefs;
}

export function mergeAppPreferences(
  current: AppPreferences | null | undefined,
  patch: Partial<AppPreferences>,
): AppPreferences {
  const base = normalizeAppPreferences(current);
  const merged = normalizeAppPreferences({ ...base, ...patch });
  if (patch.eventsFilters !== undefined) {
    merged.eventsFilters = normalizeEventsFilterPreferences({
      ...base.eventsFilters,
      ...patch.eventsFilters,
    });
  }
  if (patch.feedFilters !== undefined) {
    merged.feedFilters = normalizeFeedFilterPreferences({
      ...base.feedFilters,
      ...patch.feedFilters,
    });
  }
  return merged;
}
