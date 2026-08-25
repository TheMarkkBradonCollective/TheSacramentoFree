import { Medal, Sparkles, Trophy } from 'lucide-react';
import type { ItemPost, UserProfile } from '../types';
import CommunityStatsBar from './CommunityStatsBar';
import { useAwardsLeaderboard } from '../hooks/useAwardsLeaderboard';

interface DashboardRailProps {
  items: ItemPost[];
  userProfile: UserProfile;
  canAccessEvents?: boolean;
  onOpenAwards?: () => void;
  onViewProfile?: (uid: string) => void;
}

function avatarUrl(seed: string, photo?: string): string {
  if (photo?.startsWith('http')) return photo;
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}

/** Desktop-only right rail — turns the feed/events page into a real dashboard instead of a lone centered column. */
export default function DashboardRail({
  items,
  userProfile,
  onOpenAwards,
  onViewProfile,
}: DashboardRailProps) {
  const { entries, loading } = useAwardsLeaderboard(true, 5);

  return (
    <aside className="sbn-rail" id="dashboard_rail" aria-label="Community dashboard">
      <div className="sbn-rail-card">
        <p className="sbn-rail-card-title">Quick actions</p>
        <div className="space-y-1.5">
          {onOpenAwards && (
            <button type="button" onClick={onOpenAwards} className="sbn-rail-quick-btn" id="rail_awards_btn">
              <span className="p-1.5 rounded-md bg-accent/15 text-accent">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              Your badges
            </button>
          )}
          <p className="text-[11px] text-muted leading-snug px-1.5 pt-1">
            Map + opens Stuff or Events. Stuff and Events tabs use New for that page only.
          </p>
        </div>
      </div>

      <div className="sbn-rail-card">
        <p className="sbn-rail-card-title">Community pulse</p>
        <CommunityStatsBar items={items} variant="stacked" />
      </div>

      <div className="sbn-rail-card">
        <p className="sbn-rail-card-title">
          Top neighbors
          <Trophy className="w-3.5 h-3.5 text-accent" />
        </p>
        {loading ? (
          <div className="py-4 text-center text-xs text-muted">Loading leaderboard…</div>
        ) : entries.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted flex flex-col items-center gap-2">
            <Medal className="w-5 h-5 text-subtle" />
            No badges earned yet — be the first!
          </div>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry, i) => (
              <li key={entry.userId}>
                <button
                  type="button"
                  onClick={() => onViewProfile?.(entry.userId)}
                  disabled={!onViewProfile || entry.userId === userProfile.uid}
                  className="w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg text-left hover:bg-inset transition-colors disabled:cursor-default"
                >
                  <span className="w-4 text-center text-[11px] font-black text-subtle tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <img
                    src={avatarUrl(entry.displayName, entry.photoURL)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full border border-app object-cover bg-inset shrink-0"
                  />
                  <span className="min-w-0 flex-1 text-xs font-semibold text-app truncate">
                    {entry.displayName}
                    {entry.userId === userProfile.uid && <span className="text-accent"> (you)</span>}
                  </span>
                  <span className="text-xs font-black text-accent tabular-nums shrink-0">{entry.awardCount}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {onOpenAwards && (
          <button
            type="button"
            onClick={onOpenAwards}
            className="w-full mt-2 pt-2 border-t border-app text-[11px] font-bold text-accent hover:text-accent-hover text-center"
          >
            View full leaderboard →
          </button>
        )}
      </div>
    </aside>
  );
}
