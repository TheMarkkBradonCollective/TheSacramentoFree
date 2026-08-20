import type { FeedPost, ItemPost, FeedViewMode } from '../types';

const VIEW_MODE_KEY = 'sbn_feed_view_mode_v1';
const EVENTS_VIEW_MODE_KEY = 'sbn_events_view_mode_v1';

export type { FeedViewMode };

export type FeedContentFilter = 'all' | 'text' | 'pictures';

const FEED_CONTENT_FILTER_KEY = 'sbn_feed_content_filter_v1';

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
