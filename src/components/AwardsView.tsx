import { useEffect, useMemo, useState } from 'react';
import { Award, Clock, Gift, Package, Sparkles, Star, ArrowLeftRight } from 'lucide-react';
import type { ItemPost, UserProfile } from '../types';
import { AWARDS } from '../siteContent';
import { getNeighborAwardClaims, getNeighborStats } from '../supabase';
import {
  buildNeighborAwardSummary,
  formatAwardDate,
  type NeighborAwardTimelineEntry,
} from '../lib/neighborAwards';

interface AwardsViewProps {
  userProfile: UserProfile;
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

export default function AwardsView({ userProfile, userPosts }: AwardsViewProps) {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Awaited<ReturnType<typeof getNeighborAwardClaims>>>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getNeighborStats>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([getNeighborStats(userProfile.uid), getNeighborAwardClaims(userProfile.uid)]).then(
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
  }, [userProfile.uid]);

  const summary = useMemo(() => {
    if (!stats) return null;
    return buildNeighborAwardSummary({
      userId: userProfile.uid,
      posts: userPosts,
      claims,
      stats,
    });
  }, [userProfile.uid, userPosts, claims, stats]);

  const earnedCount = summary?.badges.filter((b) => b.earned).length ?? 0;

  return (
    <div className="space-y-8 pb-4" id="awards_view">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-soft border border-accent/30 sbn-awards-glow-btn">
          <Award className="w-8 h-8 text-accent" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-2xl font-bold text-app">{AWARDS.panelTitle}</h3>
          <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">{AWARDS.panelIntro}</p>
        </div>
        {!loading && summary && (
          <p className="text-xs font-bold text-accent uppercase tracking-wider">
            {earnedCount} of {summary.badges.length} badges earned
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted text-center">Loading your neighborhood history…</p>
      ) : summary ? (
        <>
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Badges</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summary.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`rounded-xl border p-3 ${
                    badge.earned
                      ? 'border-accent/40 bg-accent-soft/40 sbn-awards-glow-btn'
                      : 'border-app bg-inset opacity-70'
                  }`}
                >
                  <p className="text-sm font-bold text-app">{badge.title}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{badge.description}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-2 text-accent">
                    {badge.earned ? 'Earned' : 'Locked'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">{AWARDS.timelineTitle}</h4>
            </div>
            <p className="text-xs text-muted leading-relaxed">{AWARDS.timelineIntro}</p>

            {summary.timeline.length === 0 ? (
              <div className="sbn-card p-4 text-sm text-muted text-center">{AWARDS.timelineEmpty}</div>
            ) : (
              <ol className="relative border-l border-accent/30 ml-3 space-y-4 pl-5">
                {summary.timeline.map((entry) => {
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

          <p className="text-xs text-subtle text-center leading-relaxed">{AWARDS.comingSoonNote}</p>
        </>
      ) : null}
    </div>
  );
}
