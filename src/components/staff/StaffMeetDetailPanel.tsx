import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation2,
  Route,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';
import type { GoGetLiveLocation, GoGetSession, GoGetSessionStatus, UserProfile, UserViolation } from '../../types';
import {
  getSessionLocationTrail,
  getLiveLocationForStaff,
  staffCancelGoGetSession,
  staffCompleteGoGetSession,
  staffDisputeGoGetSession,
  staffExpireGoGetSession,
  subscribeToGoGetSession,
  subscribeToLiveLocationChanges,
  type LocationTrailPoint,
} from '../../lib/goGetSessions';
import { getViolationsForSession, staffEscalateGoGetSession } from '../../lib/violations';
import { formatRouteDuration, formatRouteDistance } from '../../lib/mapRoute';
import { useStaffPermission } from '../../hooks/useStaffPermission';
import NoPermissionModal from './NoPermissionModal';
import StaffEscalateViolationDialog from './StaffEscalateViolationDialog';
import StaffReasonDialog from './StaffReasonDialog';

const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface TimelineEvent {
  label: string;
  time: string | null | undefined;
  icon: typeof Clock;
  color: string;
  detail?: string;
}

function buildTimeline(session: GoGetSession): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { label: 'Session created', time: session.createdAt, icon: Clock, color: 'text-muted', detail: `Mode: ${session.handshakeMode}` },
  ];

  if (session.handshakeMode === 'availability') {
    if (session.availableFrom) {
      events.push({ label: 'Availability window offered', time: session.availableFrom, icon: Clock, color: 'text-sky-400', detail: `Until ${formatTs(session.availableUntil)}` });
    }
    if (session.scheduledAt) {
      events.push({ label: 'Pickup scheduled', time: session.scheduledAt, icon: Clock, color: 'text-blue-400' });
    }
    if (session.fulfillerReadyAt) {
      events.push({ label: 'Poster confirmed ready', time: session.fulfillerReadyAt, icon: CheckCircle, color: 'text-sky-400' });
    }
  }

  if (session.startedAt) {
    events.push({ label: 'Trip started — en route', time: session.startedAt, icon: Navigation2, color: 'text-emerald-400' });
  }
  if (session.arrivedAt) {
    events.push({ label: 'Picker arrived at destination', time: session.arrivedAt, icon: MapPin, color: 'text-teal-400' });
  }
  if (session.completedAt) {
    events.push({ label: 'Pickup confirmed complete', time: session.completedAt, icon: CheckCircle, color: 'text-emerald-400' });
  }
  if (session.cancelledAt) {
    events.push({
      label: `Cancelled${session.cancelledByUserId ? '' : ''}`,
      time: session.cancelledAt,
      icon: XCircle,
      color: 'text-red-400',
      detail: session.cancelReason || undefined,
    });
  }
  if (session.status === 'disputed') {
    events.push({ label: 'Disputed — under review', time: session.updatedAt, icon: AlertTriangle, color: 'text-amber-400' });
  }
  if (session.status === 'expired') {
    events.push({ label: 'Session expired', time: session.updatedAt, icon: XCircle, color: 'text-orange-400' });
  }

  return events.sort((a, b) => {
    const ta = a.time ? new Date(a.time).getTime() : 0;
    const tb = b.time ? new Date(b.time).getTime() : 0;
    return ta - tb;
  });
}

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit',
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

const TERMINAL: GoGetSessionStatus[] = ['completed', 'cancelled', 'expired', 'disputed'];

interface StaffMeetDetailPanelProps {
  session: GoGetSession;
  actor: UserProfile;
  onViewProfile: (userId: string) => void;
  onBack: () => void;
  onSessionUpdated?: (session: GoGetSession) => void;
  onOpenViolations?: (sessionId: string) => void;
}

type ReasonAction = 'cancel' | 'expire' | 'dispute' | 'complete' | null;

export default function StaffMeetDetailPanel({
  session: initialSession,
  actor,
  onViewProfile,
  onBack,
  onSessionUpdated,
  onOpenViolations,
}: StaffMeetDetailPanelProps) {
  const [session, setSession] = useState(initialSession);
  const [trail, setTrail] = useState<LocationTrailPoint[]>([]);
  const [liveLocation, setLiveLocation] = useState<GoGetLiveLocation | null>(null);
  const [trailLoading, setTrailLoading] = useState(true);
  const [violations, setViolations] = useState<UserViolation[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const perm = useStaffPermission(actor);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trailLayerRef = useRef<L.LayerGroup | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const liveMarkerRef = useRef<L.Marker | null>(null);
  const trailPolyRef = useRef<L.Polyline | null>(null);

  const isLive = !TERMINAL.includes(session.status);

  const applySession = (next: GoGetSession) => {
    setSession(next);
    onSessionUpdated?.(next);
  };

  const loadViolations = async () => {
    const rows = await getViolationsForSession(session.id);
    setViolations(rows);
  };

  useEffect(() => {
    void loadViolations();
  }, [session.id, session.updatedAt]);

  const runAction = async (fn: () => Promise<{ ok: boolean; errorMessage?: string; session?: GoGetSession }>) => {
    if (!perm.checkModeratePost()) return;
    setBusy(true);
    setErr('');
    setMsg('');
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Something went wrong.');
      return;
    }
    if (result.session) applySession(result.session);
    await loadViolations();
  };

  const handleReasonSubmit = async (reason: string) => {
    if (!reasonAction) return;
    await runAction(async () => {
      if (reasonAction === 'cancel') return staffCancelGoGetSession(session, actor, reason);
      if (reasonAction === 'expire') return staffExpireGoGetSession(session, actor, reason);
      if (reasonAction === 'dispute') return staffDisputeGoGetSession(session, actor, reason);
      return staffCompleteGoGetSession(session, actor, reason);
    });
    setReasonAction(null);
  };

  const handleEscalate = async (params: {
    accusedUserId: string;
    accusedName: string;
    category: import('../../types').ViolationCategory;
    description: string;
    closeAction: import('../../lib/violations').StaffSessionCloseAction;
    closeReason?: string;
  }) => {
    if (!perm.checkModeratePost()) return;
    setBusy(true);
    setErr('');
    setMsg('');
    const result = await staffEscalateGoGetSession({
      actor,
      session,
      ...params,
    });
    setBusy(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not escalate this session.');
      return;
    }
    if (result.session) applySession(result.session);
    setEscalateOpen(false);
    setMsg('Session updated and violation sent to review queue.');
    await loadViolations();
  };

  // Subscribe to session updates
  useEffect(() => {
    if (!isLive) return;
    return subscribeToGoGetSession(session.id, (updated) => {
      setSession(updated);
      onSessionUpdated?.(updated);
    });
  }, [session.id, isLive, onSessionUpdated]);

  // Subscribe to live location
  useEffect(() => {
    if (!isLive) return;
    void getLiveLocationForStaff(session.id).then(setLiveLocation);
    return subscribeToLiveLocationChanges(session.id, (loc) => {
      setLiveLocation(loc);
      setTrail((prev) => {
        // Append synthetic trail point from live location if it's new enough
        const last = prev[prev.length - 1];
        if (!last || new Date(loc.updatedAt).getTime() > new Date(last.recordedAt).getTime()) {
          return [...prev, { id: `live-${loc.updatedAt}`, sessionId: session.id, lat: loc.lat, lng: loc.lng, heading: loc.heading, speedMph: loc.speedMph, etaSeconds: loc.etaSeconds, distanceMeters: loc.distanceMeters, recordedAt: loc.updatedAt }];
        }
        return prev;
      });
    });
  }, [session.id, isLive]);

  // Load trail
  useEffect(() => {
    setTrailLoading(true);
    void getSessionLocationTrail(session.id).then((pts) => {
      setTrail(pts);
      setTrailLoading(false);
    });
  }, [session.id]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: true })
      .setView([session.destinationLat, session.destinationLng], 15);
    L.tileLayer(MAP_TILE_URL, { maxZoom: 19, attribution: MAP_ATTRIBUTION }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    trailLayerRef.current = layer;

    // Destination pin
    const destIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;background:#f97316;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9], className: '',
    });
    destMarkerRef.current = L.marker([session.destinationLat, session.destinationLng], { icon: destIcon })
      .bindTooltip('Pickup destination', { permanent: false })
      .addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw trail + live pin whenever trail/liveLocation changes
  useEffect(() => {
    const map = mapRef.current;
    const layer = trailLayerRef.current;
    if (!map || !layer) return;

    // Trail polyline
    if (trail.length >= 2) {
      const coords: [number, number][] = trail.map((p) => [p.lat, p.lng]);
      if (trailPolyRef.current) {
        trailPolyRef.current.setLatLngs(coords);
      } else {
        trailPolyRef.current = L.polyline(coords, {
          color: '#22d3ee',
          weight: 4,
          opacity: 0.8,
          dashArray: isLive ? '8 4' : undefined,
        }).addTo(layer);
      }

      // Start pin (first trail point)
      const startIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:#22d3ee;border:2px solid white;border-radius:50%"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6], className: '',
      });
      L.marker([trail[0].lat, trail[0].lng], { icon: startIcon })
        .bindTooltip(`Start: ${formatTs(trail[0].recordedAt)}`)
        .addTo(layer);
    } else if (trail.length === 1) {
      const singleIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:#22d3ee;border:2px solid white;border-radius:50%"></div>`,
        iconSize: [12, 12], iconAnchor: [6, 6], className: '',
      });
      L.marker([trail[0].lat, trail[0].lng], { icon: singleIcon }).addTo(layer);
    }

    // Live pin
    if (liveLocation) {
      const liveIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#4ade80;border:2px solid white;border-radius:50%;animation:pulse 1s infinite;box-shadow:0 0 8px #4ade80"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8], className: '',
      });
      if (liveMarkerRef.current) {
        liveMarkerRef.current.setLatLng([liveLocation.lat, liveLocation.lng]);
      } else {
        liveMarkerRef.current = L.marker([liveLocation.lat, liveLocation.lng], { icon: liveIcon })
          .bindTooltip('Picker (live)')
          .addTo(map);
      }
    }

    // Fit bounds to all points
    const allCoords: [number, number][] = [
      [session.destinationLat, session.destinationLng],
      ...trail.map((p) => [p.lat, p.lng] as [number, number]),
      ...(liveLocation ? [[liveLocation.lat, liveLocation.lng] as [number, number]] : []),
    ];
    if (allCoords.length > 1) {
      map.fitBounds(L.latLngBounds(allCoords).pad(0.2), { animate: true, maxZoom: 16 });
    }
  }, [trail, liveLocation]);

  const timeline = buildTimeline(session);
  const totalDuration = session.startedAt && (session.completedAt || !TERMINAL.includes(session.status))
    ? elapsed(session.startedAt, session.completedAt ?? undefined)
    : null;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <NoPermissionModal open={perm.noPermOpen} reason={perm.noPermReason} onClose={perm.closeNoPerm} />
      <StaffReasonDialog
        open={reasonAction === 'cancel'}
        title="Cancel Go Get session"
        description="This ends the pickup for both neighbors and posts a staff note in their chat."
        confirmLabel="Cancel session"
        onClose={() => setReasonAction(null)}
        onSubmit={handleReasonSubmit}
      />
      <StaffReasonDialog
        open={reasonAction === 'expire'}
        title="Expire Go Get session"
        description="Use when a session is stale or abandoned without a normal handoff."
        confirmLabel="Expire session"
        onClose={() => setReasonAction(null)}
        onSubmit={handleReasonSubmit}
      />
      <StaffReasonDialog
        open={reasonAction === 'dispute'}
        title="Mark session disputed"
        description="Flag a handoff disagreement so it stays visible for review."
        confirmLabel="Mark disputed"
        onClose={() => setReasonAction(null)}
        onSubmit={handleReasonSubmit}
      />
      <StaffReasonDialog
        open={reasonAction === 'complete'}
        title="Mark session complete"
        description="Use when the picker arrived and staff can confirm the handoff is done."
        confirmLabel="Mark complete"
        placeholder="Optional note for the chat…"
        requireReason={false}
        onClose={() => setReasonAction(null)}
        onSubmit={handleReasonSubmit}
      />
      <StaffEscalateViolationDialog
        open={escalateOpen}
        session={session}
        onClose={() => setEscalateOpen(false)}
        onSubmit={handleEscalate}
      />

      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-app shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={onBack} className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-app text-base truncate">
                {session.requesterName} → {session.fulfillerName}
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-muted truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              {session.destinationLabel}
            </p>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
          <span>Started: <strong className="text-app">{formatTs(session.startedAt || session.createdAt)}</strong></span>
          {totalDuration && <span>Duration: <strong className="text-app">{totalDuration}</strong></span>}
          {session.arrivedAt && <span>Arrived: <strong className="text-app">{formatTs(session.arrivedAt)}</strong></span>}
          {liveLocation?.distanceMeters != null && (
            <span className="text-emerald-400">
              Live: {formatRouteDistance(liveLocation.distanceMeters)} away
              {liveLocation.etaSeconds != null && ` · ${formatRouteDuration(liveLocation.etaSeconds)} ETA`}
            </span>
          )}
          <span className="font-mono text-subtle">{session.id}</span>
        </div>

        {(msg || err) && (
          <div className="mt-2 space-y-1">
            {msg && <p className="text-xs font-semibold text-emerald-400">{msg}</p>}
            {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* ── Staff management ───────────────────────────────── */}
        <div className="border-b border-app px-4 py-3 space-y-3 bg-inset/40">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff actions</p>
            {busy && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
          </div>

          <div className="flex flex-wrap gap-2">
            {isLive && (
              <>
                <button type="button" disabled={busy} onClick={() => setReasonAction('cancel')} className="sbn-btn sbn-btn-sm bg-red-500/10 text-red-400 border border-red-500/20">
                  Cancel session
                </button>
                <button type="button" disabled={busy} onClick={() => setReasonAction('expire')} className="sbn-btn sbn-btn-sm sbn-btn-secondary">
                  Expire session
                </button>
                {['active', 'arrived'].includes(session.status) && (
                  <button type="button" disabled={busy} onClick={() => setReasonAction('dispute')} className="sbn-btn sbn-btn-sm bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Mark disputed
                  </button>
                )}
              </>
            )}
            {session.status === 'arrived' && (
              <button type="button" disabled={busy} onClick={() => setReasonAction('complete')} className="sbn-btn sbn-btn-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Mark complete
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!perm.checkModeratePost()) return;
                setEscalateOpen(true);
              }}
              className="sbn-btn sbn-btn-sm sbn-btn-primary"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Escalate to violation
            </button>
          </div>

          <p className="text-[10px] text-muted leading-snug">
            Use <strong className="text-app font-semibold">Escalate to violation</strong> when a pickup did not complete properly.
            Staff can close the session and file a report in one step. Confirmed violations count toward the 6-strike lockout.
          </p>

          {violations.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">
                Linked violations ({violations.length})
              </p>
              <ul className="space-y-1.5">
                {violations.map((v) => (
                  <li key={v.id} className="rounded-xl border border-app bg-surface px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-app capitalize">{v.category.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted">{v.status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-muted mt-1 line-clamp-2">{v.description}</p>
                  </li>
                ))}
              </ul>
              {onOpenViolations && (
                <button type="button" onClick={() => onOpenViolations?.(session.id)} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
                  Open Go Get Violations
                </button>
              )}
            </div>
          )}
        </div>
        {/* ── Trail Map ────────────────────────────────────────── */}
        <div className="border-b border-app">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <Route className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-app uppercase tracking-wider">GPS Trail</span>
            <span className="text-[10px] text-muted ml-auto">
              {trailLoading ? 'Loading…' : `${trail.length} point${trail.length !== 1 ? 's' : ''} recorded`}
            </span>
          </div>
          <div ref={mapContainerRef} className="w-full" style={{ height: 260 }} />
          {trail.length === 0 && !trailLoading && !isLive && (
            <p className="text-xs text-muted px-4 pb-3">
              No trail recorded — this session started before trail recording was enabled.
            </p>
          )}
          {trail.length === 0 && !trailLoading && isLive && (
            <p className="text-xs text-muted px-4 pb-3">
              Trail recording is active. Points appear as the picker moves.
            </p>
          )}
        </div>

        {/* ── Participants ────────────────────────────────────── */}
        <div className="border-b border-app px-4 py-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">Participants</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onViewProfile(session.requesterUserId)}
              className="flex items-center gap-2 p-3 rounded-xl bg-inset border border-app hover:border-accent/40 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                <Navigation2 className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-app truncate">{session.requesterName}</p>
                <p className="text-[10px] text-muted">Picker (navigator)</p>
              </div>
              <ExternalLink className="w-3 h-3 text-subtle ml-auto shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => onViewProfile(session.fulfillerUserId)}
              className="flex items-center gap-2 p-3 rounded-xl bg-inset border border-app hover:border-accent/40 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-app truncate">{session.fulfillerName}</p>
                <p className="text-[10px] text-muted">Poster (destination)</p>
              </div>
              <ExternalLink className="w-3 h-3 text-subtle ml-auto shrink-0" />
            </button>
          </div>
        </div>

        {/* ── Full Timestamped Timeline ───────────────────────── */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono mb-3">Full Timeline</p>
          <ol className="relative border-l border-app space-y-0">
            {timeline.map((event, i) => {
              const Icon = event.icon;
              const isLast = i === timeline.length - 1;
              return (
                <li key={i} className={`ml-4 ${isLast ? 'pb-0' : 'pb-4'}`}>
                  <span className={`absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-app flex items-center justify-center ${event.time ? 'bg-surface' : 'bg-inset'}`}>
                    <Icon className={`w-2 h-2 ${event.color}`} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-semibold ${event.time ? 'text-app' : 'text-subtle'}`}>{event.label}</p>
                      {event.time ? (
                        <time className="text-[10px] text-muted font-mono shrink-0">{formatTs(event.time)}</time>
                      ) : (
                        <span className="text-[10px] text-subtle">—</span>
                      )}
                    </div>
                    {event.detail && (
                      <p className="text-[10px] text-subtle mt-0.5 leading-snug">{event.detail}</p>
                    )}
                  </div>
                </li>
              );
            })}

            {/* Pending events for live sessions */}
            {isLive && !session.arrivedAt && (
              <li className="ml-4 pb-4 opacity-40">
                <span className="absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-dashed border-app bg-inset" />
                <p className="text-xs text-subtle">Arrival (pending)</p>
              </li>
            )}
            {isLive && !session.completedAt && (
              <li className="ml-4 opacity-40">
                <span className="absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-dashed border-app bg-inset" />
                <p className="text-xs text-subtle">Completion (pending)</p>
              </li>
            )}
          </ol>
        </div>

        {/* ── Trail detail table ──────────────────────────────── */}
        {trail.length > 0 && (
          <div className="border-t border-app px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono mb-2">
              Location trail ({trail.length} points)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse min-w-[360px]">
                <thead>
                  <tr className="border-b border-app text-left text-muted">
                    <th className="py-1.5 px-2 font-semibold">#</th>
                    <th className="py-1.5 px-2 font-semibold">Time</th>
                    <th className="py-1.5 px-2 font-semibold">Lat / Lng</th>
                    <th className="py-1.5 px-2 font-semibold">Speed</th>
                    <th className="py-1.5 px-2 font-semibold">ETA</th>
                    <th className="py-1.5 px-2 font-semibold">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {trail.map((pt, i) => (
                    <tr key={pt.id} className="border-b border-app/30 hover:bg-inset">
                      <td className="py-1 px-2 text-subtle font-mono">{i + 1}</td>
                      <td className="py-1 px-2 font-mono text-app">{new Date(pt.recordedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                      <td className="py-1 px-2 font-mono text-muted">{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</td>
                      <td className="py-1 px-2 text-muted">{pt.speedMph != null ? `${pt.speedMph.toFixed(1)} mph` : '—'}</td>
                      <td className="py-1 px-2 text-muted">{pt.etaSeconds != null ? formatRouteDuration(pt.etaSeconds) : '—'}</td>
                      <td className="py-1 px-2 text-muted">{pt.distanceMeters != null ? formatRouteDistance(pt.distanceMeters) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
