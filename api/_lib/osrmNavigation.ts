import type { LatLng } from './osrmRoute';

export type OsrmTravelMode = 'driving' | 'walking' | 'cycling';

export interface NavigationLanePayload {
  indications: string[];
  valid: boolean;
}

export interface NavigationStepPayload {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string;
  instruction: string;
  maneuverType: string;
  maneuverModifier?: string;
  location: LatLng;
  lanes?: NavigationLanePayload[];
}

export interface NavigationRoutePayload {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: NavigationStepPayload[];
  travelMode: OsrmTravelMode;
}

const OSRM_PROFILE_ENDPOINTS: Record<OsrmTravelMode, readonly string[]> = {
  driving: ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car'],
  cycling: ['https://routing.openstreetmap.de/routed-bike'],
  walking: ['https://routing.openstreetmap.de/routed-foot'],
};

export function parseTravelMode(value: unknown): OsrmTravelMode {
  if (value === 'walking' || value === 'foot') return 'walking';
  if (value === 'cycling' || value === 'biking' || value === 'bike') return 'cycling';
  return 'driving';
}

function bearingModifierToPhrase(modifier?: string): string | null {
  if (!modifier) return null;
  const normalized = modifier.toLowerCase().trim();
  const map: Record<string, string> = {
    north: 'north',
    south: 'south',
    east: 'east',
    west: 'west',
    northeast: 'northeast',
    northwest: 'northwest',
    southeast: 'southeast',
    southwest: 'southwest',
    n: 'north',
    s: 'south',
    e: 'east',
    w: 'west',
  };
  return map[normalized] ?? null;
}

function formatDepartInstruction(modifier: string | undefined, name: string): string {
  const street = name?.trim();
  const bearing = bearingModifierToPhrase(modifier);
  if (bearing && street) return `Go ${bearing} on ${street}`;
  if (bearing) return `Go ${bearing}`;
  if (street) return `Head on ${street}`;
  return 'Head toward your route';
}

function formatManeuverInstruction(
  type: string,
  modifier: string | undefined,
  name: string,
  isArrival = false,
): string {
  const street = name?.trim() || 'your route';
  if (isArrival || type === 'arrive') return 'Arrive at your destination';
  switch (type) {
    case 'depart':
      return formatDepartInstruction(modifier, name);
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

function parseOsrmLanes(raw: unknown): NavigationLanePayload[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((entry) => {
    const lane = entry as { indications?: unknown; valid?: unknown };
    const indications = Array.isArray(lane.indications)
      ? lane.indications.map((value) => String(value).toLowerCase().trim()).filter(Boolean)
      : [];
    return {
      indications: indications.length > 0 ? indications : ['straight'],
      valid: lane.valid === true,
    };
  });
}

function lanesFromIntersections(intersections: unknown): NavigationLanePayload[] | undefined {
  if (!Array.isArray(intersections)) return undefined;
  for (const intersection of intersections) {
    const lanes = parseOsrmLanes((intersection as { lanes?: unknown })?.lanes);
    if (lanes.length > 0) return lanes;
  }
  return undefined;
}

function parseOsrmSteps(data: unknown): NavigationStepPayload[] {
  const route = (data as { routes?: Array<{ legs?: Array<{ steps?: unknown[] }> }> })?.routes?.[0];
  const rawSteps = route?.legs?.[0]?.steps;
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((step, index) => {
    const s = step as {
      distance?: number;
      duration?: number;
      name?: string;
      maneuver?: { type?: string; modifier?: string; location?: [number, number] };
      intersections?: unknown;
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
    const lanes = lanesFromIntersections(s.intersections);

    return {
      id: `step-${index}`,
      distanceMeters: Number(s.distance ?? 0),
      durationSeconds: Number(s.duration ?? 0),
      name,
      maneuverType,
      maneuverModifier,
      location,
      instruction: formatManeuverInstruction(maneuverType, maneuverModifier, name, isArrival),
      ...(lanes ? { lanes } : {}),
    };
  });
}

/** Fetch turn-by-turn route with OSRM steps for driving, walking, or cycling. */
export async function fetchOsrmNavigationRoute(
  from: LatLng,
  to: LatLng,
  travelMode: OsrmTravelMode = 'driving',
): Promise<NavigationRoutePayload | null> {
  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const endpoints = OSRM_PROFILE_ENDPOINTS[travelMode];

  for (const base of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14_000);

    try {
      const url = `${base}/route/v1/driving/${coordPath}?overview=full&geometries=geojson&steps=true&annotations=false`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
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
        travelMode,
      };
    } catch {
      // try next mirror
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}
