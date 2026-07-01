import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const pane = map.getPanes().mapPane;
  if (!pane) return;

  if (!enabled) {
    pane.style.transform = '';
    pane.style.transformOrigin = '';
    return;
  }

  const point = map.latLngToContainerPoint([center.lat, center.lng]);
  pane.style.transformOrigin = `${point.x}px ${point.y}px`;
  pane.style.transform = `rotate(${-bearing}deg)`;
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<NavigationRouteResult | null>(null);
  const [userPos, setUserPos] = useState<LatLng>(origin);
  const [heading, setHeading] = useState(0);
  const [speedMph, setSpeedMph] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

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
      if (mapRef.current) {
        mapRef.current.fitBounds(result.coords, { padding: [80, 80], maxZoom: 16 });
      }
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
    if (!mapContainerRef.current || !route) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([origin.lat, origin.lng], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;
    drawRouteOnLayer(routeLayer, route.coords);

    const destIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-8 w-8 rounded-full bg-red-500/25 animate-ping"></span>
          <div class="h-5 w-5 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
        </div>
      `,
      className: 'nav-dest-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker([destination.lat, destination.lng], { icon: destIcon, zIndexOffset: 400 }).addTo(map);

    map.fitBounds(route.coords, { padding: [80, 80], maxZoom: 16 });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, [route, origin, destination]);

  const handleGpsUpdate = useCallback(
    (position: GeolocationPosition) => {
      const next: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserPos(next);
      setGpsAccuracy(position.coords.accuracy ?? null);
      setSpeedMph(formatSpeedMph(position.coords.speed));

      const activeRoute = routeRef.current;
      const dest = destinationRef.current;
      const destLabel = destinationLabelRef.current;

      if (position.coords.heading != null && !Number.isNaN(position.coords.heading) && position.coords.heading >= 0) {
        setHeading(position.coords.heading);
      } else if (activeRoute) {
        const target = activeRoute.steps[stepIndexRef.current]?.location ?? dest;
        setHeading(bearingDegrees(next, target));
      }

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
    [loadRoute],
  );

  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleGpsUpdate,
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [handleGpsUpdate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const icon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center" style="transform: rotate(${followUser ? 0 : heading}deg)">
          <div class="h-10 w-10 rounded-full bg-white shadow-lg border-2 border-[#FF4500] flex items-center justify-center">
            <div class="w-0 h-0 border-l-[7px] border-r-[7px] border-b-[12px] border-l-transparent border-r-transparent border-b-[#FF4500] -mt-1"></div>
          </div>
        </div>
      `,
      className: 'nav-user-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lng]);
      userMarkerRef.current.setIcon(icon);
    } else {
      userMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon, zIndexOffset: 500 }).addTo(map);
    }

    if (followUser) {
      map.setView([userPos.lat, userPos.lng], Math.max(map.getZoom(), 17), { animate: true });
      applyMapBearing(map, heading, userPos, true);
    } else {
      applyMapBearing(map, heading, userPos, false);
    }
  }, [userPos, heading, followUser]);

  const handleVoiceToggle = () => {
    setVoiceOn((on) => {
      const next = !on;
      voiceRef.current.setEnabled(next);
      return next;
    });
  };

  const handleRecenter = () => {
    setFollowUser(true);
    mapRef.current?.setView([userPos.lat, userPos.lng], 17, { animate: true });
  };

  const handleOverview = () => {
    setFollowUser(false);
    if (mapRef.current && route) {
      mapRef.current.fitBounds(route.coords, { padding: [90, 90], maxZoom: 15, animate: true });
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center gap-3 text-white">
        <Navigation className="w-10 h-10 text-[#FF4500] animate-pulse" />
        <p className="text-sm font-semibold">Loading your route…</p>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center gap-4 p-6 text-center text-white safe-area-pb">
        <p className="text-sm text-zinc-300">{error ?? 'Route unavailable'}</p>
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
          <button
            type="button"
            onClick={handleRetryRoute}
            className="px-5 py-2.5 rounded-full bg-zinc-800 text-white font-bold text-sm border border-zinc-600"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => openDrivingDirections(destination, origin)}
            className="px-5 py-2.5 rounded-full bg-white text-zinc-900 font-bold text-sm"
          >
            Open in Maps
          </button>
          <button type="button" onClick={handleExit} className="px-5 py-2.5 rounded-full bg-[#FF4500] font-bold text-sm">
            Back to map
          </button>
        </div>
      </div>
    );
  }

  const maneuverKind = arrived ? 'arrive' : maneuverIconKind(currentStep);
  const bannerStreet = arrived
    ? destinationLabel
    : currentStep?.name?.trim() || (maneuverKind === 'arrive' ? destinationLabel : 'Continue on route');
  const offRouteMeters = distanceToRouteMeters(route.coords, userPos);

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-900 flex flex-col" id="map_navigation_view">
      <div className="bg-[#FF4500] text-white px-4 pt-4 pb-5 shadow-lg shrink-0 relative z-10 safe-area-pt">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <ManeuverIcon kind={maneuverKind} className="w-9 h-9" />
          </div>
          <div className="min-w-0 flex-1">
            {arrived ? (
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
      </div>

      <div className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] px-4 pt-4 pb-5 shrink-0 z-10 safe-area-pb">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOverview}
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
            onClick={handleExit}
            className="px-5 py-2.5 rounded-full bg-zinc-100 text-zinc-900 font-bold text-sm shrink-0 hover:bg-zinc-200"
          >
            {arrived ? 'Done' : 'Exit'}
          </button>
        </div>
      </div>
    </div>
  );
}
