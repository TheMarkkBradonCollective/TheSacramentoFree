import type { EventsFilterPreferences, UserProfile } from '../types';
import { SACRAMENTO_NEIGHBORHOODS } from '../types';
import {
  persistUserAppPreferencesCached,
  readStoredAppPrefs,
  writeStoredAppPrefs,
} from './appPrefsCache';

export type EventSortFilter = 'soonest' | 'newest' | 'most_rsvps';
export type EventTimeFilterPref = 'upcoming' | 'past';
export type EventQuickPickFilter =
  | 'my_area'
  | 'with_photos'
  | 'has_pin'
  | 'im_going'
  | 'has_rsvps'
  | 'series';

const EVENT_SORTS: EventSortFilter[] = ['soonest', 'newest', 'most_rsvps'];
const EVENT_TIME_FILTERS: EventTimeFilterPref[] = ['upcoming', 'past'];
const EVENT_QUICK_PICKS: EventQuickPickFilter[] = [
  'my_area',
  'with_photos',
  'has_pin',
  'im_going',
  'has_rsvps',
  'series',
];

export type EventsFilterState = {
  timeFilter: EventTimeFilterPref | null;
  sortBy: EventSortFilter | null;
  selectedNeighborhood: string;
  activeQuickPicks: Set<EventQuickPickFilter>;
  gridSortMode: 'nearest' | 'new';
};

export const DEFAULT_EVENTS_FILTER_STATE: EventsFilterState = {
  timeFilter: null,
  sortBy: null,
  selectedNeighborhood: 'All Neighborhoods',
  activeQuickPicks: new Set(),
  gridSortMode: 'nearest',
};

function isEventSortFilter(value: unknown): value is EventSortFilter {
  return typeof value === 'string' && EVENT_SORTS.includes(value as EventSortFilter);
}

function isEventTimeFilterPref(value: unknown): value is EventTimeFilterPref {
  return typeof value === 'string' && EVENT_TIME_FILTERS.includes(value as EventTimeFilterPref);
}

function isEventQuickPickFilter(value: unknown): value is EventQuickPickFilter {
  return typeof value === 'string' && EVENT_QUICK_PICKS.includes(value as EventQuickPickFilter);
}

function isNeighborhoodValue(value: unknown): value is string {
  return value === 'All Neighborhoods' || (typeof value === 'string' && (SACRAMENTO_NEIGHBORHOODS as readonly string[]).includes(value));
}

export function normalizeEventsFilterPreferences(raw: unknown): EventsFilterPreferences {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prefs: EventsFilterPreferences = {};

  if (source.sortBy === null) {
    prefs.sortBy = null;
  } else if (isEventSortFilter(source.sortBy)) {
    prefs.sortBy = source.sortBy;
  }

  if (source.timeFilter === null) {
    prefs.timeFilter = null;
  } else if (isEventTimeFilterPref(source.timeFilter)) {
    prefs.timeFilter = source.timeFilter;
  }

  if (isNeighborhoodValue(source.selectedNeighborhood)) {
    prefs.selectedNeighborhood = source.selectedNeighborhood;
  }

  if (Array.isArray(source.quickPicks)) {
    prefs.quickPicks = source.quickPicks.filter(isEventQuickPickFilter);
  }

  if (source.gridSortMode === 'nearest' || source.gridSortMode === 'new') {
    prefs.gridSortMode = source.gridSortMode;
  }

  return prefs;
}

export function eventsFilterStateFromPreferences(
  prefs: EventsFilterPreferences | null | undefined,
): EventsFilterState {
  const normalized = normalizeEventsFilterPreferences(prefs);
  return {
    timeFilter: normalized.timeFilter ?? null,
    sortBy: normalized.sortBy ?? null,
    selectedNeighborhood: normalized.selectedNeighborhood ?? DEFAULT_EVENTS_FILTER_STATE.selectedNeighborhood,
    activeQuickPicks: new Set(normalized.quickPicks ?? []),
    gridSortMode: normalized.gridSortMode ?? DEFAULT_EVENTS_FILTER_STATE.gridSortMode,
  };
}

export function eventsFilterPreferencesFromState(state: EventsFilterState): EventsFilterPreferences {
  return {
    sortBy: state.sortBy,
    timeFilter: state.timeFilter,
    selectedNeighborhood: state.selectedNeighborhood,
    quickPicks: [...state.activeQuickPicks],
    gridSortMode: state.gridSortMode,
  };
}

export function readEventsFilterState(profile: UserProfile): EventsFilterState {
  const stored = readStoredAppPrefs(profile.uid);
  const fromStored = stored?.appPreferences?.eventsFilters;
  const fromProfile = profile.appPreferences?.eventsFilters;
  return eventsFilterStateFromPreferences(
    normalizeEventsFilterPreferences({ ...fromProfile, ...fromStored }),
  );
}

export function writeEventsFilterStateLocally(profile: UserProfile, state: EventsFilterState): void {
  const existing = readStoredAppPrefs(profile.uid)?.appPreferences ?? profile.appPreferences ?? {};
  writeStoredAppPrefs({
    uid: profile.uid,
    appPreferences: {
      ...existing,
      eventsFilters: eventsFilterPreferencesFromState(state),
    },
  });
}

export async function persistUserEventsFilters(
  profile: UserProfile,
  state: EventsFilterState,
): Promise<{ ok: boolean; profile?: UserProfile; errorMessage?: string }> {
  return persistUserAppPreferencesCached(profile, {
    eventsFilters: eventsFilterPreferencesFromState(state),
  });
}
