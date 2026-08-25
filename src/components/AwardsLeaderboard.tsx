import { Crown, Medal, Trophy } from 'lucide-react';
import type { AwardLeaderboardEntry } from '../types';
import { AWARDS } from '../siteContent';

interface AwardsLeaderboardProps {
  entries: AwardLeaderboardEntry[];
  loading: boolean;
  currentUserId: string;
  onViewProfile?: (userId: string) => void;
}

function rankLabel(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function rankAccent(rank: number): string {
  if (rank === 1) return 'border-accent/50 bg-gradient-to-r from-accent/10 to-accent-soft/20';
  if (rank === 2) return 'border-slate-300/40 bg-gradient-to-r from-slate-400/10 to-inset/40';
  if (rank === 3) return 'border-accent/35 bg-gradient-to-r from-accent/10 to-inset/30';
  return 'border-app bg-surface';
}

function avatarUrl(entry: AwardLeaderboardEntry): string {
  if (entry.photoURL?.startsWith('http')) return entry.photoURL;
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(entry.displayName)}`;
}

export default function AwardsLeaderboard({
  entries,
  loading,
  currentUserId,
  onViewProfile,
}: AwardsLeaderboardProps) {
  if (loading) {
    return (
      <div className="sbn-card p-8 text-center space-y-3 rounded-2xl border-dashed border-accent/25">
        <Trophy className="w-8 h-8 text-accent mx-auto animate-pulse" />
        <p className="text-sm font-semibold text-muted">{AWARDS.leaderboardLoading}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="sbn-card p-8 text-center space-y-3 rounded-2xl border-dashed border-accent/25 bg-accent-soft/10">
        <Medal className="w-8 h-8 text-accent mx-auto" />
        <p className="text-base font-display font-bold text-app">{AWARDS.leaderboardEmptyTitle}</p>
        <p className="text-sm text-muted max-w-sm mx-auto">{AWARDS.leaderboardEmptyHint}</p>
      </div>
    );
  }

  const currentEntry = entries.find((entry) => entry.userId === currentUserId);

  return (
    <section className="space-y-4">
      <div className="sbn-card p-4 rounded-2xl border-accent/20 bg-gradient-to-br from-accent-soft/20 via-surface to-surface">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-accent-soft border border-accent/25 shrink-0">
            <Crown className="w-5 h-5 text-accent" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-app">{AWARDS.leaderboardTitle}</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">{AWARDS.leaderboardSubtitle}</p>
          </div>
        </div>
      </div>

      <ol className="space-y-2">
        {entries.map((entry) => {
          const isSelf = entry.userId === currentUserId;
          const clickable = !!onViewProfile && !isSelf;

          return (
            <li key={entry.userId}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onViewProfile?.(entry.userId)}
                className={`w-full rounded-2xl border p-3 flex items-center gap-3 text-left transition-all ${rankAccent(entry.rank)} ${
                  isSelf ? 'ring-2 ring-accent/35' : ''
                } ${clickable ? 'hover:border-accent/40 hover:shadow-md cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  className={`shrink-0 w-9 text-center font-display font-black tabular-nums ${
                    entry.rank <= 3 ? 'text-lg' : 'text-sm text-muted'
                  }`}
                  aria-hidden
                >
                  {rankLabel(entry.rank)}
                </span>
                <img
                  src={avatarUrl(entry)}
                  alt=""
                  className="w-11 h-11 rounded-full border border-app shrink-0 object-cover bg-inset"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-app truncate">
                    {entry.displayName}
                    {isSelf ? <span className="text-accent"> (you)</span> : null}
                  </p>
                  <p className="text-[11px] text-muted truncate">
                    {entry.neighborhood || 'Sacramento area'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-black text-accent tabular-nums leading-none">
                    {entry.awardCount}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mt-0.5">
                    {entry.awardCount === 1 ? 'badge' : 'badges'}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {currentEntry && currentEntry.rank > 3 && (
        <p className="text-center text-xs text-muted">
          You&apos;re #{currentEntry.rank} with {currentEntry.awardCount}{' '}
          {currentEntry.awardCount === 1 ? 'badge' : 'badges'}.
        </p>
      )}
    </section>
  );
}
