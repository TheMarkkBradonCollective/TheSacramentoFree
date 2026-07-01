import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'motion/react';
import L from 'leaflet';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
import {
  bearingDegrees,
  distanceToRouteMeters,
  fetchNavigationRoute,
  findCurrentStepIndex,
  formatArrivalTime,
  formatNavDistance,
  formatNavDuration,
  formatSpeedMph,
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
  onOverview: () => void;
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
  onOverview,
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
      className={`absolute inset-x-0 bottom-0 z-30 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.18)] flex flex-col safe-area-pb ${
        expanded ? 'max-h-[72vh]' : ''
      }`}
      initial={false}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse route details' : 'Expand route details'}
        className="shrink-0 pt-3 pb-2 px-4 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={handleSheetPointerDown}
        onPointerUp={handleSheetPointerUp}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSnapChange(expanded ? 'collapsed' : 'expanded');
          }
        }}
      >
        <div className="w-10 h-1 rounded-full bg-zinc-300 mx-auto" />
        <p className="text-[10px] text-zinc-400 text-center mt-2 font-medium">
          {expanded ? 'Swipe down for map' : 'Swipe up for route details'}
        </p>
      </div>

      <div className="shrink-0 px-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOverview}
            className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0"
            aria-label="Route overview"
          >
            <MapIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <p className="text-3xl font-black text-[#FF4500] leading-none tabular-nums">
              {arrived ? '0 min' : formatNavDuration(remainingSeconds)}
            </p>
            <p className="text-sm text-zinc-600 font-medium mt-1">
              {formatNavDistance(remainingMeters)} · {formatArrivalTime(remainingSeconds)}
            </p>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {arrived ? `Arrived at ${destinationLabel}` : `To ${destinationLabel}`}
            </p>
            {gpsAccuracy != null && gpsAccuracy > 35 && !arrived && (
              <p className="text-[10px] text-amber-600 mt-1">GPS signal weak — accuracy ±{Math.round(gpsAccuracy)}m</p>
            )}
          </div>

          <button
            type="button"
            onClick={onExit}
            className="px-5 py-2.5 rounded-full bg-zinc-100 text-zinc-900 font-bold text-sm shrink-0 hover:bg-zinc-200"
          >
            {arrived ? 'Done' : 'Exit'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 min-h-0 overflow-y-auto border-t border-zinc-100 px-4 pb-4">
          <div className="py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Trip summary</h3>
            <p className="text-sm text-zinc-700 mt-1">
              {formatNavDistance(route.distanceMeters)} total · {formatNavDuration(route.durationSeconds)} drive
            </p>
            <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">{destinationLabel}</p>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 pb-2 sticky top-0 bg-white">
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
                    isCurrent ? 'bg-[#FF4500]/10 ring-1 ring-[#FF4500]/25' : isPast ? 'opacity-55' : ''
                  }`}
                >
                  <div
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                      isCurrent ? 'bg-[#FF4500] text-white' : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <ManeuverIcon kind={kind} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${isCurrent ? 'font-bold text-zinc-900' : 'font-medium text-zinc-800'}`}>
                      {step.instruction}
                    </p>
                    {step.name ? (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{step.name}</p>
                    ) : null}
                    {step.distanceMeters > 0 && index < route.steps.length - 1 ? (
                      <p className="text-[11px] text-zinc-400 mt-1">{formatNavDistance(step.distanceMeters)}</p>
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

function applyMapBearing(map: L.Map, bearing: number, center: LatLng, enabled: boolean): void {
  // Rotating the entire tile pane is unstable on mobile — keep the map north-up.
  void map;
  void bearing;
  void center;
  void enabled;
}

function createNavUserIcon(heading: number): L.DivIcon {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center" style="transform: rotate(${heading}deg)">
        <div class="h-10 w-10 rounded-full bg-white shadow-lg border-2 border-[#FF4500] flex items-center justify-center">
          <div class="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[12px] border-l-transparent border-r-transparent border-b-[#FF4500] -mt-1"></div>
        </div>
      </div>
    `,
    className: 'nav-user-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function drawRouteOnLayer(layer: L.LayerGroup, coords: [number, number][]): void {
  layer.clearLayers();
  L.polyline(coords, {
    color: '#2563EB',
    weight: 10,
    opacity: 0.35,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(layer);
  L.polyline(coords, {
    color: '#FF4500',
    weight: 6,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(layer);
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
  const watchIdRef = useRef<number | null>(null);
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
  const hasFittedRouteRef = useRef(false);
  const uiTickRef = useRef(0);
  const handleGpsUpdateRef = useRef<(position: GeolocationPosition) => void>(() => undefined);

  const NAV_GPS_FOLLOW_METERS = 22;
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
    if (!currentStep) return 0;
    return haversineMeters(userPos, currentStep.location);
  }, [currentStep, userPos]);

  const loadRoute = useCallback(async (from: LatLng, to: LatLng, isReroute = false) => {
    const result = await fetchNavigationRoute(from, to);
    if (!result) {
      if (isReroute) {
        voiceRef.current.speak('Unable to recalculate route. Continue toward your destination.', 'reroute-fail', true);
      }
      return null;
    }

    setRoute(result);
    stepIndexRef.current = 0;
    setStepIndex(0);
    offRouteTicksRef.current = 0;

    if (isReroute) {
      voiceRef.current.clearSpokenKeys();
      voiceRef.current.speak('Route updated', 'reroute-done', true);
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
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
      voiceRef.current.cancel();
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
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
    voiceRef.current.speak(buildStepVoiceCue(route.steps[0], 0, 'start', destinationLabel), 'nav-start', true);
    window.setTimeout(() => {
      if (voiceOnRef.current) {
        voiceRef.current.speak(
          buildRouteSummaryVoice(destinationLabel, route.distanceMeters, route.durationSeconds),
          'nav-summary',
        );
      }
    }, 1800);
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
      map.fitBounds(route.coords, { padding: [80, 80], maxZoom: 16, animate: false });
      hasFittedRouteRef.current = true;
    }
  }, [route, destination]);

  const syncNavigationMap = useCallback((next: LatLng, nextHeading: number) => {
    const map = mapRef.current;
    if (!map) return;

    headingRef.current = nextHeading;

    const headingChanged =
      !userMarkerRef.current ||
      Math.abs(((nextHeading - lastMarkerHeadingRef.current + 540) % 360) - 180) >= NAV_HEADING_ICON_DEG;
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

    if (!followUserRef.current) return;

    const last = lastNavPanRef.current;
    if (last && haversineMeters(last, next) < NAV_GPS_FOLLOW_METERS) return;

    lastNavPanRef.current = next;
    const zoom = Math.max(map.getZoom(), 17);
    if (map.getZoom() < zoom) {
      map.setView([next.lat, next.lng], zoom, { animate: false });
      return;
    }
    map.panTo([next.lat, next.lng], { animate: false, noMoveStart: true });
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
            true,
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
            voiceRef.current.speak(step.instruction, `step-change-${nextIdx}`, true);
          }
        }

        const step = activeRoute.steps[stepIndexRef.current];
        if (voiceOnRef.current && step && step.maneuverType !== 'arrive') {
          const dist = haversineMeters(next, step.location);
          for (const kind of ['far', 'medium', 'near', 'now'] as const) {
            if (shouldFireVoiceCue(step.distanceMeters, dist, kind, VOICE_CUE_THRESHOLDS)) {
              voiceRef.current.speak(
                buildStepVoiceCue(step, VOICE_CUE_THRESHOLDS[kind], kind, destLabel),
                `cue-${stepIndexRef.current}-${kind}`,
                kind === 'now',
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
              voiceRef.current.speak(buildStepVoiceCue(step!, 0, 'reroute'), 'reroute', true);
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
    if (!navigator.geolocation) return;

    const onPosition = (position: GeolocationPosition) => {
      handleGpsUpdateRef.current(position);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
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
    mapRef.current?.setView([pos.lat, pos.lng], 17, { animate: false });
  };

  const handleOverview = () => {
    setFollowUser(false);
    followUserRef.current = false;
    if (mapRef.current && route) {
      mapRef.current.fitBounds(route.coords, { padding: [90, 90], maxZoom: 15, animate: false });
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
  const maneuverKind = route ? (arrived ? 'arrive' : maneuverIconKind(currentStep)) : 'arrive';
  const bannerStreet = arrived
    ? destinationLabel
    : currentStep?.name?.trim() || (maneuverKind === 'arrive' ? destinationLabel : 'Continue on route');
  const offRouteMeters = route ? distanceToRouteMeters(route.coords, userPos) : 0;

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-900 flex flex-col" id="map_navigation_view">
      <div className="bg-[#FF4500] text-white px-4 pt-4 pb-5 shadow-lg shrink-0 relative z-10 safe-area-pt">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            {loading ? (
              <Navigation className="w-9 h-9 animate-pulse" />
            ) : (
              <ManeuverIcon kind={maneuverKind} className="w-9 h-9" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <>
                <p className="text-2xl font-black leading-none">Loading route</p>
                <p className="text-sm font-medium mt-1 truncate">To {destinationLabel}</p>
              </>
            ) : arrived ? (
              <>
                <p className="text-2xl font-black leading-none">You&apos;ve arrived</p>
                <p className="text-lg font-bold leading-tight mt-1 truncate">{destinationLabel}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black leading-none tabular-nums">{formatNavDistance(distanceToManeuver)}</p>
                <p className="text-lg sm:text-xl font-bold leading-tight mt-1 truncate">{bannerStreet}</p>
                <p className="text-xs text-white/85 mt-1 truncate">{currentStep?.instruction}</p>
              </>
            )}
          </div>
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/30" />
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {loading && (
          <div className="absolute inset-0 z-10 bg-zinc-950/55 flex flex-col items-center justify-center gap-3 text-white pointer-events-none">
            <Navigation className="w-10 h-10 text-[#FF4500] animate-pulse" />
            <p className="text-sm font-semibold">Loading your route…</p>
          </div>
        )}

        {showFatalError && (
          <div className="absolute inset-0 z-20 bg-zinc-950/90 flex flex-col items-center justify-center gap-4 p-6 text-center text-white safe-area-pb">
            <p className="text-sm text-zinc-300">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs pointer-events-auto">
              <button
                type="button"
                onClick={handleRetryRoute}
                className="px-5 py-3 rounded-full bg-[#FF4500] text-white font-bold text-sm"
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
              <button type="button" onClick={handleExit} className="px-5 py-3 rounded-full bg-zinc-800 text-zinc-200 font-semibold text-sm">
                Back to map
              </button>
            </div>
          </div>
        )}

        {!loading && route && (
          <>
            {speedMph && (
              <div className="absolute left-3 top-4 z-20 bg-white rounded-xl shadow-lg px-3 py-2 text-center min-w-[52px]">
                <p className="text-xl font-black text-zinc-900 leading-none tabular-nums">{speedMph}</p>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide mt-0.5">mph</p>
              </div>
            )}

            {(rerouting || offRouteMeters > 55) && !arrived && (
              <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 bg-zinc-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                {rerouting ? 'Recalculating route…' : 'Return to highlighted route'}
              </div>
            )}

            <div className="absolute right-3 top-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOverview}
                className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center text-zinc-900"
                title="Route overview"
              >
                <MapIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center ${
                  voiceOn ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-white'
                }`}
                title={voiceOn ? 'Voice guidance on' : 'Voice guidance off'}
                aria-pressed={voiceOn}
              >
                {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={handleRecenter}
                className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center ${
                  followUser ? 'bg-[#FF4500] text-white' : 'bg-white text-zinc-900'
                }`}
                title="Recenter on you"
              >
                <LocateFixed className="w-5 h-5" />
              </button>
            </div>

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
              onOverview={handleOverview}
              onExit={handleExit}
            />
          </>
        )}
      </div>
    </div>
  );
}
