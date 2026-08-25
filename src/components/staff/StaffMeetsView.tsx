import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  CircleOff,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import type { GoGetSession, GoGetSessionStatus, UserProfile } from '../../types';
import { staffGetAllSessions, subscribeToGoGetSession } from '../../lib/goGetSessions';
import { formatRouteDistance } from '../../lib/mapRoute';
import StaffMeetDetailPanel from './StaffMeetDetailPanel';

const STATUS_CONFIG: Record<
  GoGetSessionStatus,
  { label: string; color: string; icon: typeof Activity }
> = {
  awaiting_availability: { label: 'Ringing', color: 'text-accent bg-accent/10', icon: Clock },
  awaiting_schedule: { label: 'Schedule', color: 'text-sky-400 bg-sky-500/10', icon: Clock },
  window_offered:        { label: 'Window offered', color: 'text-sky-400 bg-sky-500/10', icon: Clock },
  scheduled:             { label: 'Scheduled', color: 'text-blue-400 bg-blue-500/10', icon: Clock },
  active:                { label: 'En route', color: 'text-emerald-400 bg-emerald-500/10', icon: Activity },
  arrived:               { label: 'Arrived', color: 'text-teal-400 bg-teal-500/10', icon: MapPin },
  completed:             { label: 'Completed', color: 'text-zinc-400 bg-zinc-500/10', icon: CheckCircle },
  cancelled:             { label: 'Cancelled', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  expired:               { label: 'Expired', color: 'text-accent bg-accent/10', icon: XCircle },
  disputed:              { label: 'Disputed', color: 'text-red-400 bg-red-500/10', icon: AlertTriangle },
};

const LIVE_STATUSES: GoGetSessionStatus[] = ['active', 'arrived', 'awaiting_availability', 'awaiting_schedule', 'window_offered', 'scheduled'];

interface StaffMeetsViewProps {
  actor: UserProfile;
  onViewProfile: (userId: string) => void;
  onOpenViolations?: (sessionId: string) => void;
}

function StatusBadge({ status }: { status: GoGetSessionStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-muted bg-inset', icon: CircleOff };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return '—'; }
}

function elapsed(from: string | null | undefined, to?: string | null): string {
  if (!from) return '';
  const a = new Date(from).getTime();
  const b = to ? new Date(to).getTime() : Date.now();
  const mins = Math.round((b - a) / 60000);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function StaffMeetsView({ actor, onViewProfile, onOpenViolations }: StaffMeetsViewProps) {
  const [sessions, setSessions] = useState<GoGetSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoGetSessionStatus | 'all' | 'live'>('live');
  const [selectedSession, setSelectedSession] = useState<GoGetSession | null>(null);
  const liveSubsRef = useRef<Map<string, () => void>>(new Map());

  const load = async () => {
    setLoading(true);
    const filter = statusFilter === 'live' ? 'all' : statusFilter;
    const rows = await staffGetAllSessions({ statusFilter: filter as GoGetSessionStatus | 'all', limit: 300 });
    const filtered = statusFilter === 'live' ? rows.filter((s) => LIVE_STATUSES.includes(s.status)) : rows;
    setSessions(filtered);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [statusFilter]);

  // Subscribe to live sessions so the list updates in real-time
  useEffect(() => {
    const currentSubs = liveSubsRef.current;
    const liveIds = new Set(sessions.filter((s) => LIVE_STATUSES.includes(s.status)).map((s) => s.id));

    // Unsubscribe from sessions no longer live
    for (const [id, unsub] of currentSubs) {
      if (!liveIds.has(id)) { unsub(); currentSubs.delete(id); }
    }

    // Subscribe to newly live sessions
    for (const session of sessions.filter((s) => LIVE_STATUSES.includes(s.status))) {
      if (!currentSubs.has(session.id)) {
        const unsub = subscribeToGoGetSession(session.id, (updated) => {
          setSessions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
          if (selectedSession?.id === updated.id) setSelectedSession(updated);
        });
        currentSubs.set(session.id, unsub);
      }
    }

    return () => {};
  }, [sessions.map((s) => s.id).join(',')]);

  useEffect(() => {
    return () => { liveSubsRef.current.forEach((u) => u()); };
  }, []);

  const filtered = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.requesterName.toLowerCase().includes(q) ||
      s.fulfillerName.toLowerCase().includes(q) ||
      s.destinationLabel.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  });

  const liveCount = sessions.filter((s) => LIVE_STATUSES.includes(s.status)).length;

  if (selectedSession) {
    return (
      <StaffMeetDetailPanel
        session={selectedSession}
        actor={actor}
        onViewProfile={onViewProfile}
        onBack={() => setSelectedSession(null)}
        onSessionUpdated={(updated) => {
          setSelectedSession(updated);
          setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        }}
        onOpenViolations={onOpenViolations}
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-0 border-b border-app shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">Meet Records</h2>
            <p className="text-xs text-muted mt-0.5">
              {liveCount > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  {liveCount} live session{liveCount !== 1 ? 's' : ''} · {sessions.length} total
                </span>
              ) : (
                `${sessions.length} sessions`
              )}
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-0 overflow-x-auto border-t border-app -mx-0">
          {([
            { v: 'live' as const, label: 'Live', badge: liveCount },
            { v: 'all' as const, label: 'All', badge: undefined },
            { v: 'active' as const, label: 'En Route', badge: undefined },
            { v: 'completed' as const, label: 'Completed', badge: undefined },
            { v: 'cancelled' as const, label: 'Cancelled', badge: undefined },
            { v: 'disputed' as const, label: 'Disputed', badge: undefined },
          ]).map(({ v, label, badge }) => (
            <button
              key={v}
              type="button"
              onClick={() => setStatusFilter(v as typeof statusFilter)}
              className={`shrink-0 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                statusFilter === v ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-app'
              }`}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusFilter === v ? 'bg-accent text-on-accent' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, destination…"
            className="sbn-input text-xs pl-8 w-full"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-app">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <MapPin className="w-8 h-8 text-subtle" />
          <p className="text-sm text-muted">No sessions match your filters.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-app">
          {filtered.map((session) => {
            const isLive = LIVE_STATUSES.includes(session.status);
            const duration = session.completedAt
              ? elapsed(session.startedAt, session.completedAt)
              : session.startedAt
                ? elapsed(session.startedAt)
                : null;

            return (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedSession(session)}
                className="w-full text-left px-4 py-3 hover:bg-inset transition-colors flex items-start gap-3"
              >
                {/* Live pulse or status icon */}
                <div className="shrink-0 mt-0.5">
                  {isLive && session.status === 'active' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block mt-1" />
                  ) : (
                    <span className={`w-2.5 h-2.5 rounded-full inline-block mt-1 ${
                      session.status === 'completed' ? 'bg-zinc-500' :
                      session.status === 'disputed' ? 'bg-red-500' :
                      isLive ? 'bg-blue-400' : 'bg-zinc-600'
                    }`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-app truncate">{session.requesterName}</span>
                      <span className="text-muted text-xs">→</span>
                      <span className="text-xs text-muted truncate">{session.fulfillerName}</span>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>

                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{session.destinationLabel}</span>
                  </p>

                  <div className="flex items-center gap-3 mt-1 text-[10px] text-subtle flex-wrap">
                    <span>{formatTs(session.createdAt)}</span>
                    {duration && <span className="text-muted">· {duration}</span>}
                    <span className="text-subtle font-mono">{session.handshakeMode}</span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-subtle shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
