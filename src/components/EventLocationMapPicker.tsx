import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { NEIGHBORHOOD_LAT_LONGS } from '../types';

const PICKER_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const PICKER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

const DEFAULT_CENTER = { lat: 38.5816, lng: -121.4944 };

function createPickerPinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'event-location-picker-pin',
    html: `
      <div class="relative flex flex-col items-center pointer-events-none">
        <span class="relative flex h-8 w-8">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-40"></span>
          <span class="relative inline-flex h-8 w-8 rounded-full bg-white border-2 border-[var(--color-accent)] shadow-lg items-center justify-center">
            <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]"></span>
          </span>
        </span>
        <span class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[var(--color-accent)] -mt-0.5"></span>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  });
}

function resolveCenter(neighborhood: string, latitude: number | null, longitude: number | null): L.LatLngExpression {
  if (typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return [latitude, longitude];
  }
  const hood = NEIGHBORHOOD_LAT_LONGS[neighborhood];
  if (hood) return [hood.lat, hood.lng];
  return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
}

interface EventLocationMapPickerProps {
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange: (lat: number, lng: number) => void;
  onClear?: () => void;
}

export default function EventLocationMapPicker({
  neighborhood,
  latitude,
  longitude,
  onCoordinatesChange,
  onClear,
}: EventLocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  const placeMarker = useCallback((map: L.Map, lat: number, lng: number, pan = false) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        icon: createPickerPinIcon(),
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onCoordinatesChangeRef.current(pos.lat, pos.lng);
      });

      markerRef.current = marker;
    }

    if (pan) {
      map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = resolveCenter(neighborhood, latitude, longitude);
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, typeof latitude === 'number' ? 17 : 13);

    L.tileLayer(PICKER_TILE_URL, {
      maxZoom: 19,
      attribution: PICKER_ATTRIBUTION,
    }).addTo(map);

    map.on('click', (event) => {
      const { lat, lng } = event.latlng;
      placeMarker(map, lat, lng);
      onCoordinatesChangeRef.current(lat, lng);
    });

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      placeMarker(map, latitude, longitude);
    }

    mapRef.current = map;

    const resize = () => map.invalidateSize();
    requestAnimationFrame(resize);
    const timer = window.setTimeout(resize, 150);

    return () => {
      window.clearTimeout(timer);
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map initializes once per mount
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

    const markerPos = markerRef.current?.getLatLng();
    if (markerPos && Math.abs(markerPos.lat - latitude) < 1e-7 && Math.abs(markerPos.lng - longitude) < 1e-7) {
      return;
    }

    placeMarker(map, latitude, longitude);
  }, [latitude, longitude, placeMarker]);

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage('GPS is not supported on this device.');
      return;
    }

    setGpsLoading(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const map = mapRef.current;
        if (map) {
          placeMarker(map, lat, lng, true);
        }
        onCoordinatesChange(lat, lng);
        setGpsMessage(`GPS locked: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setGpsLoading(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Enable GPS in your browser settings.'
            : 'Could not get GPS. Try tapping the map instead.';
        setGpsMessage(message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const hasPin = typeof latitude === 'number' && typeof longitude === 'number';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-accent" />
          Tap the map to place the event pin
        </p>
        <button
          type="button"
          onClick={handleDetectGps}
          disabled={gpsLoading}
          className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0 inline-flex items-center gap-1"
        >
          <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
          My location
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-56 sm:h-64 rounded-xl border border-app overflow-hidden bg-inset"
        aria-label="Interactive map to set event location"
      />

      {hasPin ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-mono text-app bg-inset border border-app rounded-lg px-3 py-2 flex-1 min-w-[12rem]">
            Pin: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
          {onClear ? (
            <button type="button" onClick={onClear} className="sbn-btn sbn-btn-ghost sbn-btn-sm shrink-0">
              Remove pin
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2">
          No pin yet — tap the park on the map or use My location.
        </p>
      )}

      {gpsMessage && <p className="text-[11px] text-muted">{gpsMessage}</p>}
    </div>
  );
}
