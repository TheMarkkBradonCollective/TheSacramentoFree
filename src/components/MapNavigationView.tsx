import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'motion/react';
import L from 'leaflet';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronUp,
  CornerUpLeft,
  CornerUpRight,
  LocateFixed,
  Map as MapIcon,
  Mic,
  Navigation,
  RotateCcw,
  Settings2,
  Share2,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import type { LatLng } from '../lib/mapRoute';
import { haversineMeters, geolocationAgeMs, openDrivingDirections, googleMapsDirectionsUrl } from '../lib/mapRoute';
import { followRouteLine, projectOntoRoute, splitRouteProgress, snapPositionToRoute } from '../lib/navMapGeometry';
import NavManeuverShield from './navigation/NavManeuverShield';
import NavigationSettingsForm from './NavigationSettingsForm';
import NavTravelModeSwitcher from './NavTravelModeSwitcher';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { touchActiveNavSession } from '../lib/navigationSession';
import { useTheme } from '../theme/ThemeContext';
import {
  bearingAlongRoute,
  estimateSpeedLimitMph,
  fetchNavigationRoute,
  findCurrentStepIndex,
  formatArrivalTime,
  formatNavDistance,
  formatNavDuration,
  formatSpeedMph,
  getDisplayedNavGuidance,
  headingDeltaDegrees,
  remainingRouteMeters,
  shouldFireVoiceCue,
  maneuverIconKind,
  type ManeuverIconKind,
  type NavigationRouteResult,
} from '../lib/navigationRoute';
import {
  fetchOsmLanes,
  highlightLanesForManeuver,
  laneArrowSymbol,
  shouldRenderLaneGuidance,
  type NavLane,
} from '../lib/navLanes';
import {
  resolveNavHeading,
} from '../lib/navHeading';
import {
  readNavigationSettings,
  subscribeNavigationSettings,
  travelModeGerund,
  travelModeVerb,
  writeNavigationSettings,
  type NavigationSettings,
  type NavTravelMode,
} from '../lib/navigationSettings';
import {
  buildDisplayedGuidanceVoice,
  buildStartBriefingVoice,
  distanceCueKeysForStep,
  NavigationVoice,
  unlockNavigationSpeech,
  voiceCueThresholdsForMode,
} from '../lib/navigationVoice';
import { fitRoutePreviewToViewport, measureMapFitPadding } from '../lib/mapRouteFitPadding';
import { SBN_MAP_TILE_OPTIONS, SBN_MAP_TILE_URL } from '../lib/mapTiles';
import { isPlayStoreDemo } from '../preview/playStoreDemo';
import {
  ROUTE_LINE_TRAVELED,
  ROUTE_LINE_TRAVELED_CASING,
  NAV_ROUTE_LINE_CASING,
  NAV_ROUTE_LINE_MAIN,
} from '../lib/mapRouteLineStyle';

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
  /** Go Get live trip: stay on this screen until pickup is cancelled or completed. */
  tripLock?: boolean;
  /** When set, the details sheet shows an in-trip message action. */
  onOpenChat?: () => void;
  chatLabel?: string;
  /** Fill a parent overlay instead of covering the viewport as a root portal. */
  embedded?: boolean;
}

type NavLoadingStage = 'locating' | 'routing' | 'ready';

function VoiceStatusBar({ phrase, visible }: { phrase: string; visible: boolean }) {
  if (!visible || !phrase) return null;
  return (
    <div className="sbn-nav-voice-strip pointer-events-none" aria-live="polite">
      <Mic className="w-3.5 h-3.5 text-accent shrink-0" />
      <div className="sbn-nav-voice-waves shrink-0" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="text-xs font-semibold truncate text-[var(--sbn-nav-text)]">{phrase}</p>
    </div>
  );
}

function NavLaneGuidance({ lanes, maneuverKind }: { lanes: NavLane[]; maneuverKind: ManeuverIconKind }) {
  const highlighted = highlightLanesForManeuver(lanes, maneuverKind);
  if (!shouldRenderLaneGuidance(highlighted, maneuverKind, true)) return null;

  const activeIndexes = highlighted.flatMap((lane, index) => (lane.valid ? [index + 1] : []));

  return (
    <div
      className="sbn-nav-lane"
      aria-label={
        activeIndexes.length > 0
          ? `${highlighted.length} lanes. Use lane ${activeIndexes.join(' or ')}`
          : `${highlighted.length} lanes`
      }
    >
      {highlighted.map((lane, index) => (
        <div
          key={`${lane.indications.join('-')}-${index}`}
          className={`sbn-nav-lane-slot text-xs font-bold ${lane.valid ? 'sbn-nav-lane-slot-active' : ''}`}
          title={lane.indications.join(', ') || 'Lane'}
          aria-hidden={!lane.valid}
        >
          {laneArrowSymbol(lane.indications)}
        </div>
      ))}
    </div>
  );
}

function NavSpeedCard({
  currentMph,
  limitMph,
}: {
  currentMph: string | null;
  limitMph: number;
}) {
  const current = currentMph != null ? Number.parseInt(currentMph, 10) : null;
  const speedClass =
    current == null || Number.isNaN(current)
      ? ''
      : current > limitMph + 5
        ? 'sbn-nav-speed-now--over'
        : current > limitMph
          ? 'sbn-nav-speed-now--warn'
          : '';

  return (
    <div
      className="sbn-nav-speed"
      aria-label={
        currentMph
          ? `Speed limit ${limitMph} miles per hour, current speed ${currentMph}`
          : `Speed limit ${limitMph} miles per hour`
      }
    >
      <div className="sbn-nav-speed-sign">
        <p className="sbn-nav-speed-sign-label">Speed limit</p>
        <p className="sbn-nav-speed-sign-value">{limitMph}</p>
      </div>
      <div className={`sbn-nav-speed-now ${speedClass}`}>
        <p className="sbn-nav-speed-now-value">{currentMph ?? '—'}</p>
        <p className="sbn-nav-speed-now-unit">mph</p>
      </div>
    </div>
  );
}

function NavLoadingOverlay({ stage }: { stage: NavLoadingStage }) {
  const label =
    stage === 'locating' ? 'Getting your location…' : stage === 'routing' ? 'Finding route…' : 'Starting…';

  return (
    <div className="sbn-nav-loading-overlay pointer-events-none" role="status" aria-live="polite" aria-label={label}>
      <div className="sbn-nav-loading">
        <div className="sbn-nav-loading-spinner" aria-hidden />
        <p className="sbn-nav-loading-label">{label}</p>
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
  travelMode: NavTravelMode;
  onVoiceToggle: () => void;
  onOverview: () => void;
  onShare: () => void;
  onRecenter: () => void;
  onSettings: () => void;
  onExit: () => void;
  currentRoad?: string | null;
  exitLabel?: string;
  onOpenChat?: () => void;
  chatLabel?: string;
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
  travelMode,
  onVoiceToggle,
  onOverview,
  onShare,
  onRecenter,
  onSettings,
  onExit,
  currentRoad,
  exitLabel,
  onOpenChat,
  chatLabel = 'Message',
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
      className={`sbn-nav-sheet relative z-30 flex flex-col w-full ${
        expanded ? 'is-expanded' : ''
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

      <div className="sbn-nav-sheet-body">
        <div className="sbn-nav-sheet-summary">
          <button
            type="button"
            onClick={() => onSnapChange(expanded ? 'collapsed' : 'expanded')}
            className="sbn-nav-sheet-expand shrink-0"
            aria-label={expanded ? 'Collapse route details' : 'Expand route details'}
          >
            <ChevronUp className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          <div className="sbn-nav-sheet-summary__copy">
            <p className="flex items-baseline gap-2 min-w-0">
              <span className="sbn-nav-sheet-eta shrink-0">
                {arrived ? 'Arrived' : formatNavDuration(remainingSeconds)}
              </span>
              <span className="text-xs font-medium tabular-nums truncate text-[var(--sbn-nav-text-secondary)]">
                {formatNavDistance(remainingMeters)} · {formatArrivalTime(remainingSeconds)}
              </span>
            </p>
            <p className="text-[12px] truncate mt-0.5 font-semibold text-[var(--sbn-nav-text)]">
              {destinationLabel}
            </p>
            {currentRoad && currentRoad !== destinationLabel ? (
              <p className="sbn-nav-sheet-road text-[11px] truncate mt-0.5 text-[var(--sbn-nav-text-secondary)]">
                {currentRoad}
              </p>
            ) : null}
            {gpsAccuracy != null && gpsAccuracy > 35 && !arrived && (
              <p className="text-[10px] text-[var(--sbn-nav-warning)] mt-1 truncate">
                GPS weak — ±{Math.round(gpsAccuracy)}m
              </p>
            )}
          </div>

          <div className="sbn-nav-sheet-summary__actions">
            {onOpenChat ? (
              <button type="button" onClick={onOpenChat} className="sbn-nav-exit-btn" title={chatLabel}>
                Message
              </button>
            ) : null}
            <button type="button" onClick={onExit} className="sbn-nav-exit-btn">
              {exitLabel ?? (arrived ? 'Done' : 'Exit')}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-[var(--sbn-nav-glass-border)] px-4 pb-4">
          <div className="flex items-center justify-center gap-2 py-3">
            <button type="button" onClick={onOverview} className="sbn-nav-sheet-action" aria-label="See full route" title="See full route">
              <MapIcon className="w-4 h-4" />
            </button>
            <button type="button" onClick={onVoiceToggle} className="sbn-nav-sheet-action" aria-label={voiceOn ? 'Mute voice' : 'Enable voice'} title={voiceOn ? 'Mute' : 'Voice on'}>
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button type="button" onClick={onRecenter} className="sbn-nav-sheet-action" aria-label="Center on you" title="Center on you">
              <LocateFixed className="w-4 h-4" />
            </button>
            <button type="button" onClick={onSettings} className="sbn-nav-sheet-action" aria-label="Navigation settings" title="Settings">
              <Settings2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={onShare} className="sbn-nav-sheet-action" aria-label="Share trip" title="Share trip">
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <div className="py-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--sbn-nav-text-secondary)]">Trip summary</h3>
            <p className="text-sm mt-1 text-[var(--sbn-nav-text-secondary)]">
              {formatNavDistance(route.distanceMeters)} total · {formatNavDuration(route.durationSeconds)} {travelModeGerund(travelMode)}
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

function createNavUserIcon(heading: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="sbn-nav-user-puck" style="transform: rotate(${heading}deg)"><span class="sbn-nav-user-puck-glow"></span><span class="sbn-nav-user-puck-dot"></span><span class="sbn-nav-user-puck-chevron"></span></div>`,
    className: 'nav-user-marker',
    iconSize: [56, 56],
    iconAnchor: [28, 36],
  });
}

function gpsFollowZoom(mode: NavTravelMode): number {
  if (mode === 'walking') return 18;
  if (mode === 'cycling') return 17;
  return 17;
}

/** Always paint the remaining path in GPS follow — clip far ahead so the line stays readable. */
const GPS_LOOKAHEAD_METERS = 4500;

type RoutePolylineHandles = {
  traveledCasing: L.Polyline | null;
  traveled: L.Polyline | null;
  remainingCasing: L.Polyline | null;
  remaining: L.Polyline | null;
};

function emptyRouteHandles(): RoutePolylineHandles {
  return { traveledCasing: null, traveled: null, remainingCasing: null, remaining: null };
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
    handles[key]!.setStyle(style);
    return;
  }

  handles[key] = L.polyline(latlngs, style).addTo(layer);
}

/** Update route geometry in place so tiles are not restarted every GPS tick. */
function updateRoutePolylines(
  layer: L.LayerGroup,
  handles: RoutePolylineHandles,
  traveled: [number, number][],
  remaining: [number, number][],
): void {
  upsertRoutePolyline(layer, handles, 'traveledCasing', traveled, ROUTE_LINE_TRAVELED_CASING);
  upsertRoutePolyline(layer, handles, 'traveled', traveled, ROUTE_LINE_TRAVELED);
  upsertRoutePolyline(layer, handles, 'remainingCasing', remaining, NAV_ROUTE_LINE_CASING);
  upsertRoutePolyline(layer, handles, 'remaining', remaining, NAV_ROUTE_LINE_MAIN);
}

/** Paint remaining from the puck: shrinks behind, extends a lookahead window ahead. */
function paintLiveRouteLine(
  layer: L.LayerGroup,
  handles: RoutePolylineHandles,
  coords: [number, number][],
  pos: LatLng,
  follow: boolean,
): void {
  if (coords.length < 2) return;
  if (follow) {
    const remaining = followRouteLine(coords, pos, GPS_LOOKAHEAD_METERS);
    updateRoutePolylines(layer, handles, [], remaining.length >= 2 ? remaining : []);
    return;
  }
  const split = splitRouteProgress(coords, pos);
  updateRoutePolylines(layer, handles, split.traveled, split.remaining);
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

/** True while we pan/zoom in code so Leaflet zoomstart does not drop follow-user. */
let programmaticNavCamera = false;

function withProgrammaticNavCamera(fn: () => void): void {
  programmaticNavCamera = true;
  try {
    fn();
  } finally {
    window.setTimeout(() => {
      programmaticNavCamera = false;
    }, 360);
  }
}

function readNavChromeFlags(): { compact: boolean; narrow: boolean } {
  if (typeof window === 'undefined') return { compact: false, narrow: false };
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const width = viewport?.width ?? window.innerWidth;
  return {
    compact: height <= 640 || width > height + 48,
    narrow: width <= 400,
  };
}

/** Pixel offset so the user sits in the visible map hole between banner and sheet. */
function visibleMapCenterOffsetPx(map: L.Map): { x: number; y: number } {
  const size = map.getSize();
  if (size.x <= 0 || size.y <= 0) return { x: 0, y: 0 };
  const mapRect = map.getContainer().getBoundingClientRect();
  let top = 0;
  let bottom = 0;
  for (const id of ['nav_top_stack', 'nav_instruction_banner', 'nav_details_sheet']) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.bottom <= mapRect.top || rect.top >= mapRect.bottom) continue;
    const fromTop = rect.bottom - mapRect.top;
    const fromBottom = mapRect.bottom - rect.top;
    if (rect.top <= mapRect.top + 8) {
      top = Math.max(top, fromTop);
    } else if (rect.bottom >= mapRect.bottom - 8) {
      bottom = Math.max(bottom, fromBottom);
    }
  }
  const usable = Math.max(80, size.y - top - bottom);
  const visibleMidY = top + usable / 2;
  return { x: 0, y: size.y / 2 - visibleMidY };
}

/** Keep the puck in the visible map hole; GPS follow sits lower so more road is ahead. */
function centerMapOnUser(map: L.Map, center: LatLng, zoom: number, gpsAhead = false): void {
  if (!map.getContainer()?.isConnected) return;

  const mapSize = map.getSize();
  if (mapSize.x <= 0 || mapSize.y <= 0) {
    withProgrammaticNavCamera(() => {
      map.setView([center.lat, center.lng], zoom, { animate: false });
    });
    return;
  }

  try {
    const offset = visibleMapCenterOffsetPx(map);
    if (gpsAhead) {
      offset.y += Math.round(mapSize.y * 0.16);
    }
    const targetPoint = map.project([center.lat, center.lng], zoom);
    const shiftedCenter = map.unproject(L.point(targetPoint.x + offset.x, targetPoint.y + offset.y), zoom);
    withProgrammaticNavCamera(() => {
      if (map.getZoom() !== zoom) {
        map.setView(shiftedCenter, zoom, { animate: false });
        return;
      }
      map.panTo(shiftedCenter, { animate: false, noMoveStart: true });
    });
  } catch (error) {
    console.warn('Could not center navigation map on user:', error);
    withProgrammaticNavCamera(() => {
      map.setView([center.lat, center.lng], zoom, { animate: false });
    });
  }
}

function resetMapBearing(map: L.Map | null): void {
  const pane = map?.getPane('mapPane');
  if (!pane) return;
  pane.style.transform = '';
  pane.style.transformOrigin = '';
}

function applyHeadingUpRotation(
  rotator: HTMLElement | null,
  map: L.Map | null,
  center: LatLng,
  heading: number,
  northUp: boolean,
): void {
  if (!rotator) return;
  if (northUp || !map) {
    rotator.style.transform = '';
    rotator.style.transformOrigin = '50% 50%';
    return;
  }

  try {
    const point = map.latLngToContainerPoint([center.lat, center.lng]);
    rotator.style.transformOrigin = `${point.x}px ${point.y}px`;
    rotator.style.transform = `rotateX(48deg) rotate(${-heading}deg) scale(1.72)`;
  } catch (error) {
    console.warn('Could not rotate navigation map:', error);
    rotator.style.transform = '';
    rotator.style.transformOrigin = '50% 50%';
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
  tripLock = false,
  onOpenChat,
  chatLabel = 'Message',
  embedded = false,
}: MapNavigationViewProps) {
  const { theme } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRotatorRef = useRef<HTMLDivElement | null>(null);
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
  const lastAppliedRotationRef = useRef(0);
  const settingsRef = useRef<NavigationSettings>(readNavigationSettings());
  const handleGpsUpdateRef = useRef<(position: GeolocationPosition) => void>(() => undefined);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;

  const NAV_GPS_FOLLOW_METERS_DRIVING = 4;
  const NAV_GPS_FOLLOW_METERS_WALK_BIKE = 2;
  const NAV_UI_TICK_MS = 450;
  const NAV_MAP_SYNC_MS = 90;
  const NAV_ROUTE_DRAW_MIN_METERS = 10;
  const NAV_ROUTE_DRAW_MIN_MS = 900;
  const NAV_HEADING_ICON_DEG = 18;
  const NAV_MAP_ROTATE_DEG = 10;
  const NAV_DISPLAY_SMOOTH_ALPHA = 0.58;
  const NAV_OFF_ROUTE_THRESHOLD_M = 55;
  const NAV_OFF_ROUTE_EVAL_MS = 900;
  const NAV_OFF_ROUTE_TICKS = 4;
  const NAV_ARRIVE_DEST_M = 40;
  const NAV_ARRIVE_REMAINING_M = 40;
  /** Drop only ancient cached samples. Do not require a "fresh" fix first —
   *  some WebViews stamp every update several seconds in the past, which used
   *  to freeze the puck and remaining distance. */
  const NAV_STALE_GPS_MS = 60_000;
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
  const [voiceOn, setVoiceOn] = useState(() => readNavigationSettings().voiceEnabled);
  const [arrived, setArrived] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [sheetSnap, setSheetSnap] = useState<NavSheetSnap>('collapsed');
  const [navSettings, setNavSettings] = useState<NavigationSettings>(() => readNavigationSettings());
  settingsRef.current = navSettings;
  // Heading is only the settings on/off. On = map follows the phone. Off = north-up.
  // Panning/overview also forces north-up until Recenter restores follow.
  const northUp = !navSettings.headingUp || !followUser;
  const northUpRef = useRef(northUp);
  northUpRef.current = northUp;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [osmLanes, setOsmLanes] = useState<NavLane[] | null>(null);
  const osmLanesRef = useRef<NavLane[] | null>(null);
  osmLanesRef.current = osmLanes;
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voicePhrase, setVoicePhrase] = useState('');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [offRouteMeters, setOffRouteMeters] = useState(0);

  destinationRef.current = destination;
  destinationLabelRef.current = destinationLabel;
  routeRef.current = route;
  voiceOnRef.current = voiceOn;

  // Landscape phones (and any short window) leave very little vertical room between
  // the instruction banner and the details sheet. Below this threshold we switch to a
  // more compact banner and lay the floating controls out as a row instead of a
  // column so nothing gets clipped by or overlaps the sheet.
  const [isCompact, setIsCompact] = useState(() => readNavChromeFlags().compact);
  const [isNarrow, setIsNarrow] = useState(() => readNavChromeFlags().narrow);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const flags = readNavChromeFlags();
      setIsCompact(flags.compact);
      setIsNarrow(flags.narrow);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
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

  const displayedGuidance = useMemo(
    () =>
      getDisplayedNavGuidance({
        route,
        stepIndex,
        arrived,
        destinationLabel,
        userPos: logicPosRef.current,
        travelMode: navSettings.travelMode,
        showLaneGuidance: navSettings.showLaneGuidance,
        osmLanes,
      }),
    [route, stepIndex, arrived, destinationLabel, userPos, navSettings.travelMode, navSettings.showLaneGuidance, osmLanes],
  );

  const distanceToManeuver = displayedGuidance.distanceMeters;

  const remainingMeters = useMemo(() => {
    if (!route) return 0;
    return remainingRouteMeters(route.coords, logicPosRef.current);
  }, [route, userPos, stepIndex, arrived]);

  const remainingSeconds = useMemo(() => {
    if (!route || route.distanceMeters <= 0 || arrived) return 0;
    const ratio = Math.min(1, remainingMeters / route.distanceMeters);
    return Math.max(0, Math.round(route.durationSeconds * ratio));
  }, [route, remainingMeters, arrived]);

  const speakGuidanceCard = useCallback(
    (
      key: string,
      extra?: {
        prefix?: string;
        route?: NavigationRouteResult | null;
        stepIndex?: number;
        arrived?: boolean;
        userPos?: LatLng;
      },
    ) => {
      const settings = settingsRef.current;
      const route = extra?.route ?? routeRef.current;
      const stepIndex = extra?.stepIndex ?? stepIndexRef.current;
      const guidance = getDisplayedNavGuidance({
        route,
        stepIndex,
        arrived: extra?.arrived ?? arrivedRef.current,
        destinationLabel: destinationLabelRef.current,
        userPos: extra?.userPos ?? logicPosRef.current,
        travelMode: settings.travelMode,
        showLaneGuidance: settings.showLaneGuidance,
        osmLanes: osmLanesRef.current,
      });
      voiceRef.current.speak(buildDisplayedGuidanceVoice({ guidance, prefix: extra?.prefix }), key);
      if (!guidance.arrived && guidance.cueStep) {
        voiceRef.current.markSpoken(
          distanceCueKeysForStep(
            stepIndex,
            guidance.cueStep.distanceMeters,
            guidance.distanceMeters,
            voiceCueThresholdsForMode(settings.travelMode),
          ),
        );
      }
    },
    [],
  );

  const loadRoute = useCallback(async (from: LatLng, to: LatLng, isReroute = false) => {
    const requestId = ++routeRequestIdRef.current;
    const result = await fetchNavigationRoute(from, to, settingsRef.current.travelMode);
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
      speakGuidanceCard(`reroute-done-${requestId}`, {
        prefix: 'Route updated',
        route: result,
        stepIndex: 0,
        arrived: false,
        userPos: from,
      });
    }

    return result;
  }, [speakGuidanceCard]);

  const fitRouteOverview = useCallback((options?: { force?: boolean }) => {
    const map = mapRef.current;
    const mapEl = mapContainerRef.current;
    const activeRoute = routeRef.current;
    if (!map || !mapEl || !activeRoute?.coords || activeRoute.coords.length < 2) return;
    if (!options?.force && routeOverviewLockedRef.current) return;
    if (!options?.force && followUserRef.current) return;

    const sheet = document.getElementById('nav_details_sheet');
    const banner = document.getElementById('nav_top_stack') ?? document.getElementById('nav_instruction_banner');
    const padding = measureMapFitPadding({
      mapElement: mapEl,
      obstructingElements: [sheet, banner],
      defaults: { top: 88, bottom: 120, left: 28, right: 28 },
      margin: 16,
    });

    isProgrammaticMapMoveRef.current = true;
    map.invalidateSize({ animate: false });
    const dest = destinationRef.current;
    fitRoutePreviewToViewport({
      map,
      routeCoords: activeRoute.coords,
      end: dest,
      padding,
      maxZoom: 15,
      minZoom: 9,
    });
    window.setTimeout(() => {
      isProgrammaticMapMoveRef.current = false;
    }, 360);
  }, []);

  useEffect(() => {
    voiceRef.current.prime();
    voiceRef.current.setEnabled(readNavigationSettings().voiceEnabled);

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
        void requestWakeLock();
        touchActiveNavSession();
        voiceRef.current.unlock();
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
    return subscribeNavigationSettings((next) => {
      settingsRef.current = next;
      setNavSettings(next);
      setVoiceOn(next.voiceEnabled);
      voiceRef.current.setEnabled(next.voiceEnabled);
    });
  }, []);

  useEffect(() => {
    const destPart = `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
    const destKey = `${destPart}:${navSettings.travelMode}`;
    if (routeFetchedForDestRef.current === destKey && routeRef.current) {
      setLoading(false);
      setLoadingStage('ready');
      return;
    }
    const previousKey = routeFetchedForDestRef.current;
    const switchingMode =
      !!previousKey &&
      previousKey.startsWith(`${destPart}:`) &&
      previousKey !== destKey &&
      !!routeRef.current;
    routeFetchedForDestRef.current = destKey;

    let cancelled = false;
    setError(null);
    if (!switchingMode) {
      routeAnnouncedRef.current = false;
      arrivedRef.current = false;
      setArrived(false);
    }

    const from = userPosRef.current;
    const prefetch = initialRouteRef.current;
    const prefetchOrigin = prefetch?.coords?.[0];
    const prefetchStillFresh =
      !!prefetch &&
      !!prefetchOrigin &&
      (prefetch.travelMode ?? 'driving') === navSettings.travelMode &&
      haversineMeters(from, { lat: prefetchOrigin[0], lng: prefetchOrigin[1] }) <= NAV_INITIAL_ROUTE_FRESH_M;

    // Use a fresh prefetch as a fast placeholder, but always refetch from the
    // current GPS fix so session restore / backgrounding don't keep a stale path.
    if (prefetchStillFresh) {
      setRoute(prefetch);
      setLoading(false);
      setLoadingStage('ready');
    } else if (!routeRef.current) {
      setLoading(true);
      setLoadingStage('locating');
    }

    const locateTimer = window.setTimeout(() => {
      if (!cancelled && !prefetchStillFresh) setLoadingStage('routing');
    }, 450);

    void loadRoute(from, destination, switchingMode).then((result) => {
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
            : 'Could not load directions. Our routing service may be busy — try again shortly.',
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
  }, [destination.lat, destination.lng, loadRoute, navSettings.travelMode]);

  useEffect(() => {
    if (!route || routeAnnouncedRef.current || !voiceOn) return;
    routeAnnouncedRef.current = true;
    const settings = settingsRef.current;
    const guidance = getDisplayedNavGuidance({
      route,
      stepIndex: 0,
      arrived: false,
      destinationLabel,
      userPos: logicPosRef.current,
      travelMode: settings.travelMode,
      showLaneGuidance: settings.showLaneGuidance,
      osmLanes: osmLanesRef.current,
    });
    voiceRef.current.speak(
      buildStartBriefingVoice({
        startMessage: navigationStartMessage ?? `Starting navigation to ${destinationLabel}`,
        destinationLabel,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        travelVerb: travelModeVerb(settings.travelMode),
        guidance,
      }),
      'nav-start',
    );
    if (guidance.cueStep) {
      voiceRef.current.markSpoken(
        distanceCueKeysForStep(
          0,
          guidance.cueStep.distanceMeters,
          guidance.distanceMeters,
          voiceCueThresholdsForMode(settings.travelMode),
        ),
      );
    }
    for (const [index, message] of (navigationFollowUpMessages ?? []).entries()) {
      voiceRef.current.speak(message, `nav-followup-${index}`);
    }
  }, [route, destinationLabel, navigationStartMessage, navigationFollowUpMessages, voiceOn]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || mapBootstrappedRef.current) return;
    mapBootstrappedRef.current = true;

    const dest = destinationRef.current;
    const start = initialOriginRef.current;
    const center = dest ?? start;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    }).setView([center.lat, center.lng], 13);

    const tileLayer = L.tileLayer(SBN_MAP_TILE_URL, SBN_MAP_TILE_OPTIONS).addTo(map);
    tileLayerRef.current = tileLayer;

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;
    routePolylineHandlesRef.current = emptyRouteHandles();
    mapRef.current = map;

    const debouncedInvalidate = debounceMapInvalidate(map);

    const onUserMapInteraction = () => {
      if (programmaticNavCamera || isProgrammaticMapMoveRef.current) return;
      routeOverviewLockedRef.current = true;
      followUserRef.current = false;
      setFollowUser(false);
      applyHeadingUpRotation(mapRotatorRef.current, map, userPosRef.current, headingRef.current, true);
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
            <div class="h-9 w-9 rounded-full bg-[var(--color-accent)] border-[3px] border-white shadow-[0_4px_16px_color-mix(in_srgb,var(--color-accent)_55%,transparent)] flex items-center justify-center">
              <div class="h-2.5 w-2.5 rounded-full bg-white"></div>
            </div>
            <div class="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[10px] border-l-transparent border-r-transparent border-t-[var(--color-accent)] -mt-0.5"></div>
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

      if (route.coords.length >= 2) {
        const initialHeading = bearingAlongRoute(route.coords, start);
        headingRef.current = initialHeading;
        lastAppliedRotationRef.current = initialHeading;
        lastMarkerHeadingRef.current = initialHeading;
        lastGpsPosRef.current = start;
        setHeading(initialHeading);
      }

      followUserRef.current = true;
      setFollowUser(true);
      routeOverviewLockedRef.current = false;
      applyHeadingUpRotation(
        mapRotatorRef.current,
        map,
        start,
        headingRef.current,
        !settingsRef.current.headingUp,
      );
      if (userMarkerRef.current) {
        const markerHeading = settingsRef.current.headingUp ? 0 : headingRef.current;
        userMarkerRef.current.setIcon(createNavUserIcon(markerHeading));
        lastMarkerHeadingRef.current = markerHeading;
      }
      window.requestAnimationFrame(() => {
        const live = mapRef.current;
        if (!live) return;
        centerMapOnUser(
          live,
          start,
          gpsFollowZoom(settingsRef.current.travelMode),
          settingsRef.current.headingUp,
        );
        applyHeadingUpRotation(
          mapRotatorRef.current,
          live,
          start,
          headingRef.current,
          !settingsRef.current.headingUp,
        );
      });
    }
  }, [route, destination]);

  useEffect(() => {
    const marker = destMarkerRef.current;
    if (!marker) return;
    const showPin = !followUser || arrived || remainingMeters <= 420;
    marker.setOpacity(showPin ? 1 : 0);
  }, [followUser, arrived, remainingMeters, route]);

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
      Math.abs(headingDeltaDegrees(lastMarkerHeadingRef.current, markerHeading)) >= NAV_HEADING_ICON_DEG;

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
    const followMeters =
      settingsRef.current.travelMode === 'driving' ? NAV_GPS_FOLLOW_METERS_DRIVING : NAV_GPS_FOLLOW_METERS_WALK_BIKE;
    const movedEnough = !last || haversineMeters(last, next) >= followMeters;
    const now = Date.now();
    const rotationDelta = Math.abs(headingDeltaDegrees(lastAppliedRotationRef.current, nextHeading));
    const shouldRotate = !northUpRef.current && (movedEnough || rotationDelta >= NAV_MAP_ROTATE_DEG);

    if (!movedEnough) {
      if (shouldRotate) {
        lastBearingApplyRef.current = now;
        lastAppliedRotationRef.current = nextHeading;
        applyHeadingUpRotation(mapRotatorRef.current, map, next, nextHeading, false);
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
      centerMapOnUser(
        liveMap,
        target,
        Math.max(liveMap.getZoom(), gpsFollowZoom(settingsRef.current.travelMode)),
        !northUpRef.current,
      );
      lastAppliedRotationRef.current = headingRef.current;
      applyHeadingUpRotation(mapRotatorRef.current, liveMap, target, headingRef.current, northUpRef.current);
    });
  }, []);

  useEffect(() => {
    if (!route || !routeLayerRef.current || loading) return;

    const pos = displayedPosRef.current ?? logicPosRef.current;
    const follow = followUserRef.current;
    if (!follow) {
      const now = Date.now();
      const lastDraw = lastRouteDrawRef.current;
      const moved = lastDraw ? haversineMeters({ lat: lastDraw.lat, lng: lastDraw.lng }, pos) : Infinity;
      if (lastDraw && moved < NAV_ROUTE_DRAW_MIN_METERS && now - lastDraw.at < NAV_ROUTE_DRAW_MIN_MS) {
        return;
      }
      lastRouteDrawRef.current = { lat: pos.lat, lng: pos.lng, at: now };
    }

    paintLiveRouteLine(
      routeLayerRef.current,
      routePolylineHandlesRef.current,
      route.coords,
      pos,
      follow,
    );
  }, [route, userPos, loading, followUser]);

  const handleGpsUpdate = useCallback(
    (position: GeolocationPosition) => {
      setGpsError(null);

      if (geolocationAgeMs(position) > NAV_STALE_GPS_MS) return;

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

      if (followUserRef.current && activeRoute && routeLayerRef.current && !arrivedRef.current) {
        paintLiveRouteLine(
          routeLayerRef.current,
          routePolylineHandlesRef.current,
          activeRoute.coords,
          displayPos,
          true,
        );
      }

      const dest = destinationRef.current;

      let nextHeading = resolveNavHeading({
        previous: headingRef.current,
        lastPosition: lastGpsPosRef.current,
        currentPosition: snapped,
        routeCoords: activeRoute?.coords,
        offRouteMeters: offRouteDistance,
      });
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
          speedMph: position.coords.speed != null ? Number(formatSpeedMph(position.coords.speed)) || null : null,
          etaSeconds,
          distanceMeters: remainingAlongRoute,
          arrived: hasArrived,
        });
      }

      if (hasArrived && !arrivedRef.current) {
        arrivedRef.current = true;
        setArrived(true);
        if (voiceOnRef.current) {
          speakGuidanceCard('arrival', {
            arrived: true,
            route: activeRoute,
            userPos: snapped,
          });
        }
        return;
      }

      if (activeRoute && !arrivedRef.current) {
        const nextIdx = findCurrentStepIndex(activeRoute.steps, snapped, stepIndexRef.current, {
          coords: activeRoute.coords,
          distanceMeters: activeRoute.distanceMeters,
        });
        let spokeStepChange = false;
        if (nextIdx !== stepIndexRef.current) {
          stepIndexRef.current = nextIdx;
          setStepIndex(nextIdx);
          if (voiceOnRef.current && activeRoute.steps[nextIdx]) {
            speakGuidanceCard(`step-change-${nextIdx}`, {
              route: activeRoute,
              stepIndex: nextIdx,
              userPos: snapped,
            });
            spokeStepChange = true;
          }
        }

        const settings = settingsRef.current;
        const cueThresholds = voiceCueThresholdsForMode(settings.travelMode);
        if (voiceOnRef.current && !spokeStepChange) {
          const guidance = getDisplayedNavGuidance({
            route: activeRoute,
            stepIndex: stepIndexRef.current,
            arrived: false,
            destinationLabel: destinationLabelRef.current,
            userPos: snapped,
            travelMode: settings.travelMode,
            showLaneGuidance: settings.showLaneGuidance,
            osmLanes: osmLanesRef.current,
          });
          if (guidance.cueStep && guidance.cueStep.maneuverType !== 'arrive') {
            for (const kind of ['far', 'medium', 'near', 'now'] as const) {
              if (shouldFireVoiceCue(guidance.cueStep.distanceMeters, guidance.distanceMeters, kind, cueThresholds)) {
                voiceRef.current.speak(
                  buildDisplayedGuidanceVoice({ guidance }),
                  `cue-${stepIndexRef.current}-${kind}`,
                );
                break;
              }
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
                voiceRef.current.speak('Recalculating route.', rerouteKey);
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
    [loadRoute, speakGuidanceCard, syncNavigationMap],
  );

  handleGpsUpdateRef.current = handleGpsUpdate;

  useEffect(() => {
    if (isPlayStoreDemo()) return undefined;
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
      if (next) {
        voiceRef.current.unlock();
        speakGuidanceCard(`voice-on-${Date.now()}`, { prefix: 'Voice guidance on' });
      }
      writeNavigationSettings({ voiceEnabled: next });
      return next;
    });
  };

  const speakRecenterCue = () => {
    const settings = settingsRef.current;
    if (!settings.voiceEnabled || !settings.speakOnRecenter) return;
    voiceRef.current.unlock();
    voiceRef.current.setEnabled(true);
    speakGuidanceCard(`recenter-${Date.now()}`, { prefix: 'Centered on you' });
  };

  const handleRecenter = () => {
    setFollowUser(true);
    followUserRef.current = true;
    routeOverviewLockedRef.current = false;
    const headingUp = settingsRef.current.headingUp;
    lastNavPanRef.current = null;
    lastRouteDrawRef.current = null;
    const pos = userPosRef.current;
    const map = mapRef.current;
    if (!map) return;
    centerMapOnUser(map, pos, gpsFollowZoom(settingsRef.current.travelMode), headingUp);
    applyHeadingUpRotation(mapRotatorRef.current, map, pos, headingRef.current, !headingUp);
    if (userMarkerRef.current) {
      const markerHeading = headingUp ? 0 : headingRef.current;
      userMarkerRef.current.setIcon(createNavUserIcon(markerHeading));
      lastMarkerHeadingRef.current = markerHeading;
    }
    speakRecenterCue();
  };

  const handleOverview = () => {
    setFollowUser(false);
    followUserRef.current = false;
    const map = mapRef.current;
    if (!map) return;
    applyHeadingUpRotation(mapRotatorRef.current, map, userPosRef.current, headingRef.current, true);
    resetMapBearing(map);
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(createNavUserIcon(headingRef.current));
      lastMarkerHeadingRef.current = headingRef.current;
    }
    routeOverviewLockedRef.current = false;
    lastRouteDrawRef.current = null;
    fitRouteOverview({ force: true });
  };

  const handleShareTrip = async () => {
    const summary = `${formatNavDuration(remainingSeconds)} · ${formatNavDistance(remainingMeters)} to ${destinationLabel}`;
    const mapsUrl = googleMapsDirectionsUrl(destination, userPosRef.current, navSettings.travelMode);
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
    if (tripLock) {
      onExit();
      return;
    }
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
        setError('Could not load directions. Try again in a moment.');
        setLoading(false);
        return;
      }
      setLoading(false);
    });
  };

  const showFatalError = Boolean(error && !route);
  const maneuverKind = displayedGuidance.maneuverKind;
  const bannerStreet = displayedGuidance.street;
  const bannerInstruction = displayedGuidance.instruction;
  const currentRoadLabel = displayedGuidance.currentRoad;
  const thenLine = displayedGuidance.thenLine;
  const displayLanes = displayedGuidance.lanes;
  const speedLimitMph = estimateSpeedLimitMph(displayedGuidance.currentStep ?? displayedGuidance.cueStep);
  const showSpeedCard = navSettings.travelMode === 'driving';

  useEffect(() => {
    const map = mapRef.current;
    const pos = userPosRef.current;
    if (!map || !followUserRef.current) return;
    applyHeadingUpRotation(mapRotatorRef.current, map, pos, headingRef.current, northUp);
    if (userMarkerRef.current) {
      const markerHeading = northUp ? headingRef.current : 0;
      userMarkerRef.current.setIcon(createNavUserIcon(markerHeading));
      lastMarkerHeadingRef.current = markerHeading;
    }
  }, [northUp]);

  useEffect(() => {
    if (!followUser || !route) return;
    const map = mapRef.current;
    if (!map) return;
    const frame = window.requestAnimationFrame(() => {
      const live = mapRef.current;
      if (!live || !followUserRef.current) return;
      syncNavigationMap(userPosRef.current, headingRef.current);
      centerMapOnUser(
        live,
        userPosRef.current,
        gpsFollowZoom(settingsRef.current.travelMode),
        !northUpRef.current,
      );
      applyHeadingUpRotation(mapRotatorRef.current, live, userPosRef.current, headingRef.current, northUpRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [followUser, route, sheetSnap, isCompact, syncNavigationMap]);

  useEffect(() => {
    if (navSettings.travelMode !== 'driving' || !navSettings.showLaneGuidance) {
      setOsmLanes(null);
      return;
    }
    const step = displayedGuidance.cueStep ?? displayedGuidance.currentStep;
    if (!step || (step.lanes && step.lanes.length > 0) || maneuverKind === 'arrive') {
      setOsmLanes(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    void fetchOsmLanes(step.location, controller.signal, step.name).then((lanes) => {
      if (!cancelled) setOsmLanes(lanes);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [navSettings.travelMode, navSettings.showLaneGuidance, displayedGuidance.cueStep, displayedGuidance.currentStep, maneuverKind]);

  return (
    <div
      className={`${embedded ? 'absolute inset-0 z-10 h-full w-full' : 'fixed inset-0 z-[200]'} flex flex-col sbn-nav--${theme}${isCompact ? ' sbn-nav-compact' : ''}${isNarrow ? ' sbn-nav-narrow' : ''}${followUser ? ' sbn-nav--follow' : ''}${followUser && navSettings.headingUp ? ' sbn-nav--gps' : ''}`}
      id="map_navigation_view"
      style={{ background: 'var(--sbn-nav-bg)' }}
      onPointerDown={() => voiceRef.current.unlock()}
    >
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="sbn-nav-map-stage">
          <div ref={mapRotatorRef} className="sbn-nav-map-rotator">
            <div ref={mapContainerRef} className="sbn-nav-map-canvas" />
          </div>
        </div>

        {loading && !route && <NavLoadingOverlay stage={loadingStage} />}

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
                <button type="button" onClick={() => openDrivingDirections(destination, origin, navSettings.travelMode)} className="sbn-nav-secondary-btn">
                  Open in Apple / Google Maps
                </button>
                <button type="button" onClick={handleExit} className="sbn-nav-tertiary-btn">
                  {tripLock ? 'Cancel pickup' : 'Back to map'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="sbn-nav-chrome">
          <div id="nav_top_stack" className="pointer-events-auto sbn-nav-top-stack">
            <div
              id="nav_instruction_banner"
              className={`sbn-nav-banner ${isCompact ? 'sbn-nav-banner-compact' : ''}`}
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className="sbn-nav-banner-row">
                <div className="sbn-nav-banner-icon">
                  {loading ? (
                    <div className="sbn-nav-banner-shimmer" aria-hidden />
                  ) : (
                    <NavManeuverShield kind={maneuverKind} className={isCompact ? 'w-10 h-10' : 'w-12 h-12'} />
                  )}
                </div>
                <div className="sbn-nav-banner-copy">
                  {loading ? (
                    <>
                      <p className="sbn-nav-banner-distance">Routing</p>
                      <p className="sbn-nav-banner-instruction">To {destinationLabel}</p>
                    </>
                  ) : arrived ? (
                    <>
                      <p className="sbn-nav-banner-distance">Arrived</p>
                      <p className="sbn-nav-banner-instruction">{destinationLabel}</p>
                    </>
                  ) : (
                    <>
                      <p className="sbn-nav-banner-distance">{formatNavDistance(distanceToManeuver)}</p>
                      <p className="sbn-nav-banner-instruction">{bannerInstruction ?? bannerStreet}</p>
                      {thenLine ? <p className="sbn-nav-banner-then">{thenLine}</p> : null}
                    </>
                  )}
                </div>
              </div>

              {!loading && route && (rerouting || offRouteMeters > NAV_OFF_ROUTE_THRESHOLD_M) && !arrived && (
                <p className="mt-2 text-xs font-semibold text-[var(--sbn-nav-warning)]">
                  {rerouting ? 'Recalculating…' : 'Head back toward the next turn'}
                </p>
              )}

              {!loading && !arrived && (
                <NavLaneGuidance lanes={displayLanes} maneuverKind={maneuverKind} />
              )}
            </div>
            {!loading && route && !arrived && (
              <div id="nav_mode_switcher" className="sbn-nav-mode-bar">
                <NavTravelModeSwitcher
                  variant="nav"
                  value={navSettings.travelMode}
                  onChange={(mode) => writeNavigationSettings({ travelMode: mode })}
                />
              </div>
            )}
            <VoiceStatusBar phrase={voicePhrase} visible={voiceSpeaking && voiceOn} />
          </div>

          <div className="sbn-nav-map-hud">
            {gpsError && !showFatalError && (
              <div className="sbn-nav-gps-toast pointer-events-none">{gpsError}</div>
            )}
            {!loading && route && sheetSnap === 'collapsed' && (
                <>
                  {followUser && currentRoadLabel && !arrived ? (
                    <div className="sbn-nav-street-chip" aria-live="polite">
                      {currentRoadLabel}
                    </div>
                  ) : null}
                  {showSpeedCard && (
                    <div className="sbn-nav-speed-dock">
                      <NavSpeedCard currentMph={speedMph} limitMph={speedLimitMph} />
                    </div>
                  )}

                  <div className="sbn-nav-fab-dock">
                    <button
                      type="button"
                      onClick={handleVoiceToggle}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''} ${voiceOn ? 'sbn-nav-fab-active' : ''} ${voiceSpeaking && voiceOn ? 'sbn-nav-fab-speaking' : ''}`}
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
                      onClick={handleOverview}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''} ${followUser ? '' : 'sbn-nav-fab-active'}`}
                      title="See full route"
                      aria-label="See full route"
                      aria-pressed={!followUser}
                    >
                      <MapIcon className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                    </button>
                    <button
                      type="button"
                      onClick={handleRecenter}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''} ${followUser ? '' : 'sbn-nav-fab-active'}`}
                      title="Resume GPS"
                      aria-label="Resume GPS"
                    >
                      <LocateFixed className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className={`sbn-nav-fab ${isCompact ? 'sbn-nav-fab-compact' : ''} ${settingsOpen ? 'sbn-nav-fab-active' : ''}`}
                      title="Navigation settings"
                      aria-label="Navigation settings"
                    >
                      <Settings2 className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />
                    </button>
                  </div>
                </>
            )}
          </div>

          {!loading && route && (
            <div className="sbn-nav-sheet-dock pointer-events-auto">
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
                travelMode={navSettings.travelMode}
                currentRoad={currentRoadLabel}
                onVoiceToggle={handleVoiceToggle}
                onOverview={handleOverview}
                onShare={() => void handleShareTrip()}
                onRecenter={handleRecenter}
                onSettings={() => setSettingsOpen(true)}
                onExit={handleExit}
                exitLabel={tripLock ? 'Cancel' : undefined}
                onOpenChat={onOpenChat}
                chatLabel={chatLabel}
              />
            </div>
          )}
        </div>
      </div>

      {settingsOpen && (
        <div className="sbn-nav-settings-overlay" role="dialog" aria-modal="true" aria-labelledby="nav_settings_title">
          <div className="sbn-nav-settings-card pointer-events-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 id="nav_settings_title" className="text-base font-display font-bold text-[var(--sbn-nav-text)]">
                Navigation settings
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="sbn-nav-sheet-action"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavigationSettingsForm
              variant="nav"
              settings={navSettings}
              onChange={(patch) => writeNavigationSettings(patch)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
