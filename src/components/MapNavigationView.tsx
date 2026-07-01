import { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import type { LatLng } from '../lib/mapRoute';
import { haversineMeters } from '../lib/mapRoute';
import {
  bearingDegrees,
  fetchNavigationRoute,
  findCurrentStepIndex,
  formatArrivalTime,
  formatNavDistance,
  formatNavDuration,
  maneuverIconKind,
  remainingRouteMeters,
  type ManeuverIconKind,
  type NavigationRouteResult,
  type NavigationStep,
} from '../lib/navigationRoute';

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<NavigationRouteResult | null>(null);
  const [userPos, setUserPos] = useState<LatLng>(origin);
  const [heading, setHeading] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchNavigationRoute(origin, destination).then((result) => {
      if (cancelled) return;
      if (!result) {
        setError('Could not load driving directions. Try again in a moment.');
        setLoading(false);
        return;
      }
      setRoute(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [origin, destination]);

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

    L.polyline(route.coords, {
      color: '#2563EB',
      weight: 10,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

    L.polyline(route.coords, {
      color: '#FF4500',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

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

  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPos(next);

        if (position.coords.heading != null && !Number.isNaN(position.coords.heading) && position.coords.heading >= 0) {
          setHeading(position.coords.heading);
        } else if (route) {
          const target = route.steps[stepIndexRef.current]?.location ?? destination;
          setHeading(bearingDegrees(next, target));
        }

        if (route) {
          const nextIdx = findCurrentStepIndex(route.steps, next, stepIndexRef.current);
          if (nextIdx !== stepIndexRef.current) {
            stepIndexRef.current = nextIdx;
            setStepIndex(nextIdx);
          }
        }
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [route, destination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const icon = L.divIcon({
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

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userPos.lat, userPos.lng]);
      userMarkerRef.current.setIcon(icon);
    } else {
      userMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon, zIndexOffset: 500 }).addTo(map);
    }

    if (followUser) {
      map.panTo([userPos.lat, userPos.lng], { animate: true, duration: 0.35 });
    }
  }, [userPos, heading, followUser]);

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
      <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <p className="text-sm text-zinc-300">{error ?? 'Route unavailable'}</p>
        <button type="button" onClick={onExit} className="px-5 py-2.5 rounded-full bg-[#FF4500] font-bold text-sm">
          Back to map
        </button>
      </div>
    );
  }

  const maneuverKind = maneuverIconKind(currentStep);
  const bannerStreet =
    currentStep?.name?.trim() || (maneuverKind === 'arrive' ? destinationLabel : 'Continue on route');

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-900 flex flex-col" id="map_navigation_view">
      <div className="bg-[#FF4500] text-white px-4 pt-4 pb-5 shadow-lg shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <ManeuverIcon kind={maneuverKind} className="w-9 h-9" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black leading-none tabular-nums">{formatNavDistance(distanceToManeuver)}</p>
            <p className="text-lg sm:text-xl font-bold leading-tight mt-1 truncate">{bannerStreet}</p>
            <p className="text-xs text-white/85 mt-1 truncate">{currentStep?.instruction}</p>
          </div>
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/30" />
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

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
            onClick={() => setVoiceOn((v) => !v)}
            className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center ${
              voiceOn ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-white'
            }`}
            title={voiceOn ? 'Voice on' : 'Voice off'}
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center text-zinc-900"
            title="Recenter on you"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] px-4 pt-4 pb-5 shrink-0 z-10">
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
              {formatNavDuration(remainingSeconds)}
            </p>
            <p className="text-sm text-zinc-600 font-medium mt-1">
              {formatNavDistance(remainingMeters)} · {formatArrivalTime(remainingSeconds)}
            </p>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">To {destinationLabel}</p>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="px-5 py-2.5 rounded-full bg-zinc-100 text-zinc-900 font-bold text-sm shrink-0 hover:bg-zinc-200"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
