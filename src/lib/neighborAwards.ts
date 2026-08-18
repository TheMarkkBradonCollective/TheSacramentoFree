import type { ItemPost, PostType } from '../types';
import type { NeighborStats } from '../supabase';

export type AwardTimelineKind =
  | 'gave_away'
  | 'received_gift'
  | 'fulfilled_request'
  | 'helped_neighbor'
  | 'trade_completed';

export interface NeighborAwardTimelineEntry {
  id: string;
  at: string;
  kind: AwardTimelineKind;
  title: string;
  detail: string;
}

export interface NeighborAwardBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export interface NeighborAwardSummary {
  badges: NeighborAwardBadge[];
  timeline: NeighborAwardTimelineEntry[];
  stats: NeighborStats;
}

export interface NeighborAwardClaimRow {
  id: string;
  itemId: string;
  kind: string;
  createdAt: string;
  giverUserId: string;
  claimerUserId: string;
  itemTitle?: string;
  itemType?: PostType;
}

function itemTimestamp(item: ItemPost): string {
  const raw = item.updatedAt ?? item.createdAt;
  if (!raw) return new Date(0).toISOString();
  if (typeof raw === 'object' && raw !== null && 'seconds' in raw) {
    return new Date((raw as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date(raw).toISOString();
}

function timelineKindForCompletedPost(type: PostType): AwardTimelineKind {
  if (type === 'looking') return 'fulfilled_request';
  if (type === 'trade') return 'trade_completed';
  return 'gave_away';
}

function timelineLabel(kind: AwardTimelineKind): string {
  switch (kind) {
    case 'gave_away':
      return 'Gave away';
    case 'received_gift':
      return 'Received';
    case 'fulfilled_request':
      return 'Request fulfilled';
    case 'helped_neighbor':
      return 'Helped a neighbor';
    case 'trade_completed':
      return 'Trade completed';
  }
}

export function buildAwardTimeline(params: {
  userId: string;
  posts: ItemPost[];
  claims: NeighborAwardClaimRow[];
}): NeighborAwardTimelineEntry[] {
  const entries: NeighborAwardTimelineEntry[] = [];

  for (const post of params.posts) {
    if (post.status !== 'completed') continue;
    const kind = timelineKindForCompletedPost(post.type);
    entries.push({
      id: `post_${post.id}`,
      at: itemTimestamp(post),
      kind,
      title: post.title,
      detail: timelineLabel(kind),
    });
  }

  for (const claim of params.claims) {
    const title = claim.itemTitle || 'Community listing';
    const at = claim.createdAt;

    if (claim.claimerUserId === params.userId) {
      if (claim.kind === 'request_fulfilled') {
        entries.push({
          id: `claim_recv_${claim.id}`,
          at,
          kind: 'received_gift',
          title,
          detail: 'Received help from a neighbor',
        });
      } else {
        entries.push({
          id: `claim_pickup_${claim.id}`,
          at,
          kind: 'received_gift',
          title,
          detail: 'Picked up a free gift',
        });
      }
    }

    if (claim.giverUserId === params.userId && claim.kind === 'request_fulfilled') {
      entries.push({
        id: `claim_help_${claim.id}`,
        at,
        kind: 'helped_neighbor',
        title,
        detail: 'Helped fulfill a neighbor request',
      });
    }
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function buildAwardBadges(stats: NeighborStats, posts: ItemPost[]): NeighborAwardBadge[] {
  const completedGives = posts.filter((p) => p.type === 'giveaway' && p.status === 'completed').length;
  const completedIso = posts.filter((p) => p.type === 'looking' && p.status === 'completed').length;

  return [
    {
      id: 'first_gift',
      title: 'First gift',
      description: 'Completed your first giveaway',
      earned: stats.itemsGiven >= 1 || completedGives >= 1,
    },
    {
      id: 'generous_neighbor',
      title: 'Generous neighbor',
      description: 'Gave away 5+ items',
      earned: stats.itemsGiven >= 5,
    },
    {
      id: 'community_hero',
      title: 'Community hero',
      description: 'Gave away 10+ items',
      earned: stats.itemsGiven >= 10,
    },
    {
      id: 'helping_hand',
      title: 'Helping hand',
      description: 'Received or claimed help from neighbors',
      earned: stats.itemsClaimed >= 1,
    },
    {
      id: 'neighbor_favorite',
      title: 'Neighbor favorite',
      description: 'Earned 5+ upvotes on your listings',
      earned: stats.upvotesReceived >= 5,
    },
    {
      id: 'trade_pioneer',
      title: 'Trade pioneer',
      description: 'Completed a free item-for-item trade',
      earned: stats.tradesCompleted >= 1,
    },
    {
      id: 'request_champion',
      title: 'Request champion',
      description: 'Got an ISO request fulfilled',
      earned: completedIso >= 1,
    },
  ];
}

export function buildNeighborAwardSummary(params: {
  userId: string;
  posts: ItemPost[];
  claims: NeighborAwardClaimRow[];
  stats: NeighborStats;
}): NeighborAwardSummary {
  return {
    badges: buildAwardBadges(params.stats, params.posts),
    timeline: buildAwardTimeline(params),
    stats: params.stats,
  };
}

export function formatAwardDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
