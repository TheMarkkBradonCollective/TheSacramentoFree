import type { FeedFilterPreferences, UserProfile } from '../types';
import { SACRAMENTO_NEIGHBORHOODS } from '../types';
import { LISTING_TYPE_FILTERS, type ListingTypeFilter } from './postType';
import { PRIMARY_FEED_SORTS, MORE_FEED_SORTS, type FeedSortMode } from './feedSort';
import {
  persistUserAppPreferencesCached,
  readStoredAppPrefs,
  writeStoredAppPrefs,
} from './appPrefsCache';

export type FeedListingQuickPick = 'saved' | 'my_neighborhood' | 'with_photos' | 'needs_pickup';
export type FeedStatusFilter = 'all' | 'active' | 'pending_pickup' | 'on_hold';
export type FeedVoteFilter = 'all' | 'i_interested' | 'has_interest' | 'has_comments';

const FEED_SORTS: FeedSortMode[] = [
  ...PRIMARY_FEED_SORTS.map((s) => s.value),
  ...MORE_FEED_SORTS.map((s) => s.value),
];
const FEED_QUICK_PICKS: FeedListingQuickPick[] = ['saved', 'my_neighborhood', 'with_photos', 'needs_pickup'];
const FEED_STATUS_FILTERS: FeedStatusFilter[] = ['all', 'active', 'pending_pickup', 'on_hold'];
const FEED_VOTE_FILTERS: FeedVoteFilter[] = ['all', 'i_interested', 'has_interest', 'has_comments'];

export type FeedFilterState = {
  selectedType: ListingTypeFilter;
  selectedCategory: string;
  selectedNeighborhood: string;
  selectedStatus: FeedStatusFilter;
  selectedVoteFilter: FeedVoteFilter;
  sortBy: FeedSortMode | null;
  activeQuickPicks: Set<FeedListingQuickPick>;
  gridSortMode: 'nearest' | 'new';
};

export const DEFAULT_FEED_FILTER_STATE: FeedFilterState = {
  selectedType: 'all',
  selectedCategory: 'All Categories',
  selectedNeighborhood: 'All Neighborhoods',
  selectedStatus: 'all',
  selectedVoteFilter: 'all',
  sortBy: null,
  activeQuickPicks: new Set(),
  gridSortMode: 'nearest',
};

function isListingTypeFilter(value: unknown): value is ListingTypeFilter {
  return typeof value === 'string' && LISTING_TYPE_FILTERS.includes(value as ListingTypeFilter);
}

function isFeedSortMode(value: unknown): value is FeedSortMode {
  return typeof value === 'string' && FEED_SORTS.includes(value as FeedSortMode);
}

function isFeedListingQuickPick(value: unknown): value is FeedListingQuickPick {
  return typeof value === 'string' && FEED_QUICK_PICKS.includes(value as FeedListingQuickPick);
}

function isFeedStatusFilter(value: unknown): value is FeedStatusFilter {
  return typeof value === 'string' && FEED_STATUS_FILTERS.includes(value as FeedStatusFilter);
}

function isFeedVoteFilter(value: unknown): value is FeedVoteFilter {
  return typeof value === 'string' && FEED_VOTE_FILTERS.includes(value as FeedVoteFilter);
}

function isNeighborhoodValue(value: unknown): value is string {
  return value === 'All Neighborhoods' || (typeof value === 'string' && SACRAMENTO_NEIGHBORHOODS.includes(value));
}

function isCategoryValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function normalizeFeedFilterPreferences(raw: unknown): FeedFilterPreferences {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const prefs: FeedFilterPreferences = {};

  if (source.sortBy === null) {
    prefs.sortBy = null;
  } else if (isFeedSortMode(source.sortBy)) {
    prefs.sortBy = source.sortBy;
  }

  if (isListingTypeFilter(source.selectedType)) prefs.selectedType = source.selectedType;
  if (isCategoryValue(source.selectedCategory)) prefs.selectedCategory = source.selectedCategory;
  if (isNeighborhoodValue(source.selectedNeighborhood)) prefs.selectedNeighborhood = source.selectedNeighborhood;
  if (isFeedStatusFilter(source.selectedStatus)) prefs.selectedStatus = source.selectedStatus;
  if (isFeedVoteFilter(source.selectedVoteFilter)) prefs.selectedVoteFilter = source.selectedVoteFilter;
  if (source.gridSortMode === 'nearest' || source.gridSortMode === 'new') prefs.gridSortMode = source.gridSortMode;

  if (Array.isArray(source.quickPicks)) {
    prefs.quickPicks = source.quickPicks.filter(isFeedListingQuickPick);
  }

  return prefs;
}

export function feedFilterStateFromPreferences(
  prefs: FeedFilterPreferences | null | undefined,
): FeedFilterState {
  const normalized = normalizeFeedFilterPreferences(prefs);
  return {
    selectedType: normalized.selectedType ?? DEFAULT_FEED_FILTER_STATE.selectedType,
    selectedCategory: normalized.selectedCategory ?? DEFAULT_FEED_FILTER_STATE.selectedCategory,
    selectedNeighborhood: normalized.selectedNeighborhood ?? DEFAULT_FEED_FILTER_STATE.selectedNeighborhood,
    selectedStatus: normalized.selectedStatus ?? DEFAULT_FEED_FILTER_STATE.selectedStatus,
    selectedVoteFilter: normalized.selectedVoteFilter ?? DEFAULT_FEED_FILTER_STATE.selectedVoteFilter,
    sortBy: (normalized.sortBy as FeedSortMode | null | undefined) ?? null,
    activeQuickPicks: new Set(normalized.quickPicks ?? []),
    gridSortMode: normalized.gridSortMode ?? DEFAULT_FEED_FILTER_STATE.gridSortMode,
  };
}

export function feedFilterPreferencesFromState(state: FeedFilterState): FeedFilterPreferences {
  return {
    selectedType: state.selectedType,
    selectedCategory: state.selectedCategory,
    selectedNeighborhood: state.selectedNeighborhood,
    selectedStatus: state.selectedStatus,
    selectedVoteFilter: state.selectedVoteFilter,
    sortBy: state.sortBy,
    gridSortMode: state.gridSortMode,
    quickPicks: [...state.activeQuickPicks],
  };
}

export function readFeedFilterState(profile: UserProfile): FeedFilterState {
  const stored = readStoredAppPrefs(profile.uid);
  const fromStored = stored?.appPreferences?.feedFilters;
  const fromProfile = profile.appPreferences?.feedFilters;
  return feedFilterStateFromPreferences(
    normalizeFeedFilterPreferences({ ...fromProfile, ...fromStored }),
  );
}

export function writeFeedFilterStateLocally(profile: UserProfile, state: FeedFilterState): void {
  const existing = readStoredAppPrefs(profile.uid)?.appPreferences ?? profile.appPreferences ?? {};
  writeStoredAppPrefs({
    uid: profile.uid,
    appPreferences: {
      ...existing,
      feedFilters: feedFilterPreferencesFromState(state),
    },
  });
}

export async function persistUserFeedFilters(
  profile: UserProfile,
  state: FeedFilterState,
): Promise<{ ok: boolean; profile?: UserProfile; errorMessage?: string }> {
  return persistUserAppPreferencesCached(profile, {
    feedFilters: feedFilterPreferencesFromState(state),
  });
}
