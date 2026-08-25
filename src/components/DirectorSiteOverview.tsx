import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Ban,
  Download,
  Copy,
  Flag,
  LifeBuoy,
  Package,
  ShieldAlert,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { DirectorActivityItem, DirectorSiteOverview } from '../types';
import { getDirectorSiteOverview, supabase } from '../supabase';
import { apiUrl } from '../lib/appOrigin';
import { downloadPlayStoreAsset, downloadPlayStoreZip, playStoreAssetLinks } from '../lib/playStoreAssets';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import UserAvatar from './UserAvatar';
import { formatLastActive } from '../lib/presence';

interface DirectorSiteOverviewProps {
  scrollIntoView?: boolean;
  onScrolled?: () => void;
}

function PlayStoreAssetDownload({
  file,
  label,
  id,
}: {
  file: string;
  label: string;
  id?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        type="button"
        id={id}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void downloadPlayStoreAsset(file)
            .catch((err) => {
              setError(err instanceof Error ? err.message : 'Download failed');
            })
            .finally(() => setBusy(false));
        }}
        className="inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border border-app/60 bg-surface text-app text-xs font-semibold hover:bg-surface-hover transition-colors disabled:opacity-60 cursor-pointer touch-manipulation"
      >
        <span className="truncate text-left">{busy ? 'Downloading…' : label}</span>
        <Download className="w-3.5 h-3.5 shrink-0 text-muted" strokeWidth={2.5} aria-hidden />
      </button>
      {error ? <p className="text-[10px] text-red-400 leading-snug">{error}</p> : null}
    </div>
  );
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
      return 'bg-accent/15 text-accent';
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
  const [exportingTesters, setExportingTesters] = useState(false);
  const [exportTestersError, setExportTestersError] = useState<string | null>(null);
  const [exportTestersNotice, setExportTestersNotice] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const playStoreAssets = useMemo(() => playStoreAssetLinks(), []);

  const reload = useCallback(async () => {
    const data = await getDirectorSiteOverview();
    setOverview(data);
    setLoading(false);
  }, []);

  const deliverPlayTestersCsv = async (csv: string) => {
    const count = csv.split('\n').filter((line) => line.trim()).length;
    const file = new File([csv], 'play-testers.csv', { type: 'text/csv;charset=utf-8' });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Play testers' });
        setExportTestersNotice(`Shared ${count} tester emails.`);
        return;
      }
    } catch {
      /* share cancelled or unsupported — try download / copy */
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'play-testers.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      /* ignore and copy */
    }

    try {
      await navigator.clipboard.writeText(csv);
      setExportTestersNotice(`Copied ${count} emails. Paste into Play Console testers.`);
    } catch {
      window.prompt('Copy these emails for Play Console:', csv);
      setExportTestersNotice(`Showing ${count} emails to copy.`);
    }
  };

  const downloadPlayTesters = useCallback(async () => {
    setExportingTesters(true);
    setExportTestersError(null);
    setExportTestersNotice(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Sign in again to download the tester list.');
      }

      const res = await fetch(apiUrl('/api/admin/export-play-testers'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(json?.error || 'Could not export tester emails.');
        }
        const text = (await res.text().catch(() => '')).trim();
        throw new Error(text || 'Could not export tester emails.');
      }

      const csv = await res.text();
      await deliverPlayTestersCsv(csv);
    } catch (err) {
      setExportTestersError(err instanceof Error ? err.message : 'Could not export tester emails.');
    } finally {
      setExportingTesters(false);
    }
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
          accent={data.suspendedCount > 0 ? 'text-accent' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Downloads" value={data.downloadDevicesTotal} sub={downloadSub} accent="text-cyan-400" />
        <StatTile label="Installs" value={data.installDevicesCount} sub={installSub} accent="text-indigo-400" />
      </div>

      <div className="rounded-xl border border-app/60 bg-inset/40 p-3 space-y-3">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">Play Console</h4>
          <p className="text-[11px] text-muted mt-1 leading-snug">
            Download each listing graphic individually, or grab the full zip. Fictional demo data only.
          </p>
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {playStoreAssets.map((asset) => (
            <div key={asset.file}>
              <PlayStoreAssetDownload
                id={`director_download_play_asset_${asset.file.replace(/[^a-z0-9]+/gi, '_')}`}
                file={asset.file}
                label={asset.label}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <button
            type="button"
            id="director_download_play_screenshots"
            disabled={zipBusy}
            onClick={() => {
              setZipBusy(true);
              setZipError(null);
              void downloadPlayStoreZip()
                .catch((err) => {
                  setZipError(err instanceof Error ? err.message : 'Download failed');
                })
                .finally(() => setZipBusy(false));
            }}
            className="inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-app bg-surface/60 text-app text-xs font-bold hover:bg-surface-hover transition-colors disabled:opacity-60 cursor-pointer touch-manipulation"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
            {zipBusy ? 'Downloading zip…' : 'Download all as zip'}
          </button>
          {zipError ? <p className="text-[10px] text-red-400 leading-snug">{zipError}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void downloadPlayTesters()}
          disabled={exportingTesters}
          className="inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-app bg-surface text-app text-sm font-bold hover:bg-surface-hover transition-colors disabled:opacity-60"
        >
          {exportingTesters ? (
            <Download className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          ) : (
            <Copy className="w-4 h-4" strokeWidth={2.5} aria-hidden />
          )}
          {exportingTesters ? 'Preparing CSV…' : 'Get Play tester emails'}
        </button>
        {exportTestersNotice && (
          <p className="text-[11px] text-emerald-400 leading-snug" role="status">
            {exportTestersNotice}
          </p>
        )}
        {exportTestersError && (
          <p className="text-[11px] text-red-400 leading-snug" role="alert">
            {exportTestersError}
          </p>
        )}
        <p className="text-[10px] text-muted/80 leading-snug">
          Upload screenshots in Play Console → Store presence. Upload tester CSV in Testing → Closed testing → Testers.
        </p>
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
