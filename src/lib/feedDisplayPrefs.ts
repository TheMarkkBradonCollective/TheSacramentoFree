import type { FeedPost, ItemPost, FeedViewMode, FeedContentFilter, FeedAudienceScope, UserProfile } from '../types';
import { readStoredAppPrefs } from './appPrefsCache';
import { mergeAppPreferences } from './appPreferencesModel';

const VIEW_MODE_KEY = 'sbn_feed_view_mode_v1';
const EVENTS_VIEW_MODE_KEY = 'sbn_events_view_mode_v1';

export type { FeedViewMode, FeedContentFilter, FeedAudienceScope };

const FEED_CONTENT_FILTER_KEY = 'sbn_feed_content_filter_v1';

const FEED_AUDIENCE_SCOPE_KEY = 'sbn_feed_audience_scope_v1';

export const FEED_CONTENT_FILTER_ORDER: FeedContentFilter[] = ['all', 'text', 'pictures'];

export const FEED_AUDIENCE_SCOPE_ORDER: FeedAudienceScope[] = ['everyone', 'neighbors', 'friends'];

export function feedContentFilterLabel(filter: FeedContentFilter): string {
  if (filter === 'text') return 'Text';
  if (filter === 'pictures') return 'Pictures';
  return 'All';
}

export function feedAudienceScopeLabel(scope: FeedAudienceScope): string {
  if (scope === 'neighbors') return 'Neighbors';
  if (scope === 'friends') return 'Friends';
  return 'Everyone';
}

export function cycleFeedContentFilter(current: FeedContentFilter): FeedContentFilter {
  const idx = FEED_CONTENT_FILTER_ORDER.indexOf(current);
  return FEED_CONTENT_FILTER_ORDER[(idx + 1) % FEED_CONTENT_FILTER_ORDER.length];
}

export function cycleFeedAudienceScope(current: FeedAudienceScope): FeedAudienceScope {
  const idx = FEED_AUDIENCE_SCOPE_ORDER.indexOf(current);
  return FEED_AUDIENCE_SCOPE_ORDER[(idx + 1) % FEED_AUDIENCE_SCOPE_ORDER.length];
}

export function readFeedAudienceScope(): FeedAudienceScope {
  try {
    const raw = localStorage.getItem(FEED_AUDIENCE_SCOPE_KEY);
    if (raw === 'everyone' || raw === 'neighbors' || raw === 'friends') return raw;
  } catch {
    /* ignore */
  }
  return 'neighbors';
}

export function writeFeedAudienceScope(value: FeedAudienceScope): void {
  try {
    localStorage.setItem(FEED_AUDIENCE_SCOPE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function feedPostMatchesAudienceScope(
  post: Pick<FeedPost, 'userId' | 'neighborhood'>,
  scope: FeedAudienceScope,
  context: {
    viewerUserId: string;
    viewerNeighborhood: string;
    friendIds: Set<string>;
  },
): boolean {
  if (post.userId === context.viewerUserId) return true;
  if (scope === 'everyone') return true;
  if (scope === 'neighbors') {
    return post.neighborhood === context.viewerNeighborhood;
  }
  return context.friendIds.has(post.userId);
}

export function readFeedContentFilter(): FeedContentFilter {
  try {
    const raw = localStorage.getItem(FEED_CONTENT_FILTER_KEY);
    if (raw === 'all' || raw === 'text' || raw === 'pictures') return raw;
  } catch {
    /* ignore */
  }
  return 'all';
}

export function writeFeedContentFilter(value: FeedContentFilter): void {
  try {
    localStorage.setItem(FEED_CONTENT_FILTER_KEY, value);
  } catch {
    /* ignore */
  }
}

export function resolveFeedDisplayFilters(profile: UserProfile): {
  contentFilter: FeedContentFilter;
  audienceScope: FeedAudienceScope;
} {
  const stored = readStoredAppPrefs(profile.uid)?.appPreferences;
  const merged = mergeAppPreferences(profile.appPreferences, stored ?? {});
  return {
    contentFilter: merged.feedContentFilter ?? readFeedContentFilter(),
    audienceScope: merged.feedAudienceScope ?? readFeedAudienceScope(),
  };
}

export function feedPostMatchesContentFilter(
  post: Pick<FeedPost, 'imageUrls'>,
  filter: FeedContentFilter,
): boolean {
  const hasPictures = post.imageUrls.length > 0;
  if (filter === 'text') return !hasPictures;
  if (filter === 'pictures') return hasPictures;
  return true;
}

export function readFeedViewMode(): FeedViewMode {
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    if (raw === 'grid' || raw === 'list') return raw;
  } catch {
    /* ignore */
  }
  return 'grid';
}

export function writeFeedViewMode(value: FeedViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function readEventsViewMode(): FeedViewMode {
  try {
    const raw = localStorage.getItem(EVENTS_VIEW_MODE_KEY);
    if (raw === 'grid' || raw === 'list') return raw;
  } catch {
    /* ignore */
  }
  return 'grid';
}

export function writeEventsViewMode(value: FeedViewMode): void {
  try {
    localStorage.setItem(EVENTS_VIEW_MODE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function isClosedCommunityListing(item: Pick<ItemPost, 'status'>): boolean {
  return item.status === 'completed';
}

export function isGivenListing(item: Pick<ItemPost, 'type' | 'status'>): boolean {
  return item.type === 'giveaway' && item.status === 'completed';
}

export function isFulfilledListing(item: Pick<ItemPost, 'type' | 'status'>): boolean {
  return item.type === 'looking' && item.status === 'completed';
}
