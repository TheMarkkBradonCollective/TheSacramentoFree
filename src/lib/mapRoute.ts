export interface LatLng {
  lat: number;
  lng: number;
}

export interface DrivingRouteResult {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

const EARTH_RADIUS_M = 6_371_000;

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

/** Rough driving estimate when OSRM is unavailable. */
export function estimateDrivingStats(from: LatLng, to: LatLng): DrivingRouteResult {
  const straight = haversineMeters(from, to);
  const distanceMeters = straight * 1.35;
  const durationSeconds = Math.max(60, (distanceMeters / 1609.34 / 28) * 3600);
  return {
    coords: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceMeters,
    durationSeconds,
  };
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

/** Fetch a real driving route along roads (OpenStreetMap via OSRM). */
export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng,
): Promise<DrivingRouteResult | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordPath}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    const route = data?.routes?.[0];
    const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;
    if (data?.code !== 'Ok' || !coordinates?.length) return null;

    return {
      coords: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      distanceMeters: route.distance as number,
      durationSeconds: route.duration as number,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
