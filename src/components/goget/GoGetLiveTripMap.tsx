import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { LatLng } from '../../lib/mapRoute';
import { fetchDrivingRoute, haversineMeters } from '../../lib/mapRoute';
import { SBN_MAP_TILE_OPTIONS, SBN_MAP_TILE_URL } from '../../lib/mapTiles';
import { ROUTE_LINE_CASING, ROUTE_LINE_MAIN } from '../../lib/mapRouteLineStyle';

const ROUTE_REFETCH_M = 80;

function pickupIconHtml(): string {
  return `
    <div class="flex flex-col items-center pointer-events-none">
      <span class="w-7 h-7 rounded-full bg-white border-2 border-[var(--color-accent)] shadow-md flex items-center justify-center">
        <span class="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
      </span>
      <span class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-[var(--color-accent)] -mt-0.5"></span>
    </div>
  `;
}

function personIconHtml(letter: string, color: string, pulse: boolean): string {
  const ping = pulse
    ? `<span class="absolute inline-flex h-full w-full rounded-full ${color} opacity-35 animate-ping"></span>`
    : '';
  return `
    <div class="relative flex h-8 w-8 items-center justify-center pointer-events-none">
      ${ping}
      <span class="relative inline-flex h-8 w-8 rounded-full ${color} border-2 border-white shadow-lg items-center justify-center text-white text-xs font-black">${letter}</span>
    </div>
  `;
}

function chevronIconHtml(heading: number | null | undefined): string {
  const rotate = Number.isFinite(heading) ? heading : 0;
  return `
    <div class="relative flex h-10 w-10 items-center justify-center pointer-events-none" style="transform: rotate(${rotate}deg)">
      <span class="absolute inline-flex h-10 w-10 rounded-full bg-[var(--color-accent)] opacity-30 animate-ping"></span>
      <span class="relative inline-flex h-9 w-9 rounded-full bg-[var(--color-accent)] border-2 border-white shadow-lg items-center justify-center">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white" aria-hidden="true">
          <path d="M12 3l7 16-7-3-7 3z"></path>
        </svg>
      </span>
    </div>
  `;
}

function youIconHtml(): string {
  return `
    <div class="relative flex h-4 w-4 items-center justify-center pointer-events-none">
      <span class="absolute inline-flex h-4 w-4 rounded-full bg-sky-500 opacity-35 animate-ping"></span>
      <span class="relative inline-flex h-3.5 w-3.5 rounded-full bg-sky-500 border-2 border-white shadow"></span>
    </div>
  `;
}

export interface GoGetTripMapParty {
  lat: number;
  lng: number;
  heading?: number | null;
  label: string;
}

interface GoGetLiveTripMapProps {
  destination: LatLng;
  destinationLabel: string;
  traveler?: GoGetTripMapParty | null;
  neighbor?: GoGetTripMapParty | null;
  selfLocation?: LatLng | null;
  className?: string;
  mapId?: string;
}

/** Full-bleed Go Get map: pickup pin, approaching picker, and optional poster live pin. */
export default function GoGetLiveTripMap({
  destination,
  destinationLabel,
  traveler = null,
  neighbor = null,
  selfLocation = null,
  className = '',
  mapId = 'go_get_meeting_map',
}: GoGetLiveTripMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupRef = useRef<L.Marker | null>(null);
  const travelerRef = useRef<L.Marker | null>(null);
  const neighborRef = useRef<L.Marker | null>(null);
  const selfRef = useRef<L.Marker | null>(null);
  const routeCasingRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const lastFitKeyRef = useRef('');
  const lastRouteOriginRef = useRef<LatLng | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!traveler) {
      setRouteCoords(null);
      lastRouteOriginRef.current = null;
      return;
    }
    const last = lastRouteOriginRef.current;
    const movedFar = !last || haversineMeters(last, traveler) >= ROUTE_REFETCH_M;
    if (!movedFar && routeCoords) return;

    lastRouteOriginRef.current = { lat: traveler.lat, lng: traveler.lng };
    let cancelled = false;
    void fetchDrivingRoute({ lat: traveler.lat, lng: traveler.lng }, destination).then((result) => {
      if (cancelled) return;
      if (result.coords.length >= 2) setRouteCoords(result.coords);
    });
    return () => {
      cancelled = true;
    };
  }, [traveler?.lat, traveler?.lng, destination.lat, destination.lng]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([destination.lat, destination.lng], 15);

    L.tileLayer(SBN_MAP_TILE_URL, SBN_MAP_TILE_OPTIONS).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    pickupRef.current = L.marker([destination.lat, destination.lng], {
      icon: L.divIcon({
        className: 'go-get-meeting-pickup-pin',
        html: pickupIconHtml(),
        iconSize: [28, 35],
        iconAnchor: [14, 35],
      }),
      zIndexOffset: 200,
      title: destinationLabel,
    }).addTo(map);

    mapRef.current = map;
    lastFitKeyRef.current = '';

    const resize = () => map.invalidateSize();
    requestAnimationFrame(resize);
    const timer = window.setTimeout(resize, 180);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(mapContainerRef.current);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      pickupRef.current = null;
      travelerRef.current = null;
      neighborRef.current = null;
      selfRef.current = null;
      routeCasingRef.current = null;
      routeLineRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [destination.lat, destination.lng, destinationLabel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setOrMove = (
      ref: { current: L.Marker | null },
      point: { lat: number; lng: number } | null | undefined,
      icon: L.DivIcon,
      zIndex: number,
    ) => {
      if (!point) {
        ref.current?.remove();
        ref.current = null;
        return;
      }
      if (ref.current) {
        ref.current.setLatLng([point.lat, point.lng]);
        ref.current.setIcon(icon);
      } else {
        ref.current = L.marker([point.lat, point.lng], { icon, zIndexOffset: zIndex }).addTo(map);
      }
    };

    setOrMove(
      travelerRef,
      traveler,
      L.divIcon({
        className: 'go-get-trip-traveler-pin',
        html: chevronIconHtml(traveler?.heading),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
      420,
    );

    setOrMove(
      neighborRef,
      neighbor,
      L.divIcon({
        className: 'go-get-meeting-poster-pin',
        html: personIconHtml('P', 'bg-emerald-500', true),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
      360,
    );

    const selfIsTraveler =
      selfLocation &&
      traveler &&
      haversineMeters(selfLocation, traveler) < 18;
    const selfIsNeighbor =
      selfLocation &&
      neighbor &&
      haversineMeters(selfLocation, neighbor) < 18;
    const selfIsPickup =
      selfLocation && haversineMeters(selfLocation, destination) < 18;
    setOrMove(
      selfRef,
      selfLocation && !selfIsTraveler && !selfIsNeighbor && !selfIsPickup ? selfLocation : null,
      L.divIcon({
        className: 'go-get-trip-you-pin',
        html: youIconHtml(),
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      300,
    );

    if (routeCoords && routeCoords.length >= 2) {
      if (routeCasingRef.current) {
        routeCasingRef.current.setLatLngs(routeCoords);
      } else {
        routeCasingRef.current = L.polyline(routeCoords, ROUTE_LINE_CASING).addTo(map);
      }
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs(routeCoords);
      } else {
        routeLineRef.current = L.polyline(routeCoords, ROUTE_LINE_MAIN).addTo(map);
      }
    } else {
      routeCasingRef.current?.remove();
      routeLineRef.current?.remove();
      routeCasingRef.current = null;
      routeLineRef.current = null;
    }

    const points: [number, number][] = [[destination.lat, destination.lng]];
    if (traveler) points.push([traveler.lat, traveler.lng]);
    if (neighbor) points.push([neighbor.lat, neighbor.lng]);
    if (selfLocation) points.push([selfLocation.lat, selfLocation.lng]);
    const fitKey = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join('|');
    if (fitKey !== lastFitKeyRef.current) {
      lastFitKeyRef.current = fitKey;
      if (points.length === 1) {
        map.setView(points[0], Math.max(map.getZoom(), 15), { animate: false });
      } else {
        map.fitBounds(L.latLngBounds(points).pad(0.35), { animate: false, maxZoom: 17 });
      }
    }
  }, [destination, traveler, neighbor, selfLocation, routeCoords]);

  return (
    <div className={`absolute inset-0 ${className}`} id={mapId}>
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
