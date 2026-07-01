import type { LatLng } from './mapRoute';
import { haversineMeters } from './mapRoute';

export interface NavigationStep {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string;
  instruction: string;
  maneuverType: string;
  maneuverModifier?: string;
  location: LatLng;
}

export interface NavigationRouteResult {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: NavigationStep[];
}

const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
] as const;

function formatManeuverInstruction(
  type: string,
  modifier: string | undefined,
  name: string,
  isArrival = false,
): string {
  const street = name?.trim() || 'your route';
  if (isArrival || type === 'arrive') return 'Arrive at pickup';
  switch (type) {
    case 'depart':
      if (modifier === 'left') return `Head northwest on ${street}`;
      if (modifier === 'right') return `Head southeast on ${street}`;
      return `Head on ${street}`;
    case 'turn':
      if (modifier === 'left') return `Turn left onto ${street}`;
      if (modifier === 'right') return `Turn right onto ${street}`;
      if (modifier === 'slight left') return `Slight left onto ${street}`;
      if (modifier === 'slight right') return `Slight right onto ${street}`;
      if (modifier === 'sharp left') return `Sharp left onto ${street}`;
      if (modifier === 'sharp right') return `Sharp right onto ${street}`;
      if (modifier === 'uturn') return `Make a U-turn onto ${street}`;
      return `Turn onto ${street}`;
    case 'new name':
      return `Continue on ${street}`;
    case 'continue':
      return `Continue on ${street}`;
    case 'merge':
      return `Merge onto ${street}`;
    case 'on ramp':
      return `Take the ramp onto ${street}`;
    case 'off ramp':
      return `Take the exit onto ${street}`;
    case 'fork':
      if (modifier === 'left') return `Keep left onto ${street}`;
      if (modifier === 'right') return `Keep right onto ${street}`;
      return `Keep straight onto ${street}`;
    case 'roundabout':
    case 'rotary':
      return `Enter the roundabout onto ${street}`;
    case 'end of road':
      if (modifier === 'left') return `At the end of the road, turn left onto ${street}`;
      if (modifier === 'right') return `At the end of the road, turn right onto ${street}`;
      return `At the end of the road, continue on ${street}`;
    default:
      return street ? `Continue on ${street}` : 'Continue on your route';
  }
}

function parseOsrmSteps(data: unknown): NavigationStep[] {
  const route = (data as { routes?: Array<{ legs?: Array<{ steps?: unknown[] }> }> })?.routes?.[0];
  const rawSteps = route?.legs?.[0]?.steps;
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((step, index) => {
    const s = step as {
      distance?: number;
      duration?: number;
      name?: string;
      maneuver?: { type?: string; modifier?: string; location?: [number, number] };
    };
    const maneuver = s.maneuver ?? {};
    const coords = maneuver.location;
    const location: LatLng =
      Array.isArray(coords) && coords.length >= 2
        ? { lat: coords[1], lng: coords[0] }
        : { lat: 0, lng: 0 };
    const maneuverType = String(maneuver.type ?? 'continue');
    const maneuverModifier = maneuver.modifier ? String(maneuver.modifier) : undefined;
    const name = String(s.name ?? '');
    const isArrival = maneuverType === 'arrive' || index === rawSteps.length - 1;

    return {
      id: `step-${index}`,
      distanceMeters: Number(s.distance ?? 0),
      durationSeconds: Number(s.duration ?? 0),
      name,
      maneuverType,
      maneuverModifier,
      location,
      instruction: formatManeuverInstruction(maneuverType, maneuverModifier, name, isArrival),
    };
  });
}

/** Fetch turn-by-turn driving route with OSRM steps. */
export async function fetchNavigationRoute(from: LatLng, to: LatLng): Promise<NavigationRouteResult | null> {
  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;

  for (const base of OSRM_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 16_000);

    try {
      const url = `${base}/route/v1/driving/${coordPath}?overview=full&geometries=geojson&steps=true&annotations=false`;
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) continue;

      const data = await res.json();
      const route = data?.routes?.[0];
      const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;
      if (data?.code !== 'Ok' || !coordinates || coordinates.length < 2) continue;

      const steps = parseOsrmSteps(data);
      if (steps.length === 0) continue;

      return {
        coords: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
        distanceMeters: Number(route.distance),
        durationSeconds: Number(route.duration),
        steps,
      };
    } catch {
      // try next mirror
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return null;
}

export function formatNavDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.max(1, Math.round(meters * 3.28084))} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function formatNavDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatArrivalTime(durationSeconds: number): string {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  return eta.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Bearing in degrees (0 = north) from point A to B. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Find the next step index based on user position. */
export function findCurrentStepIndex(steps: NavigationStep[], user: LatLng, startIndex = 0): number {
  if (steps.length === 0) return 0;

  let bestIndex = Math.min(startIndex, steps.length - 1);
  let bestDistance = Infinity;

  for (let i = startIndex; i < steps.length; i++) {
    const d = haversineMeters(user, steps[i].location);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
    if (d < 35 && i < steps.length - 1) {
      return i + 1;
    }
  }

  return bestIndex;
}

/** Remaining distance along route polyline from nearest point to end. */
export function remainingRouteMeters(coords: [number, number][], user: LatLng): number {
  if (coords.length < 2) return 0;

  let nearestIndex = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineMeters(user, { lat: coords[i][0], lng: coords[i][1] });
    if (d < nearestDist) {
      nearestDist = d;
      nearestIndex = i;
    }
  }

  let total = haversineMeters(user, { lat: coords[nearestIndex][0], lng: coords[nearestIndex][1] });
  for (let i = nearestIndex; i < coords.length - 1; i++) {
    total += haversineMeters(
      { lat: coords[i][0], lng: coords[i][1] },
      { lat: coords[i + 1][0], lng: coords[i + 1][1] },
    );
  }
  return total;
}

/** Shortest distance from user to any point on the route polyline. */
export function distanceToRouteMeters(coords: [number, number][], user: LatLng): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) {
    return haversineMeters(user, { lat: coords[0][0], lng: coords[0][1] });
  }

  let min = Infinity;
  for (let i = 0; i < coords.length; i++) {
    min = Math.min(min, haversineMeters(user, { lat: coords[i][0], lng: coords[i][1] }));
  }
  return min;
}

export function isOffRoute(coords: [number, number][], user: LatLng, thresholdMeters = 55): boolean {
  return distanceToRouteMeters(coords, user) > thresholdMeters;
}

export function formatSpeedMph(speedMetersPerSecond: number | null | undefined): string | null {
  if (speedMetersPerSecond == null || Number.isNaN(speedMetersPerSecond) || speedMetersPerSecond < 0) {
    return null;
  }
  const mph = speedMetersPerSecond * 2.23694;
  if (mph < 1) return null;
  return `${Math.round(mph)}`;
}

/** Whether a distance-based voice cue should fire for the current step. */
export function shouldFireVoiceCue(
  stepDistanceMeters: number,
  distanceToManeuver: number,
  kind: 'far' | 'medium' | 'near' | 'now',
  thresholds: { far: number; medium: number; near: number; now: number },
): boolean {
  const minStepForCue =
    kind === 'far' ? thresholds.far + 120 : kind === 'medium' ? thresholds.medium + 80 : thresholds.near + 30;
  if (stepDistanceMeters < minStepForCue) return false;

  switch (kind) {
    case 'far':
      return distanceToManeuver <= thresholds.far && distanceToManeuver > thresholds.medium;
    case 'medium':
      return distanceToManeuver <= thresholds.medium && distanceToManeuver > thresholds.near;
    case 'near':
      return distanceToManeuver <= thresholds.near && distanceToManeuver > thresholds.now;
    case 'now':
      return distanceToManeuver <= thresholds.now;
    default:
      return false;
  }
}

export type ManeuverIconKind =
  | 'straight'
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'uturn'
  | 'arrive'
  | 'roundabout';

export function maneuverIconKind(step: NavigationStep | undefined): ManeuverIconKind {
  if (!step) return 'straight';
  if (step.maneuverType === 'arrive') return 'arrive';
  const mod = step.maneuverModifier ?? '';
  if (step.maneuverType === 'roundabout' || step.maneuverType === 'rotary') return 'roundabout';
  if (mod.includes('uturn')) return 'uturn';
  if (mod.includes('sharp left') || mod === 'left') return 'left';
  if (mod.includes('sharp right') || mod === 'right') return 'right';
  if (mod.includes('slight left')) return 'slight-left';
  if (mod.includes('slight right')) return 'slight-right';
  if (mod.includes('left')) return 'left';
  if (mod.includes('right')) return 'right';
  return 'straight';
}
