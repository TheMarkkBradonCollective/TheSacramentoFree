import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'motion/react';
import L from 'leaflet';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronUp,
  Compass,
  CornerUpLeft,
  CornerUpRight,
  Layers,
  LocateFixed,
  Map as MapIcon,
  Mic,
  Navigation,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import type { LatLng } from '../lib/mapRoute';
import { haversineMeters, openDrivingDirections } from '../lib/mapRoute';
import { projectOntoRoute, splitRouteProgress, snapPositionToRoute } from '../lib/navMapGeometry';
import NavManeuverShield from './navigation/NavManeuverShield';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { touchActiveNavSession } from '../lib/navigationSession';
import { useTheme } from '../theme/ThemeContext';
import {
  activeLaneIndices,
  bearingAlongRoute,
  bearingDegrees,
  estimateLaneCount,
  estimateSpeedLimitMph,
  fetchNavigationRoute,
  findCurrentStepIndex,
  formatArrivalTime,
  formatNavDistance,
  formatNavDuration,
  formatSpeedMph,
  getActiveVoiceCueStep,
  maneuverIconKind,
  remainingRouteMeters,
  shouldFireVoiceCue,
  shouldShowLaneGuidance,
  smoothHeadingDegrees,
  type ManeuverIconKind,
  type NavigationRouteResult,
  type NavigationStep,
} from '../lib/navigationRoute';
import {
  buildRouteSummaryVoice,
  buildStepVoiceCue,
  NavigationVoice,
  VOICE_CUE_THRESHOLDS,
} from '../lib/navigationVoice';
import { measureMapFitPadding } from '../lib/mapRouteFitPadding';

export interface NavProgressUpdate {
  lat: number;
  lng: number;
  heading: number;
  speedMph: number | null;
  etaSeconds: number;
  distanceMeters: number;
  arrived: boolean;
}

interface MapNavigationViewProps {
  origin: LatLng;
  destination: LatLng;
  destinationLabel: string;
  initialRoute?: NavigationRouteResult | null;
  onExit: () => void;
  /** Fired on each UI tick (~1/sec) while navigating — e.g. to share live position for a Go Get session. */
  onProgressUpdate?: (update: NavProgressUpdate) => void;
  /** Optional live location of the other party (e.g. poster sharing during Go Get meetup). */
  otherPartyLocation?: LatLng | null;
  otherPartyLabel?: string;
  /** Optional spoken phrase when guidance begins (e.g. Go Get: meet neighbor + item). */
  navigationStartMessage?: string;
  /** Extra phrases spoken after the start message (e.g. pickup instructions). */
  navigationFollowUpMessages?: string[];
}

type NavLoadingStage = 'locating' | 'routing' | 'ready';

const NAV_BRAND = '#FF4500';
const NAV_BRAND_LIGHT = '#FF6B2E';
const NAV_ROUTE_GLOW = 'rgba(255, 69, 0, 0.42)';

type NavMapStyle = 'dark' | 'light' | 'standard';

const NAV_TILE_URLS: Record<NavMapStyle, string> = {
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png',
  standard: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};

function VoiceStatusBar({ phrase, visible }: { phrase: string; visible: boolean }) {
  if (!visible || !phrase) return null;
  return (
    <motion.div
      className="sbn-nav-voice-bar sbn-nav-glass pointer-events-none"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Mic className="w-4 h-4 text-accent shrink-0" />
      <div className="sbn-nav-voice-waves shrink-0" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="text-xs font-semibold truncate text-[var(--sbn-nav-text)]">{phrase}</p>
    </motion.div>
  );
}

function laneArrowForKind(kind: ManeuverIconKind): string {
  switch (kind) {
    case 'left':
    case 'slight-left':
    case 'uturn':
      return '↰';
    case 'right':
    case 'slight-right':
    case 'roundabout':
      return '↱';
    default:
      return '↑';
  }
}

function NavLaneGuidance({ laneCount, maneuverKind }: { laneCount: number; maneuverKind: ManeuverIconKind }) {
  if (laneCount < 2 || !shouldShowLaneGuidance(maneuverKind)) return null;

  const active = new Set(activeLaneIndices(laneCount, maneuverKind));
  const arrow = laneArrowForKind(maneuverKind);

  return (
    <div className="sbn-nav-lane" aria-label={`Use lane ${[...active].map((i) => i + 1).join(' or ')}`}>
      {Array.from({ length: laneCount }, (_, index) => (
        <div
          key={index}
          className={`sbn-nav-lane-slot text-sm font-black ${active.has(index) ? 'sbn-nav-lane-slot-active' : ''}`}
          aria-hidden={!active.has(index)}
        >
          {active.has(index) ? arrow : ''}
        </div>
      ))}
    </div>
  );
}

function NavSpeedCard({
  currentMph,
  limitMph,
  compact = false,
}: {
  currentMph: string | null;
  limitMph: number;
  compact?: boolean;
}) {
  const current = currentMph != null ? Number.parseInt(currentMph, 10) : null;
  const speedClass =
    current == null || Number.isNaN(current)
      ? 'sbn-nav-speed-current--ok'
      : current > limitMph + 5
        ? 'sbn-nav-speed-current--over'
        : current > limitMph
          ? 'sbn-nav-speed-current--warn'
          : 'sbn-nav-speed-current--ok';

  return (
    <div
      className={`sbn-nav-speed-card sbn-nav-glass pointer-events-auto ${compact ? 'sbn-nav-speed-card-compact' : ''}`}
      aria-label={
        currentMph
          ? `Speed limit ${limitMph} miles per hour, current speed ${currentMph}`
          : `Speed limit ${limitMph} miles per hour`
      }
    >
      <div className="sbn-nav-speed-limit">
        {!compact && <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--sbn-nav-text-secondary)]">Limit</p>}
        <p className={`font-black tabular-nums leading-none text-[var(--sbn-nav-text)] ${compact ? 'text-sm' : 'text-lg'}`}>{limitMph}</p>
      </div>
      <div className={`sbn-nav-speed-current ${speedClass}`}>
        {!compact && <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Now</p>}
        <p className={`font-black tabular-nums leading-none ${compact ? 'text-base' : 'text-xl'}`}>{currentMph ?? '—'}</p>
      </div>
    </div>
  );
}

function NavLoadingOverlay({ stage, destinationLabel }: { stage: NavLoadingStage; destinationLabel: string }) {
  const label =
    stage === 'locating' ? 'Acquiring GPS signal…' : stage === 'routing' ? 'Calculating best route…' : 'Starting guidance…';

  return (
    <div className="sbn-nav-loading-overlay pointer-events-none">
      <div className="sbn-nav-loading-card sbn-nav-glass">
        <div className="sbn-nav-loading-ring" aria-hidden />
        <Navigation className="w-8 h-8 text-accent" />
        <p className="text-sm font-bold text-[var(--sbn-nav-text)] mt-4">{label}</p>
        <p className="text-xs text-[var(--sbn-nav-text-secondary)] mt-1 truncate max-w-[16rem]">To {destinationLabel}</p>
        <div className="sbn-nav-loading-steps" aria-hidden>
          <span className={stage === 'locating' ? 'active' : 'done'} />
          <span className={stage === 'routing' ? 'active' : stage === 'ready' ? 'done' : ''} />
          <span className={stage === 'ready' ? 'active' : ''} />
        </div>
      </div>
    </div>
  );
}

type NavSheetSnap = 'collapsed' | 'expanded';

const SHEET_DRAG_THRESHOLD_PX = 44;

interface NavigationDetailsSheetProps {
  snap: NavSheetSnap;
  onSnapChange: (snap: NavSheetSnap) => void;
  arrived: boolean;
  destinationLabel: string;
  remainingSeconds: number;
  remainingMeters: number;
  gpsAccuracy: number | null;
  route: NavigationRouteResult;
  stepIndex: number;
  voiceOn: boolean;
  onVoiceToggle: () => void;
  onOverview: () => void;
  onShare: () => void;
  onRecenter: () => void;
  onExit: () => void;
}

function NavigationDetailsSheet({
  snap,
  onSnapChange,
  arrived,
  destinationLabel,
  remainingSeconds,
  remainingMeters,
  gpsAccuracy,
  route,
  stepIndex,
  voiceOn,
  onVoiceToggle,
  onOverview,
  onShare,
  onRecenter,
  onExit,
}: NavigationDetailsSheetProps) {
  const dragStartYRef = useRef(0);
  const expanded = snap === 'expanded';

  const handleSheetPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSheetPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);

    const deltaY = dragStartYRef.current - event.clientY;
    if (deltaY > SHEET_DRAG_THRESHOLD_PX) {
      onSnapChange('expanded');
      return;
    }
    if (deltaY < -SHEET_DRAG_THRESHOLD_PX) {
      onSnapChange('collapsed');
      return;
    }

    onSnapChange(expanded ? 'collapsed' : 'expanded');
  };

  return (
    <motion.div
      id="nav_details_sheet"
      className={`sbn-nav-sheet relative z-30 flex flex-col w-full safe-area-pb ${
        expanded ? 'max-h-[72vh]' : ''
      }`}
      initial={false}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse route details' : 'Expand route details'}
        className="shrink-0 pt-3 pb-1 px-4 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={handleSheetPointerDown}
        onPointerUp={handleSheetPointerUp}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSnapChange(expanded ? 'collapsed' : 'expanded');
          }
        }}
      >
        <div className="sbn-nav-sheet-handle" />
      </div>

      <div className="shrink-0 px-4 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSnapChange(expanded ? 'collapsed' : 'expanded')}
            className="sbn-nav-sheet-expand shrink-0"
            aria-label={expanded ? 'Collapse route details' : 'Expand route details'}
          >
            <ChevronUp className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex-1 min-h-0 text-center">
            <p className="text-[2rem] font-black text-accent leading-none tabular-nums font-display">
              {arrived ? '0 min' : formatNavDuration(remainingSeconds)}
            </p>
            <p className="text-sm font-medium mt-1 tabular-nums text-[var(--sbn-nav-text-secondary)]">
              {formatNavDistance(remainingMeters)} · {formatArrivalTime(remainingSeconds)}
            </p>
            <p className="text-[11px] truncate mt-0.5 text-[var(--sbn-nav-text-secondary)]">
              {arrived ? `Arrived · ${destinationLabel}` : destinationLabel}
            </p>
            {gpsAccuracy != null && gpsAccuracy > 35 && !arrived && (
              <p className="text-[10px] text-[var(--sbn-nav-warning)] mt-1">GPS weak — ±{Math.round(gpsAccuracy)}m</p>
            )}
          </div>

          <button type="button" onClick={onExit} className="sbn-nav-exit-btn shrink-0">
            {arrived ? 'Done' : 'Exit'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-[var(--sbn-nav-glass-border)] px-4 pb-4">
          <div className="flex items-center justify-center gap-2 py-3">
            <button type="button" onClick={onOverview} className="sbn-nav-sheet-action" aria-label="Route overview" title="Overview">
              <MapIcon className="w-4 h-4" />
            </button>
            <button type="button" onClick={onVoiceToggle} className="sbn-nav-sheet-action" aria-label={voiceOn ? 'Mute voice' : 'Enable voice'} title={voiceOn ? 'Mute' : 'Voice on'}>
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button type="button" onClick={onRecenter} className="sbn-nav-sheet-action" aria-label="Recenter" title="Recenter">
              <LocateFixed className="w-4 h-4" />
            </button>
            <button type="button" onClick={onShare} className="sbn-nav-sheet-action" aria-label="Share trip" title="Share trip">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <div className="py-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--sbn-nav-text-secondary)]">Trip summary</h3>
            <p className="text-sm mt-1 text-[var(--sbn-nav-text-secondary)]">
              {formatNavDistance(route.distanceMeters)} total · {formatNavDuration(route.durationSeconds)} drive
            </p>
            <p className="text-sm font-semibold mt-0.5 truncate text-[var(--sbn-nav-text)]">{destinationLabel}</p>
          </div>

          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--sbn-nav-text-secondary)] pb-2 sticky top-0 bg-[var(--sbn-nav-card)]">
            Turn-by-turn
          </h3>
          <ol className="space-y-1">
            {route.steps.map((step, index) => {
              const isCurrent = !arrived && index === stepIndex;
              const isPast = !arrived && index < stepIndex;
              const kind = maneuverIconKind(step);

              return (
                <li
                  key={step.id}
                  className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${
                    isCurrent ? 'sbn-nav-step-current' : isPast ? 'opacity-50' : ''
                  }`}
                >
                  <div
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                      isCurrent ? 'bg-accent text-on-accent' : 'bg-[var(--sbn-nav-surface)] text-[var(--sbn-nav-text)]'
                    }`}
                  >
                    <ManeuverIcon kind={kind} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${isCurrent ? 'font-bold text-[var(--sbn-nav-text)]' : 'font-medium text-[var(--sbn-nav-text-secondary)]'}`}>
                      {step.instruction}
                    </p>
                    {step.name ? (
                      <p className="text-xs truncate mt-0.5 text-[var(--sbn-nav-text-secondary)]">{step.name}</p>
                    ) : null}
                    {step.distanceMeters > 0 && index < route.steps.length - 1 ? (
                      <p className="text-[11px] mt-1 text-[var(--sbn-nav-text-secondary)] opacity-70">{formatNavDistance(step.distanceMeters)}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </motion.div>
  );
}

function ManeuverIcon({ kind, className = 'w-10 h-10' }: { kind: ManeuverIconKind; className?: string }) {
  switch (kind) {
    case 'left':
      return <ArrowLeft className={className} strokeWidth={2.5} />;
    case 'right':
      return <ArrowRight className={className} strokeWidth={2.5} />;
    case 'slight-left':
      return <CornerUpLeft className={className} strokeWidth={2.5} />;
    case 'slight-right':
      return <CornerUpRight className={className} strokeWidth={2.5} />;
    case 'uturn':
    case 'roundabout':
      return <RotateCcw className={className} strokeWidth={2.5} />;
    case 'arrive':
      return <Navigation className={className} strokeWidth={2.5} />;
    default:
      return <ArrowUp className={className} strokeWidth={2.5} />;
  }
}

const NAV_LOOKAHEAD_SCREEN_RATIO = 0.22;

function createNavUserIcon(heading: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="sbn-nav-user-puck" style="transform: rotate(${heading}deg)"><span class="sbn-nav-user-puck-glow"></span><span class="sbn-nav-user-puck-core"></span><span class="sbn-nav-user-puck-arrow"></span></div>`,
    className: 'nav-user-marker',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });
}

type RoutePolylineHandles = {
  traveled: L.Polyline | null;
  glow: L.Polyline | null;
  mid: L.Polyline | null;
  animated: L.Polyline | null;
};

function emptyRouteHandles(): RoutePolylineHandles {
  return { traveled: null, glow: null, mid: null, animated: null };
}

function upsertRoutePolyline(
  layer: L.LayerGroup,
  handles: RoutePolylineHandles,
  key: keyof RoutePolylineHandles,
  latlngs: [number, number][],
  style: L.PolylineOptions,
): void {
  if (latlngs.length < 2) {
    if (handles[key]) {
      layer.removeLayer(handles[key]!);
      handles[key] = null;
    }
    return;
  }

  if (handles[key]) {
    handles[key]!.setLatLngs(latlngs);
    return;
  }

  handles[key] = L.polyline(latlngs, style).addTo(layer);
}

/** Update route geometry in place so dash animations and tiles are not restarted every GPS tick. */
function updateRoutePolylines(
  layer: L.LayerGroup,
  handles: RoutePolylineHandles,
  traveled: [number, number][],
  remaining: [number, number][],
): void {
  upsertRoutePolyline(layer, handles, 'traveled', traveled, {
    color: 'rgba(148, 163, 184, 0.55)',
    weight: 8,
    opacity: 0.85,
    lineCap: 'round',
    lineJoin: 'round',
  });

  upsertRoutePolyline(layer, handles, 'glow', remaining, {
    className: 'sbn-nav-route-glow',
    color: NAV_ROUTE_GLOW,
    weight: 15,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
  });
  upsertRoutePolyline(layer, handles, 'mid', remaining, {
    color: NAV_BRAND_LIGHT,
    weight: 9,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
  });
  upsertRoutePolyline(layer, handles, 'animated', remaining, {
    className: 'sbn-nav-route-animated',
    color: NAV_BRAND,
    weight: 5,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
  });
}

function debounceMapInvalidate(map: L.Map, delayMs = 160): () => void {
  let timer: number | null = null;
  return () => {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      if (!map.getContainer()?.isConnected) return;
      map.invalidateSize({ animate: false, pan: false });
    }, delayMs);
  };
}

function centerMapWithLookahead(map: L.Map, center: LatLng, zoom: number): void {
  if (!map.getContainer()?.isConnected) return;

  const mapSize = map.getSize();
  if (mapSize.x <= 0 || mapSize.y <= 0) {
    map.setView([center.lat, center.lng], zoom, { animate: false });
    return;
  }

  try {
    const lookaheadPx = Math.round(mapSize.y * NAV_LOOKAHEAD_SCREEN_RATIO);
    const targetPoint = map.project([center.lat, center.lng], zoom);
    // Shifting the *center* up (negative y) moves the user's own position DOWN on
    // screen, which is what reveals more map area ahead of them — this was
    // previously shifted the other way, pushing the user toward the top of the
    // screen and leaving the actual route/destination rendered mostly off-screen.
    const shiftedCenter = map.unproject(L.point(targetPoint.x, targetPoint.y - lookaheadPx), zoom);

    if (map.getZoom() !== zoom) {
      map.setView(shiftedCenter, zoom, { animate: false });
      return;
    }

    map.panTo(shiftedCenter, { animate: false, noMoveStart: true });
  } catch (error) {
    console.warn('Could not apply navigation lookahead:', error);
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }
}

function resetMapBearing(map: L.Map | null): void {
  const pane = map?.getPane('mapPane');
  if (!pane) return;
  pane.style.transform = '';
  pane.style.transformOrigin = '';
}

function applyMapBearing(map: L.Map, center: LatLng, heading: number, northUp: boolean): void {
  const pane = map.getPane('mapPane');
  if (!pane) return;

  if (northUp) {
    resetMapBearing(map);
    return;
  }

  try {
    const point = map.latLngToContainerPoint([center.lat, center.lng]);
    pane.style.transformOrigin = `${point.x}px ${point.y}px`;
    pane.style.transform = `rotate(${-heading}deg)`;
  } catch (error) {
    console.warn('Could not rotate navigation map:', error);
    resetMapBearing(map);
  }
}

export default function MapNavigationView({
  origin,
  destination,
  destinationLabel,
  initialRoute = null,
  onExit,
  onProgressUpdate,
  otherPartyLocation = null,
  otherPartyLabel = 'Other party',
  navigationStartMessage,
  navigationFollowUpMessages,
}: MapNavigationViewProps) {
  const { theme } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const otherPartyMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stepIndexRef = useRef(0);
  const voiceRef = useRef(new NavigationVoice());
  const voiceOnRef = useRef(true);
  const routeRef = useRef<NavigationRouteResult | null>(null);
  const destinationRef = useRef(destination);
  const destinationLabelRef = useRef(destinationLabel);
  const offRouteTicksRef = useRef(0);
  const offRouteEvalAtRef = useRef(0);
  const reroutingRef = useRef(false);
  const arrivedRef = useRef(false);
  const routeAnnouncedRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const followUserRef = useRef(true);
  const userPosRef = useRef<LatLng>(origin);
  const logicPosRef = useRef<LatLng>(origin);
  const headingRef = useRef(0);
  const lastMarkerHeadingRef = useRef(0);
  const lastNavPanRef = useRef<LatLng | null>(null);
  const navPanRafRef = useRef<number | null>(null);
  const pendingNavPanRef = useRef<LatLng | null>(null);
  const hasFittedRouteRef = useRef(false);
  const routeOverviewLockedRef = useRef(false);
  const isProgrammaticMapMoveRef = useRef(false);
  const uiTickRef = useRef(0);
  const mapSyncTickRef = useRef(0);
  const lastGpsPosRef = useRef<LatLng | null>(null);
  const displayedPosRef = useRef<LatLng | null>(null);
  const routePolylineHandlesRef = useRef<RoutePolylineHandles>(emptyRouteHandles());
  const lastRouteDrawRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const routeFetchedForDestRef = useRef<string | null>(null);
  const routeRequestIdRef = useRef(0);
  const lastBearingApplyRef = useRef(0);
  const hasFreshGpsRef = useRef(false);
  const handleGpsUpdateRef = useRef<(position: GeolocationPosition) => void>(() => undefined);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const NAV_GPS_FOLLOW_METERS = 28;
  const NAV_UI_TICK_MS = 900;
  const NAV_MAP_SYNC_MS = 450;
  const NAV_ROUTE_DRAW_MIN_METERS = 14;
  const NAV_ROUTE_DRAW_MIN_MS = 1400;
  const NAV_HEADING_ICON_DEG = 12;
  const NAV_DISPLAY_SMOOTH_ALPHA = 0.38;
  const NAV_OFF_ROUTE_THRESHOLD_M = 55;
  const NAV_OFF_ROUTE_EVAL_MS = 900;
  const NAV_OFF_ROUTE_TICKS = 4;
  const NAV_ARRIVE_DEST_M = 40;
  const NAV_ARRIVE_REMAINING_M = 40;
  const NAV_STALE_GPS_MS = 5000;
  const NAV_INITIAL_ROUTE_FRESH_M = 50;

  const [loading, setLoading] = useState(!initialRoute);
  const [loadingStage, setLoadingStage] = useState<NavLoadingStage>(initialRoute ? 'ready' : 'locating');
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<NavigationRouteResult | null>(initialRoute);
  const [userPos, setUserPos] = useState<LatLng>(origin);
  const [heading, setHeading] = useState(0);
  const [speedMph, setSpeedMph] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  followUserRef.current = followUser;
  const [northUp, setNorthUp] = useState(false);
  const northUpRef = useRef(false);
  northUpRef.current = northUp;
  const [voiceOn, setVoiceOn] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [sheetSnap, setSheetSnap] = useState<NavSheetSnap>('collapsed');
  const [mapStyle, setMapStyle] = useState<NavMapStyle>(() => (theme === 'light' ? 'light' : 'dark'));
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voicePhrase, setVoicePhrase] = useState('');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [offRouteMeters, setOffRouteMeters] = useState(0);

  destinationRef.current = destination;
  destinationLabelRef.current = destinationLabel;
  routeRef.current = route;
  voiceOnRef.current = voiceOn;

  const [showHeading, setShowHeading] = useState(false);

  // Landscape phones (and any short window) leave very little vertical room between
  // the instruction banner and the details sheet. Below this threshold we switch to a
  // more compact banner and lay the floating controls out as a row instead of a
  // column so nothing gets clipped by or overlaps the sheet.
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== 'undefined' && window.innerHeight <= 500,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setIsCompact(window.innerHeight <= 500);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const initialOriginRef = useRef(origin);
  const initialRouteRef = useRef(initialRoute);
  const mapBootstrappedRef = useRef(false);

  useEffect(() => {
    initialRouteRef.current = initialRoute;
    if (!initialRoute || route) return;
    setRoute(initialRoute);
    setLoading(false);
    setLoadingStage('ready');
    routeAnnouncedRef.current = false;
  }, [initialRoute, route]);

  const currentStep: NavigationStep | undefined = route?.steps[stepIndex];

  const remainingMeters = useMemo(() => {
    if (!route) return 0;
    return remainingRouteMeters(route.coords, logicPosRef.current);
  }, [route, userPos, stepIndex, arrived]);

  const remainingSeconds = useMemo(() => {
    if (!route || route.distanceMeters <= 0 || arrived) return 0;
    const ratio = Math.min(1, remainingMeters / route.distanceMeters);
    return Math.max(0, Math.round(route.durationSeconds * ratio));
  }, [route, remainingMeters, arrived]);

  const distanceToManeuver = useMemo(() => {
    if (!route) return 0;
    const cueStep = getActiveVoiceCueStep(route.steps, stepIndex);
    if (!cueStep) return 0;
    return haversineMeters(logicPosRef.current, cueStep.location);
  }, [route, stepIndex, userPos]);

  const bannerScale = useMemo(() => {
    if (arrived) return 1;
    if (distanceToManeuver < 80) return 1.05;
    if (distanceToManeuver < 250) return 1.025;
    return 1;
  }, [distanceToManeuver, arrived]);

  const loadRoute = useCallback(async (from: LatLng, to: LatLng, isReroute = false) => {
    const requestId = ++routeRequestIdRef.current;
    const result = await fetchNavigationRoute(from, to);
    if (requestId !== routeRequestIdRef.current) return null;

    if (!result) {
      if (isReroute) {
        voiceRef.current.speak(
          'Unable to recalculate route. Continue toward your destination.',
          `reroute-fail-${requestId}`,
        );
      }
      return null;
    }

    setRoute(result);
    stepIndexRef.current = 0;
    setStepIndex(0);
    offRouteTicksRef.current = 0;
    lastRouteDrawRef.current = null;
    hasFittedRouteRef.current = false;

    if (isReroute) {
      voiceRef.current.clearSpokenKeys();
      voiceRef.current.speak('Route updated', `reroute-done-${requestId}`);
    }

    return result;
  }, []);

  const fitRouteOverview = useCallback((options?: { force?: boolean }) => {
    const map = mapRef.current;
    const mapEl = mapContainerRef.current;
    const activeRoute = routeRef.current;
    if (!map || !mapEl || !activeRoute?.coords || activeRoute.coords.length < 2) return;
    if (!options?.force && routeOverviewLockedRef.current) return;
    if (!options?.force && followUserRef.current) return;

    const sheet = document.getElementById('nav_details_sheet');
    const banner = document.getElementById('nav_instruction_banner');
    const padding = measureMapFitPadding({
      mapElement: mapEl,
      obstructingElements: [sheet, banner],
      defaults: { top: 112, bottom: 136, left: 48, right: 56 },
      margin: 20,
    });

    isProgrammaticMapMoveRef.current = true;
    map.fitBounds(activeRoute.coords, {
      paddingTopLeft: padding.topLeft,
      paddingBottomRight: padding.bottomRight,
      maxZoom: 15,
      animate: false,
    });
    window.requestAnimationFrame(() => {
      isProgrammaticMapMoveRef.current = false;
    });
  }, []);

  useEffect(() => {
    voiceRef.current.prime();
    voiceRef.current.setEnabled(true);

    const unsubscribeSpeaking = voiceRef.current.subscribeSpeaking((speaking, phrase) => {
      setVoiceSpeaking(speaking);
      setVoicePhrase(phrase);
    });

    const attachWakeLockRelease = (sentinel: WakeLockSentinel) => {
      sentinel.addEventListener('release', () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
        }
      });
    };

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const sentinel = await navigator.wakeLock.request('screen');
          wakeLockRef.current = sentinel;
          attachWakeLockRelease(sentinel);
        }
      } catch {
        // Wake lock may be denied; navigation still works.
      }
    };
    void requestWakeLock();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Always re-request — OS may have released the lock without clearing our ref.
        void requestWakeLock();
        touchActiveNavSession();
      }
    };
    const onPageHide = () => {
      touchActiveNavSession();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      unsubscribeSpeaking();
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
      voiceRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    const destKey = `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
    if (routeFetchedForDestRef.current === destKey && routeRef.current) {
      setLoading(false);
      setLoadingStage('ready');
      return;
    }
    routeFetchedForDestRef.current = destKey;

    let cancelled = false;
    setError(null);
    routeAnnouncedRef.current = false;
    arrivedRef.current = false;
    setArrived(false);

    const from = userPosRef.current;
    const prefetch = initialRouteRef.current;
    const prefetchOrigin = prefetch?.coords?.[0];
    const prefetchStillFresh =
      !!prefetch &&
      !!prefetchOrigin &&
      haversineMeters(from, { lat: prefetchOrigin[0], lng: prefetchOrigin[1] }) <= NAV_INITIAL_ROUTE_FRESH_M;

    // Use a fresh prefetch as a fast placeholder, but always refetch from the
    // current GPS fix so session restore / backgrounding don't keep a stale path.
    if (prefetchStillFresh) {
      setRoute(prefetch);
      setLoading(false);
      setLoadingStage('ready');
    } else {
      setLoading(true);
      setLoadingStage('locating');
    }

    const locateTimer = window.setTimeout(() => {
      if (!cancelled && !prefetchStillFresh) setLoadingStage('routing');
    }, 450);

    void loadRoute(from, destination, false).then((result) => {
      if (cancelled) return;
      window.clearTimeout(locateTimer);
      if (!result) {
        if (prefetchStillFresh && routeRef.current) {
          setLoading(false);
          setLoadingStage('ready');
          return;
        }
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        setError(
          offline
            ? 'You appear to be offline. Check your connection and try again.'
            : 'Could not load driving directions. Our routing service may be busy — try again shortly.',
        );
        setLoading(false);
        return;
      }
      setLoadingStage('ready');
      window.setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, prefetchStillFresh ? 0 : 280);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(locateTimer);
      routeRequestIdRef.current += 1;
    };
  }, [destination.lat, destination.lng, loadRoute]);

  useEffect(() => {
    if (!route || routeAnnouncedRef.current || !voiceOn) return;
    routeAnnouncedRef.current = true;
    const departStep = route.steps.find((step) => step.maneuverType === 'depart') ?? route.steps[0];
    voiceRef.current.speak(navigationStartMessage ?? `Starting navigation to ${destinationLabel}`, 'nav-start');
    for (const [index, message] of (navigationFollowUpMessages ?? []).entries()) {
      voiceRef.current.speak(message, `nav-followup-${index}`);
    }
    if (departStep) {
      voiceRef.current.speak(departStep.instruction, 'nav-depart');
    }
    voiceRef.current.speak(
      buildRouteSummaryVoice(destinationLabel, route.distanceMeters, route.durationSeconds),
      'nav-summary',
    );
  }, [route, destinationLabel, navigationStartMessage, navigationFollowUpMessages, voiceOn]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || mapBootstrappedRef.current) return;
    mapBootstrappedRef.current = true;

    const start = initialOriginRef.current;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    }).setView([start.lat, start.lng], 16);

    const tileLayer = L.tileLayer(NAV_TILE_URLS[mapStyle], {
      maxZoom: 19,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 3,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;
    routePolylineHandlesRef.current = emptyRouteHandles();
    mapRef.current = map;

    const debouncedInvalidate = debounceMapInvalidate(map);

    const onUserMapInteraction = () => {
      if (isProgrammaticMapMoveRef.current) return;
      routeOverviewLockedRef.current = true;
      // Stop camera follow so the user can pan/zoom without GPS yanking them back.
      followUserRef.current = false;
      setFollowUser(false);
    };
    map.on('dragstart', onUserMapInteraction);
    map.on('zoomstart', onUserMapInteraction);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            debouncedInvalidate();
          })
        : null;
    resizeObserver?.observe(mapContainerRef.current);

    const onWindowResize = () => debouncedInvalidate();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', onWindowResize);

    window.setTimeout(debouncedInvalidate, 200);

    return () => {
      map.off('dragstart', onUserMapInteraction);
      map.off('zoomstart', onUserMapInteraction);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('orientationchange', onWindowResize);
      resizeObserver?.disconnect();
      if (navPanRafRef.current != null) {
        cancelAnimationFrame(navPanRafRef.current);
        navPanRafRef.current = null;
      }
      map.remove();
      resetMapBearing(map);
      mapRef.current = null;
      tileLayerRef.current = null;
      routeLayerRef.current = null;
      routePolylineHandlesRef.current = emptyRouteHandles();
      destMarkerRef.current = null;
      userMarkerRef.current = null;
      hasFittedRouteRef.current = false;
      routeOverviewLockedRef.current = false;
      mapBootstrappedRef.current = false;
      lastRouteDrawRef.current = null;
      displayedPosRef.current = null;
    };
  }, []);

  useEffect(() => {
    tileLayerRef.current?.setUrl(NAV_TILE_URLS[mapStyle]);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const debouncedInvalidate = debounceMapInvalidate(map);
    debouncedInvalidate();
  }, [sheetSnap]);

  useEffect(() => {
    const sheet = document.getElementById('nav_details_sheet');
    const root = document.getElementById('map_navigation_view');
    if (!sheet || !root) return;

    const map = mapRef.current;
    const debouncedInvalidate = map ? debounceMapInvalidate(map) : null;

    const updateSheetOffset = () => {
      root.style.setProperty('--sbn-nav-sheet-height', `${sheet.offsetHeight}px`);
      debouncedInvalidate?.();
      if (!followUserRef.current) {
        fitRouteOverview({ force: true });
      }
    };

    updateSheetOffset();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSheetOffset) : null;
    observer?.observe(sheet);
    return () => observer?.disconnect();
  }, [sheetSnap, route, loading, arrived, fitRouteOverview]);

  useEffect(() => {
    if (!route || !mapRef.current || !routeLayerRef.current) return;

    const map = mapRef.current;

    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    } else {
      const destIcon = L.divIcon({
        html: `
          <div class="sbn-nav-dest-pin relative flex flex-col items-center">
            <div class="h-9 w-9 rounded-full bg-[#FF4500] border-[3px] border-white shadow-[0_4px_16px_rgba(255,69,0,0.55)] flex items-center justify-center">
              <div class="h-2.5 w-2.5 rounded-full bg-white"></div>
            </div>
            <div class="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#FF4500] -mt-0.5"></div>
          </div>
        `,
        className: 'nav-dest-marker',
        iconSize: [36, 48],
        iconAnchor: [18, 42],
      });
      destMarkerRef.current = L.marker([destination.lat, destination.lng], {
        icon: destIcon,
        zIndexOffset: 400,
      }).addTo(map);
    }

    if (!hasFittedRouteRef.current) {
      hasFittedRouteRef.current = true;
      const start = userPosRef.current;

      // Before the device has moved, GPS gives us no heading, so the "look ahead"
      // camera bias defaulted to north — if the road actually heads any other way,
      // the route could render almost entirely off-screen on the very first frame.
      // Orient using the route's own initial bearing instead so the road ahead is
      // always visible from the moment navigation opens.
      if (route.coords.length >= 2) {
        const initialHeading = bearingAlongRoute(route.coords, start);
        headingRef.current = initialHeading;
        lastGpsPosRef.current = start;
        setHeading(initialHeading);
      }

      centerMapWithLookahead(map, start, 17);
      applyMapBearing(map, start, headingRef.current, northUpRef.current);
      if (userMarkerRef.current) {
        const markerHeading = northUpRef.current ? headingRef.current : 0;
        userMarkerRef.current.setIcon(createNavUserIcon(markerHeading));
        lastMarkerHeadingRef.current = markerHeading;
      }
    }
  }, [route, destination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;

    if (otherPartyLocation) {
      if (otherPartyMarkerRef.current) {
        otherPartyMarkerRef.current.setLatLng([otherPartyLocation.lat, otherPartyLocation.lng]);
      } else {
        const icon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute inline-flex h-8 w-8 rounded-full bg-emerald-500 opacity-35 animate-ping"></span>
              <span class="relative inline-flex h-8 w-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg items-center justify-center text-white text-xs font-black">P</span>
            </div>
          `,
          className: 'nav-other-party-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        otherPartyMarkerRef.current = L.marker([otherPartyLocation.lat, otherPartyLocation.lng], {
          icon,
          zIndexOffset: 350,
        }).addTo(map);
      }
    } else if (otherPartyMarkerRef.current) {
      otherPartyMarkerRef.current.remove();
      otherPartyMarkerRef.current = null;
    }
  }, [route, otherPartyLocation]);

  const syncNavigationMap = useCallback((next: LatLng, nextHeading: number) => {
    const map = mapRef.current;
    if (!map) return;

    headingRef.current = nextHeading;
    const markerHeading = northUpRef.current ? nextHeading : 0;

    const headingChanged =
      !userMarkerRef.current ||
      Math.abs(((markerHeading - lastMarkerHeadingRef.current + 540) % 360) - 180) >= NAV_HEADING_ICON_DEG;

    try {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([next.lat, next.lng]);
        if (headingChanged) {
          lastMarkerHeadingRef.current = markerHeading;
          userMarkerRef.current.setIcon(createNavUserIcon(markerHeading));
        }
      } else {
        lastMarkerHeadingRef.current = markerHeading;
        userMarkerRef.current = L.marker([next.lat, next.lng], {
          icon: createNavUserIcon(markerHeading),
          zIndexOffset: 500,
        }).addTo(map);
      }
    } catch (error) {
      console.warn('Could not update navigation user marker:', error);
    }

    if (!followUserRef.current) return;

    const last = lastNavPanRef.current;
    const movedEnough = !last || haversineMeters(last, next) >= NAV_GPS_FOLLOW_METERS;
    const now = Date.now();
    const bearingDue = now - lastBearingApplyRef.current >= NAV_MAP_SYNC_MS;

    if (!movedEnough) {
      if (!northUpRef.current && bearingDue) {
        lastBearingApplyRef.current = now;
        applyMapBearing(map, next, nextHeading, false);
      }
      return;
    }

    lastNavPanRef.current = next;
    lastBearingApplyRef.current = now;
    pendingNavPanRef.current = next;
    if (navPanRafRef.current != null) return;

    navPanRafRef.current = requestAnimationFrame(() => {
      navPanRafRef.current = null;
      const target = pendingNavPanRef.current;
      const liveMap = mapRef.current;
      if (!target || !liveMap || !followUserRef.current) return;
      centerMapWithLookahead(liveMap, target, Math.max(liveMap.getZoom(), 17));
      applyMapBearing(liveMap, target, headingRef.current, northUpRef.current);
    });
  }, []);

  useEffect(() => {
    if (!route || !routeLayerRef.current || loading) return;

    const now = Date.now();
    const lastDraw = lastRouteDrawRef.current;
    const logicPos = logicPosRef.current;
    const moved = lastDraw ? haversineMeters({ lat: lastDraw.lat, lng: lastDraw.lng }, logicPos) : Infinity;
    if (lastDraw && moved < NAV_ROUTE_DRAW_MIN_METERS && now - lastDraw.at < NAV_ROUTE_DRAW_MIN_MS) {
      return;
    }

    lastRouteDrawRef.current = { lat: logicPos.lat, lng: logicPos.lng, at: now };
    const split = splitRouteProgress(route.coords, logicPos);
    updateRoutePolylines(routeLayerRef.current, routePolylineHandlesRef.current, split.traveled, split.remaining);
  }, [route, userPos, loading]);

  const handleGpsUpdate = useCallback(
    (position: GeolocationPosition) => {
      setGpsError(null);

      // Ignore stale cached GPS replayed on subscribe (can be up to ~20s old).
      const ageMs = Math.max(0, Date.now() - position.timestamp);
      if (ageMs > NAV_STALE_GPS_MS && !hasFreshGpsRef.current) {
        return;
      }
      hasFreshGpsRef.current = true;

      const raw: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
      const activeRoute = routeRef.current;
      const projection =
        activeRoute && !arrivedRef.current ? projectOntoRoute(activeRoute.coords, raw) : null;
      const snapped =
        activeRoute && !arrivedRef.current ? snapPositionToRoute(activeRoute.coords, raw) : raw;
      const offRouteDistance = projection?.distanceMeters ?? 0;

      const prevDisplay = displayedPosRef.current;
      const displayPos =
        prevDisplay && activeRoute && !arrivedRef.current
          ? {
              lat: prevDisplay.lat + (snapped.lat - prevDisplay.lat) * NAV_DISPLAY_SMOOTH_ALPHA,
              lng: prevDisplay.lng + (snapped.lng - prevDisplay.lng) * NAV_DISPLAY_SMOOTH_ALPHA,
            }
          : snapped;

      userPosRef.current = snapped;
      logicPosRef.current = snapped;
      displayedPosRef.current = displayPos;

      const dest = destinationRef.current;
      const destLabel = destinationLabelRef.current;

      let nextHeading = headingRef.current;
      const gpsHeading = position.coords.heading;
      const speed = position.coords.speed;

      if (speed != null && speed >= 1.4 && lastGpsPosRef.current) {
        nextHeading = bearingDegrees(lastGpsPosRef.current, snapped);
      } else if (gpsHeading != null && !Number.isNaN(gpsHeading) && gpsHeading >= 0) {
        nextHeading = gpsHeading;
      } else if (activeRoute) {
        nextHeading = bearingAlongRoute(activeRoute.coords, snapped);
      }

      nextHeading = smoothHeadingDegrees(headingRef.current, nextHeading);
      lastGpsPosRef.current = snapped;

      const now = Date.now();
      const shouldUpdateUi = now - uiTickRef.current >= NAV_UI_TICK_MS;
      const shouldSyncMap = now - mapSyncTickRef.current >= NAV_MAP_SYNC_MS;

      if (shouldUpdateUi) {
        uiTickRef.current = now;
        setUserPos(displayPos);
        setGpsAccuracy(position.coords.accuracy ?? null);
        setSpeedMph(formatSpeedMph(position.coords.speed));
        setHeading(nextHeading);
        setOffRouteMeters(offRouteDistance);
        touchActiveNavSession();
      }

      if (shouldSyncMap) {
        mapSyncTickRef.current = now;
        syncNavigationMap(displayPos, nextHeading);
      } else if (userMarkerRef.current) {
        try {
          userMarkerRef.current.setLatLng([displayPos.lat, displayPos.lng]);
        } catch {
          // Marker may be mid-teardown.
        }
      }

      const distToDest = haversineMeters(snapped, dest);
      const remainingAlongRoute = activeRoute
        ? remainingRouteMeters(activeRoute.coords, snapped)
        : distToDest;
      const hasArrived =
        distToDest < NAV_ARRIVE_DEST_M ||
        (activeRoute != null && remainingAlongRoute < NAV_ARRIVE_REMAINING_M && distToDest < 80);

      if (shouldUpdateUi && onProgressUpdateRef.current) {
        const ratio =
          activeRoute && activeRoute.distanceMeters > 0
            ? Math.min(1, remainingAlongRoute / activeRoute.distanceMeters)
            : 1;
        const etaSeconds = activeRoute
          ? Math.max(0, Math.round(activeRoute.durationSeconds * ratio))
          : 0;
        onProgressUpdateRef.current({
          lat: snapped.lat,
          lng: snapped.lng,
          heading: nextHeading,
          speedMph: speed != null ? Number(formatSpeedMph(speed)) || null : null,
          etaSeconds,
          distanceMeters: remainingAlongRoute,
          arrived: hasArrived,
        });
      }

      if (hasArrived && !arrivedRef.current) {
        arrivedRef.current = true;
        setArrived(true);
        if (voiceOnRef.current) {
          const arriveStep = activeRoute?.steps.at(-1);
          voiceRef.current.speak(
            buildStepVoiceCue(
              arriveStep ?? {
                id: 'arrive',
                distanceMeters: 0,
                durationSeconds: 0,
                name: '',
                instruction: 'Arrive at pickup',
                maneuverType: 'arrive',
                location: dest,
              },
              0,
              'arrival',
              destLabel,
            ),
            'arrival',
          );
        }
        return;
      }

      if (activeRoute && !arrivedRef.current) {
        const nextIdx = findCurrentStepIndex(activeRoute.steps, snapped, stepIndexRef.current, {
          coords: activeRoute.coords,
          distanceMeters: activeRoute.distanceMeters,
        });
        if (nextIdx !== stepIndexRef.current) {
          stepIndexRef.current = nextIdx;
          setStepIndex(nextIdx);
          const step = activeRoute.steps[nextIdx];
          if (voiceOnRef.current && step) {
            voiceRef.current.speak(step.instruction, `step-change-${nextIdx}`);
          }
        }

        const step = activeRoute.steps[stepIndexRef.current];
        const cueStep = getActiveVoiceCueStep(activeRoute.steps, stepIndexRef.current);
        if (voiceOnRef.current && cueStep && cueStep.maneuverType !== 'arrive') {
          const dist = haversineMeters(snapped, cueStep.location);
          for (const kind of ['far', 'medium', 'near', 'now'] as const) {
            if (shouldFireVoiceCue(cueStep.distanceMeters, dist, kind, VOICE_CUE_THRESHOLDS)) {
              voiceRef.current.speak(
                buildStepVoiceCue(cueStep, VOICE_CUE_THRESHOLDS[kind], kind, destLabel),
                `cue-${stepIndexRef.current}-${kind}`,
              );
              break;
            }
          }
        }

        // Off-route must use RAW GPS distance — snapped position is always on-route
        // within the snap radius and would permanently disable rerouting.
        const shouldEvalOffRoute = now - offRouteEvalAtRef.current >= NAV_OFF_ROUTE_EVAL_MS;
        if (shouldEvalOffRoute) {
          offRouteEvalAtRef.current = now;
          const currentlyOffRoute = offRouteDistance > NAV_OFF_ROUTE_THRESHOLD_M;

          if (!reroutingRef.current && currentlyOffRoute) {
            offRouteTicksRef.current += 1;
            if (offRouteTicksRef.current >= NAV_OFF_ROUTE_TICKS) {
              reroutingRef.current = true;
              setRerouting(true);
              const rerouteKey = `reroute-${Date.now()}`;
              if (voiceOnRef.current) {
                voiceRef.current.speak(buildStepVoiceCue(step!, 0, 'reroute'), rerouteKey);
              }
              void loadRoute(raw, dest, true).then((result) => {
                if (!result) {
                  // Keep pressure on so we retry soon; don't reset to zero.
                  offRouteTicksRef.current = Math.max(1, NAV_OFF_ROUTE_TICKS - 1);
                }
              }).finally(() => {
                reroutingRef.current = false;
                setRerouting(false);
                lastRouteDrawRef.current = null;
              });
            }
          } else if (!currentlyOffRoute) {
            offRouteTicksRef.current = 0;
          }
        }
      }
    },
    [loadRoute, syncNavigationMap],
  );

  handleGpsUpdateRef.current = handleGpsUpdate;

  useEffect(() => {
    const unsubscribe = subscribeLiveGeolocation(
      (position) => {
        handleGpsUpdateRef.current(position);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location access is required for turn-by-turn navigation.'
            : 'GPS signal lost. Check that location services are enabled.';
        setGpsError(message);
      },
    );

    return () => {
      unsubscribe();
      if (navPanRafRef.current != null) {
        cancelAnimationFrame(navPanRafRef.current);
        navPanRafRef.current = null;
      }
    };
  }, []);

  const handleVoiceToggle = () => {
    setVoiceOn((on) => {
      const next = !on;
      voiceRef.current.setEnabled(next);
      return next;
    });
  };

  const handleRecenter = () => {
    setFollowUser(true);
    followUserRef.current = true;
    setNorthUp(false);
    lastNavPanRef.current = null;
    const pos = userPosRef.current;
    const map = mapRef.current;
    if (!map) return;
    centerMapWithLookahead(map, pos, 17);
    applyMapBearing(map, pos, headingRef.current, false);
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(createNavUserIcon(0));
      lastMarkerHeadingRef.current = 0;
    }
  };

  const handleOverview = () => {
    setFollowUser(false);
    followUserRef.current = false;
    setNorthUp(true);
    const map = mapRef.current;
    if (!map) return;
    resetMapBearing(map);
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(createNavUserIcon(headingRef.current));
      lastMarkerHeadingRef.current = headingRef.current;
    }
    routeOverviewLockedRef.current = false;
    fitRouteOverview({ force: true });
  };

  const handleMapStyleCycle = () => {
    setMapStyle((current) => {
      if (current === 'dark') return 'light';
      if (current === 'light') return 'standard';
      return 'dark';
    });
  };

  const handleShareTrip = async () => {
    const summary = `${formatNavDuration(remainingSeconds)} · ${formatNavDistance(remainingMeters)} to ${destinationLabel}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sacramento Buy Nothing navigation', text: summary, url: mapsUrl });
        return;
      }
    } catch {
      // User cancelled or share failed.
    }
    try {
      await navigator.clipboard.writeText(`${summary}\n${mapsUrl}`);
    } catch {
      // Clipboard unavailable.
    }
  };

  const handleExit = () => {
    voiceRef.current.cancel();
    void wakeLockRef.current?.release();
    onExit();
  };

  const handleRetryRoute = () => {
    setLoading(true);
    setLoadingStage('routing');
    setError(null);
    routeAnnouncedRef.current = false;
    void loadRoute(userPosRef.current, destination, false).then((result) => {
      if (!result) {
        setError('Could not load driving directions. Try again in a moment.');
        setLoading(false);
        return;
      }
      setLoading(false);
    });
  };

  const showFatalError = Boolean(error && !route);
  const navigationCueStep =
    route && !arrived ? getActiveVoiceCueStep(route.steps, stepIndex) ?? currentStep : currentStep;
  const onConnectorStep =
    currentStep?.maneuverType === 'depart' ||
    currentStep?.maneuverType === 'continue' ||
    currentStep?.maneuverType === 'new name';

  const maneuverKind = route
    ? arrived
      ? 'arrive'
      : maneuverIconKind(navigationCueStep)
    : 'arrive';
  const bannerStreet = arrived
    ? destinationLabel
    : onConnectorStep
      ? currentStep?.name?.trim() || navigationCueStep?.name?.trim() || 'Continue on route'
      : navigationCueStep?.name?.trim() ||
        currentStep?.name?.trim() ||
        (maneuverKind === 'arrive' ? destinationLabel : 'Continue on route');
  const bannerInstruction = arrived
    ? undefined
    : onConnectorStep
      ? navigationCueStep?.instruction
      : navigationCueStep?.instruction || currentStep?.instruction;
  const currentRoadLabel = arrived
    ? destinationLabel
    : onConnectorStep
      ? currentStep?.name?.trim() || navigationCueStep?.name?.trim() || bannerStreet
      : navigationCueStep?.name?.trim() || currentStep?.name?.trim() || bannerStreet;

  const laneGuidanceStep = navigationCueStep ?? currentStep;
  const laneCount = estimateLaneCount(laneGuidanceStep);
  const speedLimitMph = estimateSpeedLimitMph(currentStep ?? navigationCueStep);

  useEffect(() => {
    const map = mapRef.current;
    const pos = userPosRef.current;
    if (!map || !followUserRef.current) return;
    applyMapBearing(map, pos, headingRef.current, northUp);
    if (userMarkerRef.current) {
      const markerHeading = northUp ? headingRef.current : 0;
      userMarkerRef.current.setIcon(createNavUserIcon(markerHeading));
      lastMarkerHeadingRef.current = markerHeading;
    }
  }, [northUp]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col sbn-nav--${theme}`}
      id="map_navigation_view"
      style={{ background: 'var(--sbn-nav-bg)' }}
    >
      <div className="relative flex-1 min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {loading && <NavLoadingOverlay stage={loadingStage} destinationLabel={destinationLabel} />}

        {showFatalError && (
          <div className="sbn-nav-error-overlay safe-area-pb">
            <div className="sbn-nav-error-card sbn-nav-glass pointer-events-auto">
              <div className="sbn-nav-error-icon" aria-hidden>
                {typeof navigator !== 'undefined' && !navigator.onLine ? <WifiOff className="w-7 h-7" /> : <Navigation className="w-7 h-7" />}
              </div>
              <h2 className="text-lg font-display font-bold text-[var(--sbn-nav-text)] mt-4">Couldn&apos;t start navigation</h2>
              <p className="text-sm text-[var(--sbn-nav-text-secondary)] mt-2 leading-relaxed">{error}</p>
              <div className="flex flex-col gap-2 w-full mt-6">
                <button type="button" onClick={handleRetryRoute} className="sbn-nav-primary-btn">
                  Try again
                </button>
                <button type="button" onClick={() => openDrivingDirections(destination, origin)} className="sbn-nav-secondary-btn">
                  Open in Apple / Google Maps
                </button>
                <button type="button" onClick={handleExit} className="sbn-nav-tertiary-btn">
                  Back to map
                </button>
              </div>
            </div>
          </div>
        )}

        {gpsError && !showFatalError && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top,0px)+5.5rem)] z-30 pointer-events-none">
            <div className="sbn-nav-glass rounded-2xl px-4 py-3 text-xs font-semibold text-[var(--sbn-nav-warning)] text-center">
              {gpsError}
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col">
          <div className="pointer-events-auto safe-area-pt shrink-0">
            <motion.div
              id="nav_instruction_banner"
              className={`sbn-nav-banner sbn-nav-glass sbn-nav-banner-accent ${isCompact ? 'sbn-nav-banner-compact' : ''}`}
              animate={{ scale: bannerScale }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className={`flex items-start gap-3 ${isCompact ? '' : 'min-h-[4rem]'}`}>
                <div className={`shrink-0 flex flex-col items-center justify-center ${isCompact ? 'w-12' : 'w-[4.75rem]'}`}>
                  {loading ? (
                    <div className="sbn-nav-banner-shimmer" aria-hidden />
                  ) : (
                    <NavManeuverShield kind={maneuverKind} className={isCompact ? 'w-9 h-9' : 'w-14 h-14'} />
                  )}
                  {!loading && !arrived && (
                    <p className="text-sm font-black mt-2 tabular-nums leading-none tracking-tight text-accent">
                      {formatNavDistance(distanceToManeuver)}
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {loading ? (
                    <>
                      <p className={`font-display font-extrabold leading-tight ${isCompact ? 'text-lg' : 'text-[1.65rem]'}`}>Loading route</p>
                      <p className="text-sm font-semibold mt-1 truncate text-[var(--sbn-nav-text-secondary)]">To {destinationLabel}</p>
                    </>
                  ) : arrived ? (
                    <>
                      <p className={`font-display font-extrabold leading-tight ${isCompact ? 'text-lg' : 'text-[1.65rem]'}`}>You&apos;ve arrived</p>
                      <p className="text-base font-bold mt-1 truncate">{destinationLabel}</p>
                    </>
                  ) : (
                    <>
                      <p
                        className={`font-display font-extrabold leading-[1.05] tracking-tight truncate ${
                          isCompact ? 'text-lg' : 'text-[1.65rem] sm:text-[1.85rem]'
                        }`}
                      >
                        {bannerStreet}
                      </p>
                      {bannerInstruction && !isCompact ? (
                        <p className="text-sm font-semibold mt-1 truncate text-[var(--sbn-nav-text-secondary)]">{bannerInstruction}</p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {!loading && route && (rerouting || offRouteMeters > 55) && !arrived && (
                <p className="mt-2 text-center text-xs font-semibold text-[var(--sbn-nav-warning)]">
                  {rerouting ? 'Recalculating route…' : 'Return to highlighted route'}
                </p>
              )}

              {!loading && !arrived && !isCompact && (
                <NavLaneGuidance laneCount={laneCount} maneuverKind={maneuverKind} />
              )}
            </motion.div>

            <VoiceStatusBar phrase={voicePhrase} visible={voiceSpeaking && voiceOn} />
          </div>

          {!loading && route && (
            <div className="relative flex-1 min-h-0">
              {/* These floating controls only fit — and are only needed — while the
                  details sheet is collapsed. The sheet's own expanded view has its
                  own overview/voice/recenter/share row, so hiding these here avoids
                  both duplicate controls and the FAB stack visually spilling onto
                  the sheet when there's little vertical room left for it. */}
              {sheetSnap === 'collapsed' && (
                <>
                  <div className="absolute left-3 bottom-3 pointer-events-auto">
                    <NavSpeedCard currentMph={speedMph} limitMph={speedLimitMph} compact={isCompact} />
                  </div>

                  <div
                    className={`absolute right-3 flex pointer-events-auto ${
                      isCompact ? 'top-1 flex-row gap-1.5' : 'top-2 flex-col gap-2.5'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setNorthUp((value) => !value);
                        setShowHeading(true);
                      }}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''} ${northUp ? '' : 'sbn-nav-fab-active'}`}
                      title={northUp ? 'North up — tap for heading up' : 'Heading up — tap for north up'}
                      aria-label={northUp ? 'Switch to heading up map' : 'Switch to north up map'}
                      aria-pressed={!northUp}
                    >
                      <Compass className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                    </button>
                    <button
                      type="button"
                      onClick={handleVoiceToggle}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''} ${voiceOn ? 'sbn-nav-fab-active' : ''}`}
                      title={voiceOn ? 'Voice guidance on' : 'Voice guidance off'}
                      aria-pressed={voiceOn}
                      aria-label={voiceOn ? 'Mute voice guidance' : 'Enable voice guidance'}
                    >
                      {voiceOn ? (
                        <Volume2 className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                      ) : (
                        <VolumeX className={`opacity-80 ${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRecenter}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''} ${followUser ? 'sbn-nav-fab-active' : ''}`}
                      title="Recenter on you"
                      aria-label="Recenter on you"
                    >
                      <LocateFixed className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                    </button>
                    <button
                      type="button"
                      onClick={handleMapStyleCycle}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''}`}
                      title={`Map style: ${mapStyle}`}
                      aria-label="Change map style"
                    >
                      <Layers className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                    </button>
                    <button
                      type="button"
                      onClick={handleOverview}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''}`}
                      title="Route overview"
                      aria-label="Route overview"
                    >
                      <MapIcon className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                    </button>

                    {showHeading && !isCompact && (
                      <div className="sbn-nav-glass rounded-xl px-3 py-2 text-xs font-bold tabular-nums pointer-events-none text-center">
                        <p>{northUp ? 'North up' : 'Heading up'}</p>
                        <p className="mt-0.5 opacity-80">{Math.round(heading)}°</p>
                      </div>
                    )}
                  </div>

                  {!arrived && currentRoadLabel && (
                    <div className="absolute inset-x-0 bottom-3 flex justify-center px-20 pointer-events-none">
                      <div className="sbn-nav-road-pill truncate">{currentRoadLabel}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!loading && route && (
            <div className="shrink-0 pointer-events-auto">
              <NavigationDetailsSheet
                snap={sheetSnap}
                onSnapChange={setSheetSnap}
                arrived={arrived}
                destinationLabel={destinationLabel}
                remainingSeconds={remainingSeconds}
                remainingMeters={remainingMeters}
                gpsAccuracy={gpsAccuracy}
                route={route}
                stepIndex={stepIndex}
                voiceOn={voiceOn}
                onVoiceToggle={handleVoiceToggle}
                onOverview={handleOverview}
                onShare={() => void handleShareTrip()}
                onRecenter={handleRecenter}
                onExit={handleExit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
