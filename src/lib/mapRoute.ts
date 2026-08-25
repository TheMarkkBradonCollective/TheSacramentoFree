import { apiUrl } from './appOrigin';
import { readNavigationSettings, type NavTravelMode } from './navigationSettings';
import { buildOsrmRouteUrl, OSRM_MIRROR_ENDPOINTS } from './navigation/osrmProfile';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DrivingRouteResult {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  /** True when geometry came from OSRM road network data. */
  onRoads: boolean;
}

const EARTH_RADIUS_M = 6_371_000;

/** Matches api/_lib/mapCoords.ts — keep both boxes in sync. */
export const SACRAMENTO_SERVICE_AREA = {
  latMin: 38.0,
  latMax: 39.1,
  lngMin: -121.8,
  lngMax: -120.7,
} as const;

export function isLatLngInSacramentoServiceArea(point: LatLng): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= SACRAMENTO_SERVICE_AREA.latMin &&
    point.lat <= SACRAMENTO_SERVICE_AREA.latMax &&
    point.lng >= SACRAMENTO_SERVICE_AREA.lngMin &&
    point.lng <= SACRAMENTO_SERVICE_AREA.lngMax
  );
}

export function isRouteInSacramentoServiceArea(from: LatLng, to: LatLng): boolean {
  return isLatLngInSacramentoServiceArea(from) && isLatLngInSacramentoServiceArea(to);
}


/** Straight-line distance in meters (Haversine). */
export function haversineMeters(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** True when two points are within `meters` of each other. */
export function sameLatLng(
  a: LatLng | null | undefined,
  b: LatLng | null | undefined,
  meters = 8,
): boolean {
  if (!a || !b) return a === b;
  return haversineMeters(a, b) <= meters;
}

/**
 * Age of a GeolocationPosition. Some WebViews report a monotonic timestamp
 * (not epoch ms); treat those as fresh so the puck can move.
 */
export function geolocationAgeMs(position: { timestamp: number }): number {
  const ts = position.timestamp;
  if (!Number.isFinite(ts)) return 0;
  if (ts > 0 && ts < 1_000_000_000_000) return 0;
  return Math.max(0, Date.now() - ts);
}

/** Rough driving estimate when OSRM is unavailable. */
export function estimateDrivingStats(from: LatLng, to: LatLng): Pick<DrivingRouteResult, 'distanceMeters' | 'durationSeconds'> {
  const straight = haversineMeters(from, to);
  const distanceMeters = straight * 1.35;
  const durationSeconds = Math.max(60, (distanceMeters / 1609.34 / 28) * 3600);
  return { distanceMeters, durationSeconds };
}

export function isRoadGeometry(coords: [number, number][] | null | undefined): boolean {
  return Array.isArray(coords) && coords.length >= 2;
}

export function formatRouteDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return 'Nearby';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function formatRouteDuration(seconds: number): string {
  if (seconds < 60) return '<1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

function appleDirFlag(mode: NavTravelMode): string {
  if (mode === 'walking') return 'w';
  if (mode === 'cycling') return 'b';
  return 'd';
}

export function googleTravelModeParam(mode: NavTravelMode): string {
  if (mode === 'walking') return 'walking';
  if (mode === 'cycling') return 'bicycling';
  return 'driving';
}

export function googleMapsDirectionsUrl(
  dest: LatLng,
  origin?: LatLng,
  travelMode: NavTravelMode = typeof window !== 'undefined' ? readNavigationSettings().travelMode : 'driving',
): string {
  const destParam = `${dest.lat},${dest.lng}`;
  const originParam = origin ? `${origin.lat},${origin.lng}` : undefined;
  const googleMode = googleTravelModeParam(travelMode);
  return originParam
    ? `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=${googleMode}`
    : `https://www.google.com/maps/dir/?api=1&destination=${destParam}&travelmode=${googleMode}`;
}

/** Open Google Maps or Apple Maps for turn-by-turn directions. */
export function openDrivingDirections(
  dest: LatLng,
  origin?: LatLng,
  travelMode: NavTravelMode = typeof window !== 'undefined' ? readNavigationSettings().travelMode : 'driving',
): void {
  const destParam = `${dest.lat},${dest.lng}`;
  const originParam = origin ? `${origin.lat},${origin.lng}` : undefined;
  const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);
  const dirflg = appleDirFlag(travelMode);

  const url = isIOS
    ? originParam
      ? `https://maps.apple.com/?saddr=${originParam}&daddr=${destParam}&dirflg=${dirflg}`
      : `https://maps.apple.com/?daddr=${destParam}&dirflg=${dirflg}`
    : googleMapsDirectionsUrl(dest, origin, travelMode);

  window.open(url, '_blank', 'noopener,noreferrer');
}

function withRoadGeometry(
  coords: [number, number][],
  _from: LatLng,
  _to: LatLng,
  distanceMeters: number,
  durationSeconds: number,
): DrivingRouteResult {
  return {
    coords,
    distanceMeters,
    durationSeconds,
    onRoads: true,
  };
}

function buildStatsFallback(from: LatLng, to: LatLng): DrivingRouteResult {
  const stats = estimateDrivingStats(from, to);
  return {
    coords: [],
    ...stats,
    onRoads: false,
  };
}

async function fetchOsrmDirect(
  from: LatLng,
  to: LatLng,
  signal: AbortSignal,
  travelMode: NavTravelMode,
): Promise<DrivingRouteResult | null> {
  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;

  for (const base of OSRM_MIRROR_ENDPOINTS[travelMode]) {
    try {
      const url = buildOsrmRouteUrl(base, coordPath, travelMode, false);
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) continue;

      const data = await res.json();
      const route = data?.routes?.[0];
      const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;
      if (data?.code !== 'Ok' || !coordinates || coordinates.length < 2) continue;

      const latLngCoords = coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
      if (latLngCoords.length < 2) continue;

      return withRoadGeometry(
        latLngCoords,
        from,
        to,
        Number(route.distance),
        Number(route.duration),
      );
    } catch {
      // try next mirror
    }
  }

  return null;
}

async function fetchRouteFromApi(
  from: LatLng,
  to: LatLng,
  signal: AbortSignal,
  travelMode: NavTravelMode,
): Promise<DrivingRouteResult | null> {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
    mode: travelMode,
  });
  const res = await fetch(apiUrl(`/api/map/route?${params.toString()}`), { signal });
  if (!res.ok) return null;

  const data = (await res.json()) as DrivingRouteResult;
  if (!isRoadGeometry(data.coords)) return null;

  return withRoadGeometry(
    data.coords,
    from,
    to,
    Number(data.distanceMeters),
    Number(data.durationSeconds),
  );
}

/**
 * Fetch a road route from the user's GPS to a listing pin.
 * Draws geometry only when OSRM succeeds; otherwise returns stats without a line.
 */
export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng,
  travelMode: NavTravelMode = 'driving',
): Promise<DrivingRouteResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 14_000);

  try {
    if (!isRouteInSacramentoServiceArea(from, to)) {
      return buildStatsFallback(from, to);
    }

    const viaApi = await fetchRouteFromApi(from, to, controller.signal, travelMode);
    if (viaApi) return viaApi;

    const viaOsrm = await fetchOsrmDirect(from, to, controller.signal, travelMode);
    if (viaOsrm) return viaOsrm;

    return buildStatsFallback(from, to);
  } catch {
    return buildStatsFallback(from, to);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
