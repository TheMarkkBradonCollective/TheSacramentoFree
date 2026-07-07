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
import { splitRouteProgress, snapPositionToRoute } from '../lib/navMapGeometry';
import NavManeuverShield from './navigation/NavManeuverShield';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { touchActiveNavSession } from '../lib/navigationSession';
import { useTheme } from '../theme/ThemeContext';
import {
  activeLaneIndices,
  bearingAlongRoute,
  bearingDegrees,
  distanceToRouteMeters,
  estimateLaneCount,
  estimateSpeedLimitMph,
  fetchNavigationRoute,
  findCurrentStepIndex,
  formatArrivalTime,
  formatNavDistance,
  formatNavDuration,
  formatSpeedMph,
  getActiveVoiceCueStep,
  isOffRoute,
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

function NavSpeedCard({ currentMph, limitMph }: { currentMph: string | null; limitMph: number }) {
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
      className="sbn-nav-speed-card sbn-nav-glass pointer-events-auto"
      aria-label={
        currentMph
          ? `Speed limit ${limitMph} miles per hour, current speed ${currentMph}`
          : `Speed limit ${limitMph} miles per hour`
      }
    >
      <div className="sbn-nav-speed-limit">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--sbn-nav-text-secondary)]">Limit</p>
        <p className="text-lg font-black tabular-nums leading-none text-[var(--sbn-nav-text)]">{limitMph}</p>
      </div>
      <div className={`sbn-nav-speed-current ${speedClass}`}>
        <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Now</p>
        <p className="text-xl font-black tabular-nums leading-none">{currentMph ?? '—'}</p>
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

function drawRouteWithProgress(
  layer: L.LayerGroup,
  traveled: [number, number][],
  remaining: [number, number][],
): void {
  layer.clearLayers();

  if (traveled.length >= 2) {
    L.polyline(traveled, {
      color: 'rgba(148, 163, 184, 0.55)',
      weight: 8,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);
  }

  if (remaining.length < 2) return;

  L.polyline(remaining, {
    className: 'sbn-nav-route-glow',
    color: NAV_ROUTE_GLOW,
    weight: 15,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(layer);
  L.polyline(remaining, {
    color: NAV_BRAND_LIGHT,
    weight: 9,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(layer);
  L.polyline(remaining, {
    className: 'sbn-nav-route-animated',
    color: NAV_BRAND,
    weight: 5,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(layer);
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
    const shiftedCenter = map.unproject(L.point(targetPoint.x, targetPoint.y + lookaheadPx), zoom);

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
  const reroutingRef = useRef(false);
  const arrivedRef = useRef(false);
  const routeAnnouncedRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const followUserRef = useRef(true);
  const userPosRef = useRef<LatLng>(origin);
  const headingRef = useRef(0);
  const lastMarkerHeadingRef = useRef(0);
  const lastNavPanRef = useRef<LatLng | null>(null);
  const navPanRafRef = useRef<number | null>(null);
  const pendingNavPanRef = useRef<LatLng | null>(null);
  const hasFittedRouteRef = useRef(false);
  const uiTickRef = useRef(0);
  const lastGpsPosRef = useRef<LatLng | null>(null);
  const handleGpsUpdateRef = useRef<(position: GeolocationPosition) => void>(() => undefined);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const NAV_GPS_FOLLOW_METERS = 18;
  const NAV_UI_TICK_MS = 900;
  const NAV_HEADING_ICON_DEG = 12;

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

  destinationRef.current = destination;
  destinationLabelRef.current = destinationLabel;
  routeRef.current = route;
  voiceOnRef.current = voiceOn;

  const [showHeading, setShowHeading] = useState(false);

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
    return remainingRouteMeters(route.coords, userPos);
  }, [route, userPos]);

  const remainingSeconds = useMemo(() => {
    if (!route || route.distanceMeters <= 0 || arrived) return 0;
    const ratio = Math.min(1, remainingMeters / route.distanceMeters);
    return Math.max(0, Math.round(route.durationSeconds * ratio));
  }, [route, remainingMeters, arrived]);

  const distanceToManeuver = useMemo(() => {
    if (!route) return 0;
    const cueStep = getActiveVoiceCueStep(route.steps, stepIndex);
    if (!cueStep) return 0;
    return haversineMeters(userPos, cueStep.location);
  }, [route, stepIndex, userPos]);

  const bannerScale = useMemo(() => {
    if (arrived) return 1;
    if (distanceToManeuver < 80) return 1.05;
    if (distanceToManeuver < 250) return 1.025;
    return 1;
  }, [distanceToManeuver, arrived]);

  const loadRoute = useCallback(async (from: LatLng, to: LatLng, isReroute = false) => {
    const result = await fetchNavigationRoute(from, to);
    if (!result) {
      if (isReroute) {
        voiceRef.current.speak('Unable to recalculate route. Continue toward your destination.', 'reroute-fail');
      }
      return null;
    }

    setRoute(result);
    stepIndexRef.current = 0;
    setStepIndex(0);
    offRouteTicksRef.current = 0;

    if (isReroute) {
      voiceRef.current.clearSpokenKeys();
      voiceRef.current.speak('Route updated', 'reroute-done');
    }

    return result;
  }, []);

  useEffect(() => {
    voiceRef.current.prime();
    voiceRef.current.setEnabled(true);

    const unsubscribeSpeaking = voiceRef.current.subscribeSpeaking((speaking, phrase) => {
      setVoiceSpeaking(speaking);
      setVoicePhrase(phrase);
    });

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake lock may be denied; navigation still works.
      }
    };
    void requestWakeLock();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        void requestWakeLock();
      }
      if (document.visibilityState === 'visible') {
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
    if (initialRouteRef.current) {
      setLoading(false);
      setLoadingStage('ready');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadingStage('locating');
    setError(null);
    routeAnnouncedRef.current = false;
    arrivedRef.current = false;
    setArrived(false);

    const locateTimer = window.setTimeout(() => {
      if (!cancelled) setLoadingStage('routing');
    }, 450);

    const from = userPosRef.current;
    void loadRoute(from, destination, false).then((result) => {
      if (cancelled) return;
      window.clearTimeout(locateTimer);
      if (!result) {
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
      }, 280);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(locateTimer);
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
    mapRef.current = map;

    const invalidate = () => {
      if (!mapRef.current?.getContainer()?.isConnected) return;
      mapRef.current.invalidateSize({ animate: false, pan: false });
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            invalidate();
          })
        : null;
    resizeObserver?.observe(mapContainerRef.current);

    const onWindowResize = () => invalidate();
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', onWindowResize);

    window.setTimeout(invalidate, 200);

    return () => {
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
      destMarkerRef.current = null;
      userMarkerRef.current = null;
      hasFittedRouteRef.current = false;
      mapBootstrappedRef.current = false;
    };
  }, []);

  useEffect(() => {
    tileLayerRef.current?.setUrl(NAV_TILE_URLS[mapStyle]);
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    window.setTimeout(() => {
      map.invalidateSize({ animate: false, pan: false });
    }, 120);
  }, [sheetSnap]);

  useEffect(() => {
    const sheet = document.getElementById('nav_details_sheet');
    const root = document.getElementById('map_navigation_view');
    if (!sheet || !root) return;

    const updateSheetOffset = () => {
      root.style.setProperty('--sbn-nav-sheet-height', `${sheet.offsetHeight}px`);
      mapRef.current?.invalidateSize({ animate: false, pan: false });
    };

    updateSheetOffset();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSheetOffset) : null;
    observer?.observe(sheet);
    return () => observer?.disconnect();
  }, [sheetSnap, route, loading, arrived]);

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
      centerMapWithLookahead(map, start, 17);
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
    if (last && haversineMeters(last, next) < NAV_GPS_FOLLOW_METERS) {
      applyMapBearing(map, next, nextHeading, northUpRef.current);
      return;
    }

    lastNavPanRef.current = next;
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
    const split = splitRouteProgress(route.coords, userPos);
    drawRouteWithProgress(routeLayerRef.current, split.traveled, split.remaining);
  }, [route, userPos, loading]);

  const handleGpsUpdate = useCallback(
    (position: GeolocationPosition) => {
      setGpsError(null);
      const raw: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
      const activeRoute = routeRef.current;
      const next =
        activeRoute && !arrivedRef.current
          ? snapPositionToRoute(activeRoute.coords, raw)
          : raw;
      userPosRef.current = next;

      const now = Date.now();
      const shouldUpdateUi = now - uiTickRef.current >= NAV_UI_TICK_MS;
      if (shouldUpdateUi) {
        uiTickRef.current = now;
        setUserPos(next);
        setGpsAccuracy(position.coords.accuracy ?? null);
        setSpeedMph(formatSpeedMph(position.coords.speed));
        touchActiveNavSession();
      }

      const dest = destinationRef.current;
      const destLabel = destinationLabelRef.current;

      let nextHeading = headingRef.current;
      const gpsHeading = position.coords.heading;
      const speed = position.coords.speed;

      if (speed != null && speed >= 1.4 && lastGpsPosRef.current) {
        nextHeading = bearingDegrees(lastGpsPosRef.current, next);
      } else if (gpsHeading != null && !Number.isNaN(gpsHeading) && gpsHeading >= 0) {
        nextHeading = gpsHeading;
      } else if (activeRoute) {
        nextHeading = bearingAlongRoute(activeRoute.coords, next);
      }

      nextHeading = smoothHeadingDegrees(headingRef.current, nextHeading);
      lastGpsPosRef.current = next;
      if (shouldUpdateUi) {
        setHeading(nextHeading);
      }

      syncNavigationMap(next, nextHeading);

      const distToDest = haversineMeters(next, dest);

      if (shouldUpdateUi && onProgressUpdateRef.current) {
        const remaining = activeRoute ? remainingRouteMeters(activeRoute.coords, next) : distToDest;
        const ratio = activeRoute && activeRoute.distanceMeters > 0 ? Math.min(1, remaining / activeRoute.distanceMeters) : 1;
        const etaSeconds = activeRoute ? Math.max(0, Math.round(activeRoute.durationSeconds * ratio)) : 0;
        onProgressUpdateRef.current({
          lat: next.lat,
          lng: next.lng,
          heading: nextHeading,
          speedMph: speed != null ? Number(formatSpeedMph(speed)) || null : null,
          etaSeconds,
          distanceMeters: remaining,
          arrived: distToDest < 35,
        });
      }

      if (distToDest < 35 && !arrivedRef.current) {
        arrivedRef.current = true;
        setArrived(true);
        if (voiceOnRef.current) {
          const arriveStep = activeRoute?.steps.at(-1);
          voiceRef.current.speak(
            buildStepVoiceCue(
              arriveStep ?? { id: 'arrive', distanceMeters: 0, durationSeconds: 0, name: '', instruction: 'Arrive at pickup', maneuverType: 'arrive', location: dest },
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
        const nextIdx = findCurrentStepIndex(activeRoute.steps, next, stepIndexRef.current, {
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
          const dist = haversineMeters(next, cueStep.location);
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

        if (!reroutingRef.current && isOffRoute(activeRoute.coords, next)) {
          offRouteTicksRef.current += 1;
          if (offRouteTicksRef.current >= 4) {
            reroutingRef.current = true;
            setRerouting(true);
            if (voiceOnRef.current) {
              voiceRef.current.speak(buildStepVoiceCue(step!, 0, 'reroute'), 'reroute');
            }
            void loadRoute(next, dest, true).finally(() => {
              reroutingRef.current = false;
              setRerouting(false);
              offRouteTicksRef.current = 0;
            });
          }
        } else if (!isOffRoute(activeRoute.coords, next)) {
          offRouteTicksRef.current = 0;
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
    if (route) {
      map.fitBounds(route.coords, { padding: [90, 90], maxZoom: 15, animate: false });
    }
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
        await navigator.share({ title: 'Buy Nothing navigation', text: summary, url: mapsUrl });
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
  const offRouteMeters = route ? distanceToRouteMeters(route.coords, userPos) : 0;
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
              className="sbn-nav-banner sbn-nav-glass sbn-nav-banner-accent"
              animate={{ scale: bannerScale }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className="flex items-start gap-3 min-h-[4rem]">
                <div className="shrink-0 w-[4.75rem] flex flex-col items-center justify-center">
                  {loading ? (
                    <div className="sbn-nav-banner-shimmer" aria-hidden />
                  ) : (
                    <NavManeuverShield kind={maneuverKind} className="w-14 h-14" />
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
                      <p className="text-[1.65rem] font-display font-extrabold leading-tight">Loading route</p>
                      <p className="text-sm font-semibold mt-1 truncate text-[var(--sbn-nav-text-secondary)]">To {destinationLabel}</p>
                    </>
                  ) : arrived ? (
                    <>
                      <p className="text-[1.65rem] font-display font-extrabold leading-tight">You&apos;ve arrived</p>
                      <p className="text-base font-bold mt-1 truncate">{destinationLabel}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[1.65rem] sm:text-[1.85rem] font-display font-extrabold leading-[1.05] tracking-tight truncate">
                        {bannerStreet}
                      </p>
                      {bannerInstruction ? (
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

              {!loading && !arrived && (
                <NavLaneGuidance laneCount={laneCount} maneuverKind={maneuverKind} />
              )}
            </motion.div>

            <VoiceStatusBar phrase={voicePhrase} visible={voiceSpeaking && voiceOn} />
          </div>

          {!loading && route && (
            <div className="relative flex-1 min-h-0">
              <div className="absolute left-3 bottom-3 pointer-events-auto">
                <NavSpeedCard currentMph={speedMph} limitMph={speedLimitMph} />
              </div>

              <div className="absolute right-3 top-2 flex flex-col gap-2.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    setNorthUp((value) => !value);
                    setShowHeading(true);
                  }}
                  className={`sbn-nav-fab ${northUp ? '' : 'sbn-nav-fab-active'}`}
                  title={northUp ? 'North up — tap for heading up' : 'Heading up — tap for north up'}
                  aria-label={northUp ? 'Switch to heading up map' : 'Switch to north up map'}
                  aria-pressed={!northUp}
                >
                  <Compass className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  className={`sbn-nav-fab ${voiceOn ? 'sbn-nav-fab-active' : ''}`}
                  title={voiceOn ? 'Voice guidance on' : 'Voice guidance off'}
                  aria-pressed={voiceOn}
                  aria-label={voiceOn ? 'Mute voice guidance' : 'Enable voice guidance'}
                >
                  {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-80" />}
                </button>
                <button
                  type="button"
                  onClick={handleRecenter}
                  className={`sbn-nav-fab ${followUser ? 'sbn-nav-fab-active' : ''}`}
                  title="Recenter on you"
                  aria-label="Recenter on you"
                >
                  <LocateFixed className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleMapStyleCycle}
                  className="sbn-nav-fab"
                  title={`Map style: ${mapStyle}`}
                  aria-label="Change map style"
                >
                  <Layers className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleOverview}
                  className="sbn-nav-fab"
                  title="Route overview"
                  aria-label="Route overview"
                >
                  <MapIcon className="w-5 h-5" />
                </button>
              </div>

              {showHeading && (
                <div className="absolute right-3 top-[17.5rem] sbn-nav-glass rounded-xl px-3 py-2 text-xs font-bold tabular-nums pointer-events-none text-center">
                  <p>{northUp ? 'North up' : 'Heading up'}</p>
                  <p className="mt-0.5 opacity-80">{Math.round(heading)}°</p>
                </div>
              )}

              {!arrived && currentRoadLabel && sheetSnap === 'collapsed' && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center px-20 pointer-events-none">
                  <div className="sbn-nav-road-pill truncate">{currentRoadLabel}</div>
                </div>
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
