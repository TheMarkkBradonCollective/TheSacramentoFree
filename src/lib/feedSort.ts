import type { ItemPost } from '../types';
import { getListingNavigateLabel } from './listingMapActions';

/** Primary feed sort modes — Reddit-style browsing. */
export type FeedSortMode =
  | 'new'
  | 'hot'
  | 'top'
  | 'active'
  | 'oldest'
  | 'most_upvotes'
  | 'most_comments'
  | 'go_get'
  | 'drop_off'
  | 'meet_up'
  | 'pick_up';

export interface FeedEngagementSlice {
  upvotes: number;
  downvotes: number;
  commentCount: number;
}

export const PRIMARY_FEED_SORTS: { value: FeedSortMode; label: string; hint: string }[] = [
  { value: 'new', label: 'New', hint: 'Latest posts first' },
  { value: 'hot', label: 'Hot', hint: 'Trending — votes and freshness' },
  { value: 'top', label: 'Top', hint: 'Highest score (upvotes − downvotes)' },
  { value: 'active', label: 'Active', hint: 'Most comments and neighbor activity' },
];

export const MORE_FEED_SORTS: { value: FeedSortMode; label: string }[] = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_upvotes', label: 'Most upvotes' },
  { value: 'most_comments', label: 'Most comments' },
];

/** Pickup & coordination labels — filter feed by navigate action. */
export const COORDINATION_FEED_SORTS: { value: FeedSortMode; label: string; hint: string }[] = [
  { value: 'go_get', label: 'Go Get', hint: 'Giveaways to pick up in person' },
  { value: 'drop_off', label: 'Drop off', hint: 'Neighbors looking for something' },
  { value: 'meet_up', label: 'Meet up', hint: 'Trades to coordinate in person' },
  { value: 'pick_up', label: 'Pick Up', hint: 'Curb alerts — grab at the pin' },
];

const COORDINATION_SORT_LABELS: Record<
  Extract<FeedSortMode, 'go_get' | 'drop_off' | 'meet_up' | 'pick_up'>,
  string
> = {
  go_get: 'Go Get',
  drop_off: 'Drop off',
  meet_up: 'Meet up',
  pick_up: 'Pick Up',
};

export function isCoordinationFeedSort(
  mode: FeedSortMode,
): mode is Extract<FeedSortMode, 'go_get' | 'drop_off' | 'meet_up' | 'pick_up'> {
  return mode in COORDINATION_SORT_LABELS;
}

export function itemMatchesCoordinationFeedSort(item: ItemPost, mode: FeedSortMode): boolean {
  if (!isCoordinationFeedSort(mode)) return true;
  return getListingNavigateLabel(item) === COORDINATION_SORT_LABELS[mode];
}

function feedSortCompareMode(mode: FeedSortMode): Exclude<FeedSortMode, 'go_get' | 'drop_off' | 'meet_up' | 'pick_up'> {
  return isCoordinationFeedSort(mode) ? 'new' : mode;
}

export function feedEngagementSlice(
  upvotes: number,
  downvotes: number,
  commentCount: number,
): FeedEngagementSlice {
  return { upvotes, downvotes, commentCount };
}

export function feedNetScore(eng: FeedEngagementSlice): number {
  return eng.upvotes - eng.downvotes;
}

/** Reddit-style hot rank: engagement plus recency. */
export function feedHotScore(eng: FeedEngagementSlice, createdAt: string | Date | number): number {
  const net = feedNetScore(eng);
  const sign = net > 0 ? 1 : net < 0 ? -1 : 0;
  const magnitude = Math.log10(Math.max(Math.abs(net), 1));
  const activity = Math.log10(Math.max(eng.upvotes + eng.downvotes + eng.commentCount, 1));
  const seconds = new Date(createdAt).getTime() / 1000;
  return sign * magnitude + activity * 0.35 + seconds / 45000;
}

/** Comments, votes, and recent updates — busy threads rise. */
export function feedActivityScore(
  eng: FeedEngagementSlice,
  updatedAt?: string | Date | number | null,
): number {
  const base = eng.commentCount * 4 + eng.upvotes * 2 + eng.downvotes;
  if (!updatedAt) return base;
  const ageHours = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000;
  const recencyBoost = Math.max(0, 48 - ageHours) / 48;
  return base + recencyBoost * 6;
}

function itemTime(value: ItemPost['createdAt']): number {
  return new Date(value as string | number).getTime();
}

function itemUpdatedTime(item: ItemPost): number {
  const value = item.updatedAt ?? item.createdAt;
  return new Date(value as string | number).getTime();
}

export function compareFeedItems(
  a: ItemPost,
  b: ItemPost,
  mode: FeedSortMode,
  getEngagement: (itemId: string) => FeedEngagementSlice,
): number {
  const engA = getEngagement(a.id);
  const engB = getEngagement(b.id);
  const compareMode = feedSortCompareMode(mode);

  switch (compareMode) {
    case 'oldest':
      return itemTime(a.createdAt) - itemTime(b.createdAt);
    case 'most_upvotes':
      return engB.upvotes - engA.upvotes || itemTime(b.createdAt) - itemTime(a.createdAt);
    case 'most_comments':
      return engB.commentCount - engA.commentCount || itemTime(b.createdAt) - itemTime(a.createdAt);
    case 'top': {
      const scoreDiff = feedNetScore(engB) - feedNetScore(engA);
      if (scoreDiff !== 0) return scoreDiff;
      return engB.upvotes - engA.upvotes || itemTime(b.createdAt) - itemTime(a.createdAt);
    }
    case 'hot':
      return (
        feedHotScore(engB, b.createdAt) - feedHotScore(engA, a.createdAt) ||
        itemTime(b.createdAt) - itemTime(a.createdAt)
      );
    case 'active':
      return (
        feedActivityScore(engB, b.updatedAt) - feedActivityScore(engA, a.updatedAt) ||
        itemUpdatedTime(b) - itemUpdatedTime(a)
      );
    case 'new':
    default:
      return itemTime(b.createdAt) - itemTime(a.createdAt);
  }
}

export function isPrimaryFeedSort(mode: FeedSortMode): boolean {
  return PRIMARY_FEED_SORTS.some((option) => option.value === mode);
}

/** Nearest-first for proximity grid — items without distance sink to the bottom. */
export function compareFeedItemsByDistance(
  a: ItemPost,
  b: ItemPost,
  getDistanceMeters: (item: ItemPost) => number | null,
): number {
  const distA = getDistanceMeters(a);
  const distB = getDistanceMeters(b);
  if (distA != null && distB != null) {
    const diff = distA - distB;
    if (diff !== 0) return diff;
  } else if (distA != null) return -1;
  else if (distB != null) return 1;
  return itemTime(b.createdAt) - itemTime(a.createdAt);
}
