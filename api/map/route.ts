import type { VercelRequest, VercelResponse } from '@vercel/node';

interface LatLng {
  lat: number;
  lng: number;
}

interface DrivingRouteResult {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
] as const;

function parseCoord(value: unknown): number | null {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

async function fetchOsrmDrivingRoute(from: LatLng, to: LatLng): Promise<DrivingRouteResult | null> {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fromLat = parseCoord(req.query.fromLat);
    const fromLng = parseCoord(req.query.fromLng);
    const toLat = parseCoord(req.query.toLat);
    const toLng = parseCoord(req.query.toLng);

    if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
      return res.status(400).json({ error: 'fromLat, fromLng, toLat, and toLng are required' });
    }

    const route = await fetchOsrmDrivingRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
    );

    if (!route) {
      return res.status(502).json({ error: 'Could not calculate driving route' });
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.status(200).json(route);
  } catch (err) {
    console.error('[api/map/route]', err);
    return res.status(500).json({ error: 'Route service error' });
  }
}
