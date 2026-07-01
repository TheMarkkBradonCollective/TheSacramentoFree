import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Clock, Gift, Package, Sparkles, Star } from 'lucide-react';
import type { ItemPost } from '../types';
import { AWARDS } from '../siteContent';
import { getNeighborAwardClaims, getNeighborStats } from '../supabase';
import {
  buildNeighborAwardSummary,
  formatAwardDate,
  type NeighborAwardTimelineEntry,
} from '../lib/neighborAwards';

interface AwardsNeighborHistoryProps {
  userId: string;
  userPosts: ItemPost[];
}

function timelineIcon(kind: NeighborAwardTimelineEntry['kind']) {
  switch (kind) {
    case 'gave_away':
      return Gift;
    case 'received_gift':
      return Package;
    case 'fulfilled_request':
      return Sparkles;
    case 'helped_neighbor':
      return Star;
    case 'trade_completed':
      return ArrowLeftRight;
  }
}

export default function AwardsNeighborHistory({ userId, userPosts }: AwardsNeighborHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Awaited<ReturnType<typeof getNeighborAwardClaims>>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getNeighborStats>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([getNeighborStats(userId), getNeighborAwardClaims(userId)]).then(
      ([nextStats, nextClaims]) => {
        if (cancelled) return;
        setStats(nextStats);
        setClaims(nextClaims);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const timeline = useMemo(() => {
    if (!stats) return [];
    return buildNeighborAwardSummary({
      userId,
      posts: userPosts,
      claims,
      stats,
    }).timeline;
  }, [userId, userPosts, claims, stats]);

  if (loading) {
    return <p className="text-sm text-muted text-center py-8">Loading your neighborhood history…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-accent" />
        <h4 className="text-xs font-bold text-muted uppercase tracking-wider">{AWARDS.timelineTitle}</h4>
      </div>
      <p className="text-xs text-muted leading-relaxed">{AWARDS.timelineIntro}</p>

      {timeline.length === 0 ? (
        <div className="sbn-card p-4 text-sm text-muted text-center">{AWARDS.timelineEmpty}</div>
      ) : (
        <ol className="relative border-l border-accent/30 ml-3 space-y-4 pl-5">
          {timeline.map((entry) => {
            const Icon = timelineIcon(entry.kind);
            return (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Icon className="w-3 h-3" />
                </span>
                <div className="rounded-xl border border-app bg-inset/50 p-3">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    {formatAwardDate(entry.at)}
                  </p>
                  <p className="text-sm font-semibold text-app mt-0.5">{entry.title}</p>
                  <p className="text-xs text-muted mt-1">{entry.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
