export interface LatLng {
  lat: number;
  lng: number;
}

export interface DrivingRouteResult {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
] as const;

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Server-side OSRM fetch — avoids browser CSP blocks on public routers. */
export async function fetchOsrmDrivingRoute(
  from: LatLng,
  to: LatLng,
): Promise<DrivingRouteResult | null> {
  if (!isValidCoord(from.lat, from.lng) || !isValidCoord(to.lat, to.lng)) {
    return null;
  }

  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;

  for (const base of OSRM_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    try {
      const url = `${base}/route/v1/driving/${coordPath}?overview=full&geometries=geojson&steps=false`;
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
