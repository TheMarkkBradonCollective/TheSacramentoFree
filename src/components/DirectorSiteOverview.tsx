import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Ban,
  Flag,
  LifeBuoy,
  Package,
  ShieldAlert,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { DirectorActivityItem, DirectorSiteOverview } from '../types';
import { getDirectorSiteOverview } from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import UserAvatar from './UserAvatar';
import { formatLastActive } from '../lib/presence';

interface DirectorSiteOverviewProps {
  scrollIntoView?: boolean;
  onScrolled?: () => void;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function activityIcon(kind: DirectorActivityItem['kind']) {
  switch (kind) {
    case 'join':
      return UserPlus;
    case 'leave':
      return UserMinus;
    case 'moderation':
      return ShieldAlert;
    case 'report':
      return Flag;
    case 'ticket':
      return LifeBuoy;
    case 'listing':
      return Package;
    default:
      return Activity;
  }
}

function activityColor(kind: DirectorActivityItem['kind']): string {
  switch (kind) {
    case 'join':
      return 'bg-emerald-500/15 text-emerald-400';
    case 'leave':
      return 'bg-slate-500/15 text-slate-400';
    case 'moderation':
      return 'bg-amber-500/15 text-amber-400';
    case 'report':
      return 'bg-red-500/15 text-red-400';
    case 'ticket':
      return 'bg-sky-500/15 text-sky-400';
    case 'listing':
      return 'bg-accent/15 text-accent';
    default:
      return 'bg-inset text-muted';
  }
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="sbn-card p-3 min-w-0">
      <div className={`text-xl font-black tabular-nums leading-none ${accent || 'text-app'}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">{label}</div>
      {sub && <div className="text-[10px] text-muted/80 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DirectorSiteOverview({ scrollIntoView, onScrolled }: DirectorSiteOverviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [overview, setOverview] = useState<DirectorSiteOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getDirectorSiteOverview();
    setOverview(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void reload();
    }, 250);

    const unsubs = [
      subscribePostgresChanges(
        { channelName: 'director-overview-users', table: 'users', event: '*' },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: 'director-overview-audit', table: 'moderation_audit_log', event: 'INSERT' },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: 'director-overview-reports', table: 'user_reports', event: '*' },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: 'director-overview-tickets', table: 'support_tickets', event: '*' },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: 'director-overview-items', table: 'items', event: '*' },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: 'director-overview-events', table: 'community_events', event: '*' },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: 'director-overview-downloads', table: 'app_device_downloads', event: '*' },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: 'director-overview-installs', table: 'app_device_installs', event: '*' },
        refresh,
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [reload]);

  useEffect(() => {
    if (!scrollIntoView || !rootRef.current) return;
    rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onScrolled?.();
  }, [scrollIntoView, onScrolled]);

  const data = overview ?? {
    totalNeighbors: 0,
    neighborsJoinedToday: 0,
    activeOnlineCount: 0,
    activeTodayCount: 0,
    activeNeighbors: [],
    activeListings: 0,
    upcomingEvents: 0,
    openReports: 0,
    openTickets: 0,
    suspendedCount: 0,
    bannedCount: 0,
    downloadDevicesApk: 0,
    downloadDevicesAab: 0,
    downloadDevicesTotal: 0,
    installDevicesCount: 0,
    installDevicesApk: 0,
    installDevicesPwa: 0,
    installDevicesIosPwa: 0,
    recentActivity: [],
  };

  const installSub =
    data.installDevicesCount > 0
      ? `${data.installDevicesApk} APK · ${data.installDevicesPwa + data.installDevicesIosPwa} home screen`
      : 'unique devices';

  const downloadSub =
    data.downloadDevicesTotal > 0
      ? `${data.downloadDevicesApk} APK · ${data.downloadDevicesAab} AAB`
      : 'unique devices';

  return (
    <section
      ref={rootRef}
      id="director_site_overview"
      className="sbn-card p-4 space-y-4 border border-accent/20 bg-gradient-to-br from-accent/5 via-surface to-surface"
      aria-label="Director site overview"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/15 text-accent">
              <Activity className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <h3 className="font-display font-bold text-sm text-app">Site overview</h3>
          </div>
          <p className="text-[11px] text-muted mt-1 leading-snug">
            Live pulse of the community — neighbors, listings, events, support, moderation, and app installs.
          </p>
        </div>
        {!loading && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Neighbors"
          value={data.totalNeighbors}
          sub={data.neighborsJoinedToday > 0 ? `+${data.neighborsJoinedToday} today` : 'all members'}
          accent="text-violet-400"
        />
        <StatTile
          label="Active (online)"
          value={data.activeOnlineCount}
          sub={data.activeTodayCount > 0 ? `+${data.activeTodayCount} today` : 'last 5 min'}
          accent="text-emerald-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Active listings" value={data.activeListings} accent="text-accent" />
        <StatTile label="Events" value={data.upcomingEvents} accent="text-fuchsia-400" sub="upcoming" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Open tickets"
          value={data.openTickets}
          accent={data.openTickets > 0 ? 'text-sky-400' : undefined}
        />
        <StatTile
          label="Open reports"
          value={data.openReports}
          accent={data.openReports > 0 ? 'text-red-400' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Banned" value={data.bannedCount} accent={data.bannedCount > 0 ? 'text-red-400' : undefined} />
        <StatTile
          label="Suspended"
          value={data.suspendedCount}
          accent={data.suspendedCount > 0 ? 'text-amber-400' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Downloads" value={data.downloadDevicesTotal} sub={downloadSub} accent="text-cyan-400" />
        <StatTile label="Installs" value={data.installDevicesCount} sub={installSub} accent="text-indigo-400" />
      </div>

      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Active now
        </h4>
        {loading ? (
          <p className="text-sm text-muted py-3 text-center">Loading online neighbors…</p>
        ) : data.activeNeighbors.length === 0 ? (
          <p className="text-sm text-muted py-3 text-center">No neighbors online in the last 5 minutes.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.activeNeighbors.map((neighbor) => (
              <li
                key={neighbor.uid}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-inset/60 border border-app/60"
              >
                <UserAvatar
                  uid={neighbor.uid}
                  src={neighbor.photoURL}
                  name={neighbor.displayName}
                  size="sm"
                  lastActiveAt={neighbor.lastActiveAt}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-app truncate">{neighbor.displayName}</p>
                  <p className="text-[10px] text-muted truncate">{neighbor.neighborhood}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">
                    {formatLastActive(neighbor.lastActiveAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Recent activity</h4>
        {loading ? (
          <p className="text-sm text-muted py-3 text-center">Loading activity…</p>
        ) : data.recentActivity.length === 0 ? (
          <p className="text-sm text-muted py-3 text-center">No recent activity yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[18rem] overflow-y-auto pr-1">
            {data.recentActivity.map((item) => {
              const Icon = activityIcon(item.kind);
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-inset/40 border border-app/50"
                >
                  <span
                    className={`shrink-0 p-1.5 rounded-lg ${activityColor(item.kind)}`}
                    aria-hidden
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-app leading-snug">{item.title}</div>
                    {item.detail && (
                      <div className="text-[11px] text-muted mt-0.5 leading-snug">{item.detail}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted shrink-0">{formatWhen(item.at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
