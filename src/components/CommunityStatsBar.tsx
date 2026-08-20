import { useEffect, useState } from 'react';
import { Users, Package, Gift, CheckCircle2 } from 'lucide-react';
import { getCommunityStats, type CommunityStats } from '../supabase';
import { ItemPost } from '../types';

interface CommunityStatsBarProps {
  /** When provided, stats appear instantly before the DB fetch completes. */
  items?: ItemPost[];
  /** compact = single scrollable row (mobile); full = 4-up grid (desktop); stacked = vertical list (sidebar rail) */
  variant?: 'compact' | 'full' | 'stacked';
}

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="sbn-stat-pill">
      <span className={`sbn-stat-icon ${color}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-black text-app tabular-nums leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-[9.5px] text-muted font-semibold uppercase tracking-wider leading-none mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="sbn-card p-4 flex items-center gap-3">
      <span className={`sbn-stat-icon ${color}`}>
        <Icon className="w-5 h-5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-black text-app tabular-nums leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-[11px] text-muted font-semibold uppercase tracking-wider mt-0.5">
          {label}
        </div>
        {sub && <div className="text-[10px] text-muted/70 mt-0.5 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

export default function CommunityStatsBar({ items = [], variant = 'full' }: CommunityStatsBarProps) {
  const [dbStats, setDbStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    getCommunityStats().then(setDbStats);
  }, []);

  // Prefer counts from already-loaded items when we have them; DB counts can be 0 for guests
  // or when RLS blocks aggregate queries even though listings loaded successfully.
  const derivedActiveListings = items.filter((i) => i.status === 'active').length;
  const derivedItemsGiven = items.filter((i) => i.type === 'giveaway' && i.status === 'completed').length;
  const derivedRequestsFulfilled = items.filter((i) => i.type === 'looking' && i.status === 'completed').length;

  const activeListings =
    items.length > 0 ? derivedActiveListings : (dbStats?.activeListings ?? derivedActiveListings);
  const itemsGiven =
    items.length > 0 ? derivedItemsGiven : (dbStats?.itemsGiven ?? derivedItemsGiven);
  const requestsFulfilled =
    items.length > 0
      ? derivedRequestsFulfilled
      : (dbStats?.requestsFulfilled ?? derivedRequestsFulfilled);
  const memberCount = dbStats?.memberCount ?? null;

  if (variant === 'stacked') {
    const rows: { icon: React.ElementType; label: string; value: number | string; color: string }[] = [
      ...(memberCount !== null
        ? [{ icon: Users, label: 'Neighbors', value: memberCount, color: 'bg-violet-500/15 text-violet-400' }]
        : []),
      { icon: Package, label: 'Active listings', value: activeListings, color: 'bg-accent/15 text-accent' },
      { icon: Gift, label: 'Given away', value: itemsGiven, color: 'bg-emerald-500/15 text-emerald-400' },
      { icon: CheckCircle2, label: 'Fulfilled', value: requestsFulfilled, color: 'bg-sky-500/15 text-sky-400' },
    ];
    return (
      <div id="community_stats_bar_stacked" aria-label="Community statistics">
        {rows.map((row) => (
          <div className="sbn-rail-stat-row" key={row.label}>
            <span className={`sbn-stat-icon ${row.color}`}>
              <row.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <span className="text-xs text-muted font-semibold">{row.label}</span>
              <span className="text-sm font-black text-app tabular-nums">
                {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        id="community_stats_bar_mobile"
        aria-label="Community statistics"
      >
        {memberCount !== null && (
          <StatPill
            icon={Users}
            label="Neighbors"
            value={memberCount}
            color="bg-violet-500/15 text-violet-400"
          />
        )}
        <StatPill
          icon={Package}
          label="Listed"
          value={activeListings}
          color="bg-accent/15 text-accent"
        />
        <StatPill
          icon={Gift}
          label="Given"
          value={itemsGiven}
          color="bg-emerald-500/15 text-emerald-400"
        />
        <StatPill
          icon={CheckCircle2}
          label="Fulfilled"
          value={requestsFulfilled}
          color="bg-sky-500/15 text-sky-400"
        />
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      id="community_stats_bar_desktop"
      aria-label="Community statistics"
    >
      <StatCard
        icon={Users}
        label="Neighbors"
        value={memberCount ?? '—'}
        color="bg-violet-500/15 text-violet-400"
        sub="registered members"
      />
      <StatCard
        icon={Package}
        label="Listed"
        value={activeListings}
        color="bg-accent/15 text-accent"
        sub="active listings"
      />
      <StatCard
        icon={Gift}
        label="Given Away"
        value={itemsGiven}
        color="bg-emerald-500/15 text-emerald-400"
        sub="completed giveaways"
      />
      <StatCard
        icon={CheckCircle2}
        label="Fulfilled"
        value={requestsFulfilled}
        color="bg-sky-500/15 text-sky-400"
        sub="requests fulfilled"
      />
    </div>
  );
}
