import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, User } from 'lucide-react';
import type { GoGetFulfillerLiveLocation } from '../../types';
import {
  getFulfillerLiveLocation,
  subscribeToFulfillerLiveLocationChanges,
} from '../../lib/goGetSessions';
import { haversineMeters } from '../../lib/mapRoute';

const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

function createPickupIcon(): L.DivIcon {
  return L.divIcon({
    className: 'go-get-meeting-pickup-pin',
    html: `
      <div class="flex flex-col items-center pointer-events-none">
        <span class="w-7 h-7 rounded-full bg-white border-2 border-[var(--color-accent)] shadow-md flex items-center justify-center">
          <span class="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
        </span>
        <span class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-[var(--color-accent)] -mt-0.5"></span>
      </div>
    `,
    iconSize: [28, 35],
    iconAnchor: [14, 35],
  });
}

function createPosterIcon(): L.DivIcon {
  return L.divIcon({
    className: 'go-get-meeting-poster-pin',
    html: `
      <div class="flex flex-col items-center pointer-events-none">
        <span class="relative flex h-8 w-8">
          <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-35 animate-ping"></span>
          <span class="relative inline-flex h-8 w-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg items-center justify-center text-white text-xs font-black">P</span>
        </span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

interface GoGetMeetingMapProps {
  sessionId: string;
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string;
  posterName: string;
  sharingEnabled: boolean;
}

/** Picker-side map showing the listed pickup pin and the poster's live location when they opt in. */
export default function GoGetMeetingMap({
  sessionId,
  destinationLat,
  destinationLng,
  destinationLabel,
  posterName,
  sharingEnabled,
}: GoGetMeetingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const posterMarkerRef = useRef<L.Marker | null>(null);
  const lastFitPosterRef = useRef<{ lat: number; lng: number } | null>(null);
  const [posterLocation, setPosterLocation] = useState<GoGetFulfillerLiveLocation | null>(null);

  useEffect(() => {
    if (!sharingEnabled) {
      setPosterLocation(null);
      return;
    }
    let cancelled = false;
    void getFulfillerLiveLocation(sessionId).then((loc) => {
      if (!cancelled) setPosterLocation(loc);
    });
    const unsubscribe = subscribeToFulfillerLiveLocationChanges(sessionId, (loc) => {
      if (!cancelled) setPosterLocation(loc);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sessionId, sharingEnabled]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([destinationLat, destinationLng], 16);

    L.tileLayer(MAP_TILE_URL, { maxZoom: 19, attribution: MAP_ATTRIBUTION }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    pickupMarkerRef.current = L.marker([destinationLat, destinationLng], { icon: createPickupIcon() }).addTo(map);

    mapRef.current = map;

    lastFitPosterRef.current = null;

    const resize = () => map.invalidateSize();
    requestAnimationFrame(resize);
    const timer = window.setTimeout(resize, 150);

    return () => {
      window.clearTimeout(timer);
      pickupMarkerRef.current = null;
      posterMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [destinationLat, destinationLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (sharingEnabled && posterLocation) {
      if (posterMarkerRef.current) {
        posterMarkerRef.current.setLatLng([posterLocation.lat, posterLocation.lng]);
      } else {
        posterMarkerRef.current = L.marker([posterLocation.lat, posterLocation.lng], {
          icon: createPosterIcon(),
        }).addTo(map);
      }
      const lastFit = lastFitPosterRef.current;
      const movedFar =
        !lastFit ||
        haversineMeters(lastFit, { lat: posterLocation.lat, lng: posterLocation.lng }) >= 45;
      if (movedFar) {
        lastFitPosterRef.current = { lat: posterLocation.lat, lng: posterLocation.lng };
        const bounds = L.latLngBounds([
          [destinationLat, destinationLng],
          [posterLocation.lat, posterLocation.lng],
        ]);
        map.fitBounds(bounds.pad(0.35), { animate: false, maxZoom: 17 });
      }
    } else {
      if (posterMarkerRef.current) {
        posterMarkerRef.current.remove();
        posterMarkerRef.current = null;
      }
      map.setView([destinationLat, destinationLng], Math.max(map.getZoom(), 16), { animate: false });
    }
  }, [destinationLat, destinationLng, posterLocation, sharingEnabled]);

  if (!sharingEnabled) return null;

  return (
    <div className="space-y-2" id="go_get_meeting_map">
      <div className="rounded-xl overflow-hidden border border-app h-44 relative">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
          Pickup spot · {destinationLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          {posterLocation ? `${posterName}'s live location` : `Waiting for ${posterName}'s location…`}
        </span>
      </div>
    </div>
  );
}
