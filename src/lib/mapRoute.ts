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

const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
] as const;

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

/**
 * Street-aligned block segments between two points — the original SSS map fallback
 * before OSRM (L-shaped urban grid path, not a straight line).
 */
export function generateUberRouteCoords(from: LatLng, to: LatLng): [number, number][] {
  const midLat = from.lat + (to.lat - from.lat) * 0.55;
  const midLng = from.lng + (to.lng - from.lng) * 0.45;

  return [
    [from.lat, from.lng],
    [midLat, from.lng],
    [midLat, midLng],
    [to.lat, midLng],
    [to.lat, to.lng],
  ];
}

/** Rough driving estimate when OSRM is unavailable. */
export function estimateDrivingStats(from: LatLng, to: LatLng): Pick<DrivingRouteResult, 'distanceMeters' | 'durationSeconds'> {
  const straight = haversineMeters(from, to);
  const distanceMeters = straight * 1.35;
  const durationSeconds = Math.max(60, (distanceMeters / 1609.34 / 28) * 3600);
  return { distanceMeters, durationSeconds };
}

export function isRoadGeometry(coords: [number, number][] | null | undefined): boolean {
  return Array.isArray(coords) && coords.length > 2;
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

/** Open Google Maps or Apple Maps for turn-by-turn driving directions. */
export function openDrivingDirections(dest: LatLng, origin?: LatLng): void {
  const destParam = `${dest.lat},${dest.lng}`;
  const originParam = origin ? `${origin.lat},${origin.lng}` : undefined;
  const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);

  let url: string;
  if (isIOS) {
    url = originParam
      ? `https://maps.apple.com/?saddr=${originParam}&daddr=${destParam}&dirflg=d`
      : `https://maps.apple.com/?daddr=${destParam}&dirflg=d`;
  } else {
    url = originParam
      ? `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${destParam}&travelmode=driving`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

function buildGridFallback(from: LatLng, to: LatLng): DrivingRouteResult {
  const stats = estimateDrivingStats(from, to);
  return {
    coords: generateUberRouteCoords(from, to),
    ...stats,
    onRoads: false,
  };
}

async function fetchOsrmDirect(from: LatLng, to: LatLng, signal: AbortSignal): Promise<DrivingRouteResult | null> {
  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;

  for (const base of OSRM_ENDPOINTS) {
    try {
      const url = `${base}/route/v1/driving/${coordPath}?overview=full&geometries=geojson&steps=false`;
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) continue;

      const data = await res.json();
      const route = data?.routes?.[0];
      const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;
      if (data?.code !== 'Ok' || !coordinates || coordinates.length < 2) continue;

      return {
        coords: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
        distanceMeters: Number(route.distance),
        durationSeconds: Number(route.duration),
        onRoads: coordinates.length > 2,
      };
    } catch {
      // try next mirror
    }
  }

  return null;
}

async function fetchRouteFromApi(from: LatLng, to: LatLng, signal: AbortSignal): Promise<DrivingRouteResult | null> {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
  });
  const res = await fetch(`/api/map/route?${params.toString()}`, { signal });
  if (!res.ok) return null;

  const data = (await res.json()) as DrivingRouteResult;
  if (!isRoadGeometry(data.coords)) return null;

  return {
    coords: data.coords,
    distanceMeters: Number(data.distanceMeters),
    durationSeconds: Number(data.durationSeconds),
    onRoads: true,
  };
}

/**
 * Fetch a driving route for the map — direct OSRM first (original SSS pattern),
 * API proxy second, then the grid-style fallback path.
 */
export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<DrivingRouteResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 14_000);

  try {
    const viaOsrm = await fetchOsrmDirect(from, to, controller.signal);
    if (viaOsrm?.onRoads) return viaOsrm;

    const viaApi = await fetchRouteFromApi(from, to, controller.signal);
    if (viaApi) return viaApi;

    if (viaOsrm) return viaOsrm;

    return buildGridFallback(from, to);
  } catch {
    return buildGridFallback(from, to);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
