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
  Navigation,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LatLng } from '../lib/mapRoute';
import { haversineMeters, openDrivingDirections } from '../lib/mapRoute';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { touchActiveNavSession } from '../lib/navigationSession';
import {
  bearingDegrees,
  distanceToRouteMeters,
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

interface MapNavigationViewProps {
  origin: LatLng;
  destination: LatLng;
  destinationLabel: string;
  onExit: () => void;
}

const NAV_BRAND = '#FF4500';
const NAV_BRAND_LIGHT = '#FF6B2E';
const NAV_ROUTE_GLOW = 'rgba(255, 69, 0, 0.38)';

function LaneGuidanceStrip({ kind }: { kind: ManeuverIconKind }) {
  const activeIndices = useMemo(() => {
    switch (kind) {
      case 'left':
        return [0, 1];
      case 'slight-left':
        return [1];
      case 'right':
        return [3, 4];
      case 'slight-right':
        return [3];
      case 'uturn':
      case 'roundabout':
        return [0];
      case 'arrive':
        return [2];
      default:
        return [1, 2, 3];
    }
  }, [kind]);

  const iconForSlot = (index: number, active: boolean) => {
    const className = `w-4 h-4 ${active ? '' : 'opacity-90'}`;
    if (!active) return <ArrowUp className={className} strokeWidth={2.75} />;
    if (kind === 'left' || (kind === 'uturn' && index === 0)) {
      return <ArrowLeft className={className} strokeWidth={2.75} />;
    }
    if (kind === 'right') return <ArrowRight className={className} strokeWidth={2.75} />;
    if (kind === 'slight-left') return <CornerUpLeft className={className} strokeWidth={2.75} />;
    if (kind === 'slight-right') return <CornerUpRight className={className} strokeWidth={2.75} />;
    if (kind === 'roundabout') return <RotateCcw className={className} strokeWidth={2.75} />;
    if (kind === 'arrive') return <Navigation className={className} strokeWidth={2.75} />;
    return <ArrowUp className={className} strokeWidth={2.75} />;
  };

  return (
    <div className="sbn-nav-lane" aria-hidden>
      {Array.from({ length: 5 }, (_, index) => {
        const active = activeIndices.includes(index);
        return (
          <div key={index} className={`sbn-nav-lane-slot ${active ? 'sbn-nav-lane-slot-active' : ''}`}>
            {iconForSlot(index, active)}
          </div>
        );
      })}
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
      className={`sbn-nav-sheet absolute inset-x-0 bottom-0 z-30 flex flex-col safe-area-pb ${
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

          <div className="flex-1 min-w-0 text-center">
            <p className="text-[2rem] font-black text-accent leading-none tabular-nums font-display">
              {arrived ? '0 min' : formatNavDuration(remainingSeconds)}
            </p>
            <p className="text-sm text-zinc-300 font-medium mt-1 tabular-nums">
              {formatNavDistance(remainingMeters)} · {formatArrivalTime(remainingSeconds)}
            </p>
            {gpsAccuracy != null && gpsAccuracy > 35 && !arrived && (
              <p className="text-[10px] text-amber-400 mt-1">GPS weak — ±{Math.round(gpsAccuracy)}m</p>
            )}
          </div>

          <button type="button" onClick={onExit} className="sbn-nav-exit-btn shrink-0">
            {arrived ? 'Done' : 'Exit'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-white/8 px-4 pb-4">
          <div className="py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Trip summary</h3>
            <p className="text-sm text-zinc-300 mt-1">
              {formatNavDistance(route.distanceMeters)} total · {formatNavDuration(route.durationSeconds)} drive
            </p>
            <p className="text-sm font-semibold text-white mt-0.5 truncate">{destinationLabel}</p>
          </div>

          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pb-2 sticky top-0 bg-[#141416]">
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
                      isCurrent ? 'bg-accent text-on-accent' : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    <ManeuverIcon kind={kind} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${isCurrent ? 'font-bold text-white' : 'font-medium text-zinc-200'}`}>
                      {step.instruction}
                    </p>
                    {step.name ? (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{step.name}</p>
                    ) : null}
                    {step.distanceMeters > 0 && index < route.steps.length - 1 ? (
                      <p className="text-[11px] text-zinc-600 mt-1">{formatNavDistance(step.distanceMeters)}</p>
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
    html: `
      <div class="relative flex items-center justify-center" style="transform: rotate(${heading}deg)">
        <div class="h-[3.25rem] w-[3.25rem] rounded-full bg-white/95 shadow-[0_0_0_10px_rgba(255,255,255,0.18),0_4px_16px_rgba(0,0,0,0.45)] border-[3px] border-white flex items-center justify-center">
          <div class="w-0 h-0 border-l-[9px] border-r-[9px] border-b-[16px] border-l-transparent border-r-transparent border-b-[${NAV_BRAND}] -mt-0.5"></div>
        </div>
      </div>
    `,
    className: 'nav-user-marker',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

function drawRouteOnLayer(layer: L.LayerGroup, coords: [number, number][]): void {
  layer.clearLayers();
  L.polyline(coords, {
    color: NAV_ROUTE_GLOW,
    weight: 13,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(layer);
  L.polyline(coords, {
    color: NAV_BRAND_LIGHT,
    weight: 8,
    opacity: 0.98,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(layer);
  L.polyline(coords, {
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

export default function MapNavigationView({
  origin,
  destination,
  destinationLabel,
  onExit,
}: MapNavigationViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
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
  const handleGpsUpdateRef = useRef<(position: GeolocationPosition) => void>(() => undefined);

  const NAV_GPS_FOLLOW_METERS = 18;
  const NAV_UI_TICK_MS = 900;
  const NAV_HEADING_ICON_DEG = 12;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<NavigationRouteResult | null>(null);
  const [userPos, setUserPos] = useState<LatLng>(origin);
  const [heading, setHeading] = useState(0);
  const [speedMph, setSpeedMph] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  followUserRef.current = followUser;
  const [voiceOn, setVoiceOn] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [sheetSnap, setSheetSnap] = useState<NavSheetSnap>('collapsed');

  destinationRef.current = destination;
  destinationLabelRef.current = destinationLabel;
  routeRef.current = route;
  voiceOnRef.current = voiceOn;

  const currentStep: NavigationStep | undefined = route?.steps[stepIndex];

  const remainingMeters = useMemo(() => {
    if (!route) return 0;
    return remainingRouteMeters(route.coords, userPos);
  }, [route, userPos]);

  const remainingSeconds = useMemo(() => {
    if (!route || route.distanceMeters <= 0) return 0;
    const ratio = Math.min(1, remainingMeters / route.distanceMeters);
    return Math.max(60, Math.round(route.durationSeconds * ratio));
  }, [route, remainingMeters]);

  const distanceToManeuver = useMemo(() => {
    if (!route) return 0;
    const cueStep = getActiveVoiceCueStep(route.steps, stepIndex);
    if (!cueStep) return 0;
    return haversineMeters(userPos, cueStep.location);
  }, [route, stepIndex, userPos]);

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
      if (routeLayerRef.current) drawRouteOnLayer(routeLayerRef.current, result.coords);
    }

    return result;
  }, []);

  useEffect(() => {
    voiceRef.current.prime();
    voiceRef.current.setEnabled(true);

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
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
      voiceRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    routeAnnouncedRef.current = false;
    arrivedRef.current = false;
    setArrived(false);

    void loadRoute(origin, destination, false).then((result) => {
      if (cancelled) return;
      if (!result) {
        setError('Could not load driving directions. Try again in a moment.');
        setLoading(false);
        return;
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [origin, destination, loadRoute]);

  useEffect(() => {
    if (!route || routeAnnouncedRef.current || !voiceOn) return;
    routeAnnouncedRef.current = true;
    const departStep = route.steps.find((step) => step.maneuverType === 'depart') ?? route.steps[0];
    voiceRef.current.speak(`Starting navigation to ${destinationLabel}`, 'nav-start');
    if (departStep) {
      voiceRef.current.speak(departStep.instruction, 'nav-depart');
    }
    voiceRef.current.speak(
      buildRouteSummaryVoice(destinationLabel, route.distanceMeters, route.durationSeconds),
      'nav-summary',
    );
  }, [route, destinationLabel, voiceOn]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
    }).setView([origin.lat, origin.lng], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 3,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;
    mapRef.current = map;

    window.setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 200);

    return () => {
      if (navPanRafRef.current != null) {
        cancelAnimationFrame(navPanRafRef.current);
        navPanRafRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      destMarkerRef.current = null;
      userMarkerRef.current = null;
      hasFittedRouteRef.current = false;
    };
  }, [origin.lat, origin.lng]);

  useEffect(() => {
    if (!route || !mapRef.current || !routeLayerRef.current) return;

    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;

    drawRouteOnLayer(routeLayer, route.coords);

    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    } else {
      const destIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="h-5 w-5 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
          </div>
        `,
        className: 'nav-dest-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
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

  const syncNavigationMap = useCallback((next: LatLng, nextHeading: number) => {
    const map = mapRef.current;
    if (!map) return;

    headingRef.current = nextHeading;

    const headingChanged =
      !userMarkerRef.current ||
      Math.abs(((nextHeading - lastMarkerHeadingRef.current + 540) % 360) - 180) >= NAV_HEADING_ICON_DEG;

    try {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([next.lat, next.lng]);
        if (headingChanged) {
          lastMarkerHeadingRef.current = nextHeading;
          userMarkerRef.current.setIcon(createNavUserIcon(nextHeading));
        }
      } else {
        lastMarkerHeadingRef.current = nextHeading;
        userMarkerRef.current = L.marker([next.lat, next.lng], {
          icon: createNavUserIcon(nextHeading),
          zIndexOffset: 500,
        }).addTo(map);
      }
    } catch (error) {
      console.warn('Could not update navigation user marker:', error);
    }

    if (!followUserRef.current) return;

    const last = lastNavPanRef.current;
    if (last && haversineMeters(last, next) < NAV_GPS_FOLLOW_METERS) return;

    lastNavPanRef.current = next;
    pendingNavPanRef.current = next;
    if (navPanRafRef.current != null) return;

    navPanRafRef.current = requestAnimationFrame(() => {
      navPanRafRef.current = null;
      const target = pendingNavPanRef.current;
      const liveMap = mapRef.current;
      if (!target || !liveMap || !followUserRef.current) return;
      centerMapWithLookahead(liveMap, target, Math.max(liveMap.getZoom(), 17));
    });
  }, []);

  const handleGpsUpdate = useCallback(
    (position: GeolocationPosition) => {
      const next: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
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

      const activeRoute = routeRef.current;
      const dest = destinationRef.current;
      const destLabel = destinationLabelRef.current;

      let nextHeading = headingRef.current;
      if (position.coords.heading != null && !Number.isNaN(position.coords.heading) && position.coords.heading >= 0) {
        nextHeading = position.coords.heading;
      } else if (activeRoute) {
        const target = activeRoute.steps[stepIndexRef.current]?.location ?? dest;
        nextHeading = bearingDegrees(next, target);
      }
      if (shouldUpdateUi) {
        setHeading(nextHeading);
      }

      syncNavigationMap(next, nextHeading);

      const distToDest = haversineMeters(next, dest);
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
        const nextIdx = findCurrentStepIndex(activeRoute.steps, next, stepIndexRef.current);
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
    const unsubscribe = subscribeLiveGeolocation((position) => {
      handleGpsUpdateRef.current(position);
    });

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
    lastNavPanRef.current = null;
    const pos = userPosRef.current;
    const map = mapRef.current;
    if (!map) return;
    centerMapWithLookahead(map, pos, 17);
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(createNavUserIcon(headingRef.current));
    }
  };

  const handleOverview = () => {
    setFollowUser(false);
    followUserRef.current = false;
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setIcon(createNavUserIcon(headingRef.current));
    }
    if (route) {
      map.fitBounds(route.coords, { padding: [90, 90], maxZoom: 15, animate: false });
    }
  };

  const handleExit = () => {
    voiceRef.current.cancel();
    void wakeLockRef.current?.release();
    onExit();
  };

  const handleRetryRoute = () => {
    setLoading(true);
    setError(null);
    routeAnnouncedRef.current = false;
    void loadRoute(origin, destination, false).then((result) => {
      if (!result) {
        setError('Could not load driving directions. Try again in a moment.');
        setLoading(false);
        return;
      }
      setLoading(false);
    });
  };

  const showFatalError = Boolean(error && !route);
  const maneuverKind = route
    ? arrived
      ? 'arrive'
      : maneuverIconKind(
          currentStep?.maneuverType === 'depart'
            ? getActiveVoiceCueStep(route.steps, stepIndex) ?? currentStep
            : currentStep,
        )
    : 'arrive';
  const bannerStreet = arrived
    ? destinationLabel
    : currentStep?.maneuverType === 'depart'
      ? currentStep.name?.trim() || currentStep.instruction
      : currentStep?.name?.trim() || (maneuverKind === 'arrive' ? destinationLabel : 'Continue on route');
  const bannerInstruction = arrived
    ? undefined
    : currentStep?.maneuverType === 'depart'
      ? currentStep.instruction
      : currentStep?.instruction;
  const offRouteMeters = route ? distanceToRouteMeters(route.coords, userPos) : 0;
  const currentRoadLabel = arrived
    ? destinationLabel
    : currentStep?.name?.trim() || bannerStreet;

  return (
    <div className="fixed inset-0 z-[200] bg-[#0b0b0c] flex flex-col" id="map_navigation_view">
      <div className="sbn-nav-banner px-4 pt-3 pb-3 shrink-0 relative z-10 safe-area-pt" id="nav_instruction_banner">
        <div className="flex items-start gap-3 min-h-[4.25rem]">
          <div className="shrink-0 w-[4.75rem] flex flex-col items-center justify-center pt-0.5">
            {loading ? (
              <Navigation className="w-11 h-11 animate-pulse" />
            ) : (
              <ManeuverIcon kind={maneuverKind} className="w-11 h-11" />
            )}
            {!loading && !arrived && (
              <p className="text-base font-black mt-1.5 tabular-nums leading-none tracking-tight">
                {formatNavDistance(distanceToManeuver)}
              </p>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            {loading ? (
              <>
                <p className="text-[1.75rem] font-display font-extrabold leading-tight tracking-tight">Loading route</p>
                <p className="text-sm font-semibold mt-1 truncate opacity-90">To {destinationLabel}</p>
              </>
            ) : arrived ? (
              <>
                <p className="text-[1.75rem] font-display font-extrabold leading-tight tracking-tight">You&apos;ve arrived</p>
                <p className="text-base font-bold mt-1 truncate opacity-95">{destinationLabel}</p>
              </>
            ) : (
              <>
                <p className="text-[1.75rem] sm:text-[2rem] font-display font-extrabold leading-[1.05] tracking-tight truncate">
                  {bannerStreet}
                </p>
                {bannerInstruction ? (
                  <p className="text-sm font-semibold mt-1 truncate opacity-90">{bannerInstruction}</p>
                ) : null}
              </>
            )}
          </div>
        </div>

        {!loading && !arrived && maneuverKind !== 'arrive' && <LaneGuidanceStrip kind={maneuverKind} />}
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {loading && (
          <div className="absolute inset-0 z-10 bg-black/55 flex flex-col items-center justify-center gap-3 text-white pointer-events-none">
            <Navigation className="w-10 h-10 text-accent animate-pulse" />
            <p className="text-sm font-semibold">Loading your route…</p>
          </div>
        )}

        {showFatalError && (
          <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center gap-4 p-6 text-center text-white safe-area-pb">
            <p className="text-sm text-zinc-300">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs pointer-events-auto">
              <button
                type="button"
                onClick={handleRetryRoute}
                className="px-5 py-3 rounded-full bg-accent text-on-accent font-bold text-sm"
              >
                Retry route
              </button>
              <button
                type="button"
                onClick={() => openDrivingDirections(destination, origin)}
                className="px-5 py-3 rounded-full bg-white text-zinc-900 font-bold text-sm"
              >
                Open in Maps
              </button>
              <button type="button" onClick={handleExit} className="sbn-nav-exit-btn px-5 py-3">
                Back to map
              </button>
            </div>
          </div>
        )}

        {!loading && route && (
          <>
            {speedMph && (
              <div className="absolute left-3 top-4 z-20 sbn-nav-speed-sign">
                <p className="text-[1.35rem] font-black text-zinc-900 leading-none tabular-nums">{speedMph}</p>
                <p className="text-[8px] font-extrabold text-zinc-700 uppercase tracking-wider mt-0.5">mph</p>
              </div>
            )}

            {(rerouting || offRouteMeters > 55) && !arrived && (
              <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 bg-black/85 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                {rerouting ? 'Recalculating route…' : 'Return to highlighted route'}
              </div>
            )}

            <div className="absolute right-3 top-4 z-20 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleOverview}
                className="sbn-nav-fab"
                title="Route overview"
                aria-label="Route overview"
              >
                <MapIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleVoiceToggle}
                className="sbn-nav-fab"
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
            </div>

            {!arrived && currentRoadLabel && sheetSnap === 'collapsed' && (
              <div className="absolute inset-x-0 bottom-[7.75rem] z-20 flex justify-center px-4 pointer-events-none">
                <div className="sbn-nav-road-pill truncate">{currentRoadLabel}</div>
              </div>
            )}

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
              onExit={handleExit}
            />
          </>
        )}
      </div>
    </div>
  );
}
