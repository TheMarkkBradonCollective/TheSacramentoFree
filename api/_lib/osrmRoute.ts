export interface LatLng {
  lat: number;
  lng: number;
}

export interface DrivingRouteResult {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export type OsrmTravelMode = 'driving' | 'walking' | 'cycling';
import { buildOsrmRouteUrl, OSRM_MIRROR_ENDPOINTS } from './osrmProfile';

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseTravelMode(value: unknown): OsrmTravelMode {
  if (value === 'walking' || value === 'foot') return 'walking';
  if (value === 'cycling' || value === 'biking' || value === 'bike') return 'cycling';
  return 'driving';
}

/** Fetch road geometry from public OSRM mirrors for the selected travel mode. */
export async function fetchOsrmDrivingRoute(
  from: LatLng,
  to: LatLng,
  travelMode: OsrmTravelMode = 'driving',
): Promise<DrivingRouteResult | null> {
  if (!isValidCoord(from.lat, from.lng) || !isValidCoord(to.lat, to.lng)) {
    return null;
  }

  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;

  for (const base of OSRM_MIRROR_ENDPOINTS[travelMode]) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    try {
      const url = buildOsrmRouteUrl(base, coordPath, travelMode, false);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const route = data?.routes?.[0];
      const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;
      if (data?.code !== 'Ok' || !coordinates || coordinates.length < 2) continue;

      return {
        coords: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
        distanceMeters: Number(route.distance),
        durationSeconds: Number(route.duration),
      };
    } catch {
      // try next mirror
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}
