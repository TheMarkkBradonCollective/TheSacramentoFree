import type { LatLng } from './mapRoute';
import { haversineMeters, isRouteInSacramentoServiceArea } from './mapRoute';
import { apiUrl } from './appOrigin';
import { lanesFromOsrmIntersections, type NavLane } from './navLanes';
import type { NavTravelMode } from './navigationSettings';

export type { NavLane };
export type { NavTravelMode };

export interface NavigationStep {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string;
  instruction: string;
  maneuverType: string;
  maneuverModifier?: string;
  location: LatLng;
  lanes?: NavLane[];
}

export interface NavigationRouteResult {
  coords: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: NavigationStep[];
  travelMode: NavTravelMode;
}

const OSRM_PROFILE_ENDPOINTS: Record<NavTravelMode, readonly string[]> = {
  driving: ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car'],
  cycling: ['https://routing.openstreetmap.de/routed-bike'],
  walking: ['https://routing.openstreetmap.de/routed-foot'],
};

export function bearingModifierToPhrase(modifier?: string): string | null {
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

export function formatDepartInstruction(modifier: string | undefined, name: string): string {
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
    const lanes = lanesFromOsrmIntersections(s.intersections);

    return {
      id: `step-${index}`,
      distanceMeters: Number(s.distance ?? 0),
      durationSeconds: Number(s.duration ?? 0),
      name,
      maneuverType,
      maneuverModifier,
      location,
      instruction: formatManeuverInstruction(maneuverType, maneuverModifier, name, isArrival),
      ...(lanes.length > 0 ? { lanes } : {}),
    };
  });
}

function normalizeFetchedRoute(data: NavigationRouteResult, travelMode: NavTravelMode): NavigationRouteResult | null {
  if (!Array.isArray(data.coords) || data.coords.length < 2 || !Array.isArray(data.steps) || data.steps.length === 0) {
    return null;
  }
  return {
    coords: data.coords,
    distanceMeters: Number(data.distanceMeters),
    durationSeconds: Number(data.durationSeconds),
    steps: data.steps,
    travelMode: data.travelMode === 'walking' || data.travelMode === 'cycling' ? data.travelMode : travelMode,
  };
}

/** Fetch turn-by-turn route with OSRM steps (API-first, profile-aware OSRM fallback). */
export async function fetchNavigationRoute(
  from: LatLng,
  to: LatLng,
  travelMode: NavTravelMode = 'driving',
): Promise<NavigationRouteResult | null> {
  if (!isRouteInSacramentoServiceArea(from, to)) return null;

  const viaApi = await fetchNavigationRouteFromApi(from, to, travelMode);
  if (viaApi) return viaApi;

  const coordPath = `${from.lng},${from.lat};${to.lng},${to.lat}`;

  for (const base of OSRM_PROFILE_ENDPOINTS[travelMode]) {
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
        travelMode,
      };
    } catch {
      // try next mirror
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return null;
}

async function fetchNavigationRouteFromApi(
  from: LatLng,
  to: LatLng,
  travelMode: NavTravelMode,
): Promise<NavigationRouteResult | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 16_000);

  try {
    const params = new URLSearchParams({
      fromLat: String(from.lat),
      fromLng: String(from.lng),
      toLat: String(to.lat),
      toLng: String(to.lng),
      mode: travelMode,
    });
    const res = await fetch(apiUrl(`/api/map/navigation?${params.toString()}`), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as NavigationRouteResult;
    return normalizeFetchedRoute(data, travelMode);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function formatNavDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.max(1, Math.round(meters * 3.28084))} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/** Spoken form of `formatNavDistance` — same rounding, no abbreviations. */
export function spokenNavDistance(meters: number): string {
  const formatted = formatNavDistance(meters);
  const feet = formatted.match(/^(\d+) ft$/);
  if (feet) {
    const n = Number(feet[1]);
    return n === 1 ? '1 foot' : `${n} feet`;
  }
  const miles = formatted.match(/^([\d.]+) mi$/);
  if (miles) {
    const n = Number(miles[1]);
    return n === 1 ? '1 mile' : `${miles[1]} miles`;
  }
  return formatted;
}

export function formatNavDuration(seconds: number): string {
  if (seconds < 45) return '< 1 min';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

/** Spoken form of `formatNavDuration` — same rounding, no abbreviations. */
export function spokenNavDuration(seconds: number): string {
  if (seconds < 45) return 'less than 1 minute';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return mins === 1 ? '1 minute' : `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hours = h === 1 ? '1 hour' : `${h} hours`;
  if (m === 0) return hours;
  const minutes = m === 1 ? '1 minute' : `${m} minutes`;
  return `${hours} ${minutes}`;
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

function isConnectorManeuver(type: string | undefined): boolean {
  return type === 'depart' || type === 'continue' || type === 'new name';
}

/** Index of the step shown on the instruction banner (depart/continue cue the next turn). */
export function getActiveVoiceCueIndex(steps: NavigationStep[], index: number): number {
  const current = steps[index];
  if (!current) return Math.max(0, Math.min(index, Math.max(0, steps.length - 1)));
  if (isConnectorManeuver(current.maneuverType) && steps[index + 1]) return index + 1;
  return index;
}

/** Step used for distance-based voice cues (depart/continue cue the next turn). */
export function getActiveVoiceCueStep(steps: NavigationStep[], index: number): NavigationStep | undefined {
  return steps[getActiveVoiceCueIndex(steps, index)];
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

export interface DisplayedNavGuidance {
  arrived: boolean;
  maneuverKind: ManeuverIconKind;
  instruction: string | null;
  street: string;
  currentRoad: string;
  nowOnRoad: string | null;
  thenInstruction: string | null;
  thenLine: string | null;
  distanceMeters: number;
  destinationLabel: string;
  lanes: NavLane[];
  cueStep: NavigationStep | undefined;
  currentStep: NavigationStep | undefined;
}

function lowercaseFirst(text: string): string {
  return text.replace(/^./, (ch) => ch.toLowerCase());
}

/** Banner + voice share this card so TTS matches what is on screen. */
export function getDisplayedNavGuidance(options: {
  route: NavigationRouteResult | null;
  stepIndex: number;
  arrived: boolean;
  destinationLabel: string;
  userPos: LatLng;
  travelMode: NavTravelMode;
  showLaneGuidance: boolean;
  osmLanes?: NavLane[] | null;
}): DisplayedNavGuidance {
  const { route, stepIndex, arrived, destinationLabel, userPos, travelMode, showLaneGuidance, osmLanes } = options;
  const currentStep = route?.steps[stepIndex];
  const cueIndex = route ? getActiveVoiceCueIndex(route.steps, stepIndex) : 0;
  const cueStep = arrived ? currentStep : route?.steps[cueIndex] ?? currentStep;
  const onConnectorStep = isConnectorManeuver(currentStep?.maneuverType);
  const maneuverKind: ManeuverIconKind = route
    ? arrived
      ? 'arrive'
      : maneuverIconKind(cueStep)
    : 'arrive';

  const street = arrived
    ? destinationLabel
    : onConnectorStep
      ? currentStep?.name?.trim() || cueStep?.name?.trim() || 'Continue on route'
      : cueStep?.name?.trim() ||
        currentStep?.name?.trim() ||
        (maneuverKind === 'arrive' ? destinationLabel : 'Continue on route');

  const instruction = arrived
    ? null
    : onConnectorStep
      ? cueStep?.instruction ?? null
      : cueStep?.instruction || currentStep?.instruction || null;

  const currentRoad = arrived
    ? destinationLabel
    : onConnectorStep
      ? currentStep?.name?.trim() || cueStep?.name?.trim() || street
      : cueStep?.name?.trim() || currentStep?.name?.trim() || street;

  const thenStep =
    route && !arrived && cueStep
      ? route.steps[Math.min(cueIndex + 1, route.steps.length - 1)]
      : undefined;
  const thenInstruction =
    thenStep && thenStep !== cueStep && thenStep.maneuverType !== 'arrive'
      ? thenStep.instruction
      : thenStep?.maneuverType === 'arrive'
        ? `Arrive at ${destinationLabel}`
        : null;
  const thenLine = thenInstruction ? `Then ${lowercaseFirst(thenInstruction)}` : null;

  const laneStep = cueStep ?? currentStep;
  const lanes =
    travelMode === 'driving' && showLaneGuidance
      ? laneStep?.lanes && laneStep.lanes.length > 0
        ? laneStep.lanes
        : osmLanes ?? []
      : [];

  const distanceMeters =
    !route || arrived || !cueStep ? 0 : haversineMeters(userPos, cueStep.location);

  return {
    arrived,
    maneuverKind,
    instruction,
    street,
    currentRoad,
    nowOnRoad: currentRoad && currentRoad !== street ? currentRoad : null,
    thenInstruction,
    thenLine,
    distanceMeters,
    destinationLabel,
    lanes,
    cueStep,
    currentStep,
  };
}

/** Find the next step index based on user position. Advances at most one step per call. */
export function findCurrentStepIndex(
  steps: NavigationStep[],
  user: LatLng,
  startIndex = 0,
  route?: { coords: [number, number][]; distanceMeters: number },
): number {
  if (steps.length === 0) return 0;

  const index = Math.max(0, Math.min(startIndex, steps.length - 1));
  if (index >= steps.length - 1) return index;

  if (route && route.coords.length >= 2 && route.distanceMeters > 0) {
    const traveled = Math.max(0, route.distanceMeters - remainingRouteMeters(route.coords, user));
    let cumulative = 0;
    for (let i = 0; i < index; i++) {
      cumulative += Math.max(steps[i].distanceMeters, 0);
    }

    const segmentLen = Math.max(steps[index].distanceMeters, 0);
    if (segmentLen <= 0) return index + 1;

    const advanceAt = cumulative + Math.max(segmentLen - 40, segmentLen * 0.82);
    return traveled >= advanceAt ? index + 1 : index;
  }

  const current = steps[index];
  const next = steps[index + 1];
  const toCurrent = haversineMeters(user, current.location);
  const toNext = haversineMeters(user, next.location);

  if (current.maneuverType === 'depart') {
    const segmentMeters = Math.max(next.distanceMeters, 1);
    const remainThreshold = Math.min(50, Math.max(28, segmentMeters * 0.22));
    if (toNext <= remainThreshold) return index + 1;
    return index;
  }

  if (toCurrent < 45 && toNext + 15 < toCurrent) {
    return index + 1;
  }

  return index;
}

/** Signed heading difference in degrees, in (-180, 180]. */
export function headingDeltaDegrees(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function interpolateSegment(a: LatLng, b: LatLng, t: number): LatLng {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    lat: a.lat + (b.lat - a.lat) * clamped,
    lng: a.lng + (b.lng - a.lng) * clamped,
  };
}

/** Walk forward along the polyline from a projected point. */
function pointAheadOnRoute(
  coords: [number, number][],
  startSegment: number,
  startAlong: number,
  metersAhead: number,
): LatLng {
  let remaining = Math.max(0, metersAhead);
  let along = startAlong;
  for (let i = startSegment; i < coords.length - 1; i++) {
    const a = latLngFromCoord(coords[i]);
    const b = latLngFromCoord(coords[i + 1]);
    const segLen = haversineMeters(a, b);
    if (segLen < 0.05) {
      along = 0;
      continue;
    }
    const leftOnSeg = segLen * (1 - along);
    if (remaining <= leftOnSeg) {
      return interpolateSegment(a, b, along + remaining / segLen);
    }
    remaining -= leftOnSeg;
    along = 0;
  }
  return latLngFromCoord(coords[coords.length - 1]);
}

/**
 * Bearing of the street the user is on — a 22 m chord along the route so tiny
 * polyline jogs do not swing the puck catty-corner.
 */
export function bearingAlongRoute(coords: [number, number][], user: LatLng, chordMeters = 22): number {
  if (coords.length < 2) return 0;

  let nearestSegment = 0;
  let nearestDist = Infinity;
  let nearestAlong = 0;
  let nearestPoint = latLngFromCoord(coords[0]);

  for (let i = 0; i < coords.length - 1; i++) {
    const a = latLngFromCoord(coords[i]);
    const b = latLngFromCoord(coords[i + 1]);
    const projection = projectOntoSegment(user, a, b);
    const dist = haversineMeters(user, projection.point);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestSegment = i;
      nearestAlong = projection.along;
      nearestPoint = projection.point;
    }
  }

  const ahead = pointAheadOnRoute(coords, nearestSegment, nearestAlong, chordMeters);
  if (haversineMeters(nearestPoint, ahead) < 2) {
    const a = latLngFromCoord(coords[nearestSegment]);
    const b = latLngFromCoord(coords[Math.min(nearestSegment + 1, coords.length - 1)]);
    return bearingDegrees(a, b);
  }
  return bearingDegrees(nearestPoint, ahead);
}

/** Smooth heading changes to reduce GPS jitter. */
export function smoothHeadingDegrees(previous: number, next: number, maxStep = 22): number {
  const delta = headingDeltaDegrees(previous, next);
  if (Math.abs(delta) <= maxStep) return (next + 360) % 360;
  return (previous + Math.sign(delta) * maxStep + 360) % 360;
}

function latLngFromCoord(coord: [number, number]): LatLng {
  return { lat: coord[0], lng: coord[1] };
}

/** Project a user position onto a route segment (planar approximation, accurate at city scale). */
function projectOntoSegment(
  user: LatLng,
  a: LatLng,
  b: LatLng,
): { point: LatLng; along: number } {
  const latScale = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const ax = a.lng * latScale;
  const ay = a.lat;
  const bx = b.lng * latScale;
  const by = b.lat;
  const px = user.lng * latScale;
  const py = user.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { point: a, along: 0 };
  }

  const along = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return {
    point: { lat: ay + along * dy, lng: (ax + along * dx) / latScale },
    along,
  };
}

function distanceToSegmentMeters(user: LatLng, a: LatLng, b: LatLng): number {
  const { point } = projectOntoSegment(user, a, b);
  return haversineMeters(user, point);
}

/** Remaining distance along route polyline from nearest projection point to end. */
export function remainingRouteMeters(coords: [number, number][], user: LatLng): number {
  if (coords.length < 2) return 0;

  let nearestSegment = 0;
  let nearestDist = Infinity;
  let nearestPoint = latLngFromCoord(coords[0]);

  for (let i = 0; i < coords.length - 1; i++) {
    const a = latLngFromCoord(coords[i]);
    const b = latLngFromCoord(coords[i + 1]);
    const projection = projectOntoSegment(user, a, b);
    const dist = haversineMeters(user, projection.point);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestSegment = i;
      nearestPoint = projection.point;
    }
  }

  // Distance along the polyline only — do not add the perpendicular off-route
  // offset, which inflated ETA while the user was briefly off the road.
  let total = haversineMeters(nearestPoint, latLngFromCoord(coords[nearestSegment + 1]));

  for (let i = nearestSegment + 1; i < coords.length - 1; i++) {
    total += haversineMeters(latLngFromCoord(coords[i]), latLngFromCoord(coords[i + 1]));
  }
  return total;
}

/** Shortest distance from user to any point on the route polyline. */
export function distanceToRouteMeters(coords: [number, number][], user: LatLng): number {
  if (coords.length === 0) return Infinity;
  if (coords.length === 1) {
    return haversineMeters(user, latLngFromCoord(coords[0]));
  }

  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    min = Math.min(
      min,
      distanceToSegmentMeters(user, latLngFromCoord(coords[i]), latLngFromCoord(coords[i + 1])),
    );
  }
  return min;
}

export function isOffRoute(coords: [number, number][], user: LatLng, thresholdMeters = 55): boolean {
  return distanceToRouteMeters(coords, user) > thresholdMeters;
}

function roadClassFromStep(step?: NavigationStep | null): 'freeway' | 'arterial' | 'local' {
  const name = (step?.name ?? step?.instruction ?? '').toLowerCase();
  if (/\b(fwy|freeway|expy|expressway|interstate|i-|hwy|highway)\b/.test(name)) return 'freeway';
  if (/\b(blvd|boulevard|ave|avenue|pkwy|parkway)\b/.test(name)) return 'arterial';
  return 'local';
}

export function estimateSpeedLimitMph(step?: NavigationStep | null): number {
  switch (roadClassFromStep(step)) {
    case 'freeway':
      return 65;
    case 'arterial':
      return 35;
    case 'local':
      return 25;
  }
}

/**
 * Last-resort lane count when OSM/OSRM did not provide lanes.
 * Prefer real `step.lanes` over this estimate.
 */
export function estimateLaneCount(step?: NavigationStep | null): number {
  if (step?.lanes && step.lanes.length > 0) return step.lanes.length;
  switch (roadClassFromStep(step)) {
    case 'freeway':
      return 4;
    case 'arterial':
      return 3;
    case 'local':
      return 0;
  }
}

/** Which lane slots to highlight for the upcoming maneuver (heuristic). */
export function activeLaneIndices(laneCount: number, kind: ManeuverIconKind): number[] {
  if (laneCount <= 0) return [];
  if (laneCount === 1) return [0];

  switch (kind) {
    case 'left':
    case 'slight-left':
    case 'uturn':
      return laneCount === 2 ? [0] : [0, 1].filter((index) => index < laneCount);
    case 'right':
    case 'slight-right':
    case 'roundabout':
      return laneCount === 2 ? [1] : [laneCount - 2, laneCount - 1].filter((index) => index >= 0);
    case 'arrive':
      return [Math.floor(laneCount / 2)];
    default:
      if (laneCount === 2) return [0, 1];
      const mid = Math.floor(laneCount / 2);
      return [mid - 1, mid].filter((index) => index >= 0 && index < laneCount);
  }
}

export function shouldShowLaneGuidance(kind: ManeuverIconKind): boolean {
  return kind !== 'straight' && kind !== 'arrive';
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
  // Short city turns still need a "now" cue; only skip far/medium when the
  // step itself is shorter than the cue distance plus a small buffer.
  const minStepForCue =
    kind === 'far'
      ? thresholds.far + 80
      : kind === 'medium'
        ? thresholds.medium + 40
        : kind === 'near'
          ? thresholds.near + 20
          : 0;
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
