import { apiUrl } from './appOrigin';
import type { LatLng } from './mapRoute';
import { haversineMeters } from './mapRoute';

export interface NavLane {
  indications: string[];
  valid: boolean;
}

export type NavLaneSource = 'osrm' | 'osm' | 'none';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const;

const laneCache = new Map<string, NavLane[] | null>();

function cacheKey(location: LatLng): string {
  return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
}

export function parseOsrmLanes(raw: unknown): NavLane[] {
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

export function lanesFromOsrmIntersections(intersections: unknown): NavLane[] {
  if (!Array.isArray(intersections)) return [];
  for (const intersection of intersections) {
    const lanes = parseOsrmLanes((intersection as { lanes?: unknown })?.lanes);
    if (lanes.length > 0) return lanes;
  }
  return [];
}

function splitTurnLanes(value: string | undefined): string[][] | null {
  if (!value || !value.trim()) return null;
  return value.split('|').map((slot) =>
    slot
      .split(';')
      .map((token) => token.trim().toLowerCase().replace(/_/g, ' '))
      .filter((token) => token && token !== 'none'),
  );
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function lanesFromOsmTags(tags: Record<string, string> | null | undefined): NavLane[] {
  if (!tags) return [];

  const oneway = /^(yes|true|1|-1)$/i.test(tags.oneway ?? '');
  const turnLanes =
    splitTurnLanes(tags['turn:lanes:forward']) ??
    (oneway ? splitTurnLanes(tags['turn:lanes']) : splitTurnLanes(tags['turn:lanes:forward'])) ??
    (oneway ? splitTurnLanes(tags['turn:lanes']) : null);

  if (turnLanes && turnLanes.length > 0) {
    return turnLanes.map((indications) => ({
      indications: indications.length > 0 ? indications : ['straight'],
      valid: false,
    }));
  }

  const directionalCount =
    parsePositiveInt(tags['lanes:forward']) ??
    (oneway ? parsePositiveInt(tags.lanes) : null);
  const total = parsePositiveInt(tags.lanes);

  let count = directionalCount;
  if (count == null && total != null) {
    count = oneway ? total : Math.max(1, Math.round(total / 2));
  }
  if (count == null || count < 1) return [];

  return Array.from({ length: Math.min(count, 8) }, () => ({
    indications: ['straight'],
    valid: false,
  }));
}

function indicationMatchesKind(indication: string, kind: string): boolean {
  const token = indication.toLowerCase();
  switch (kind) {
    case 'left':
      return token === 'left' || token === 'sharp left' || token.includes('left');
    case 'slight-left':
      return token === 'slight left' || token === 'left' || token.includes('left');
    case 'right':
      return token === 'right' || token === 'sharp right' || token.includes('right');
    case 'slight-right':
      return token === 'slight right' || token === 'right' || token.includes('right');
    case 'uturn':
      return token.includes('uturn') || token.includes('u-turn') || token === 'left';
    case 'roundabout':
      return token === 'right' || token === 'straight' || token === 'through';
    case 'straight':
      return token === 'straight' || token === 'through' || token === 'none' || token === '';
    default:
      return token === 'straight' || token === 'through';
  }
}

export function highlightLanesForManeuver(lanes: NavLane[], kind: string): NavLane[] {
  if (lanes.length === 0) return lanes;

  const hasValidFlag = lanes.some((lane) => lane.valid);
  if (hasValidFlag) {
    return lanes.map((lane) => ({
      ...lane,
      valid: lane.valid || lane.indications.some((indication) => indicationMatchesKind(indication, kind)),
    }));
  }

  const matched = lanes.map((lane) => ({
    ...lane,
    valid: lane.indications.some((indication) => indicationMatchesKind(indication, kind)),
  }));
  if (matched.some((lane) => lane.valid)) return matched;

  if (kind === 'left' || kind === 'slight-left' || kind === 'uturn') {
    return matched.map((lane, index) => ({ ...lane, valid: index === 0 }));
  }
  if (kind === 'right' || kind === 'slight-right' || kind === 'roundabout') {
    return matched.map((lane, index) => ({ ...lane, valid: index === matched.length - 1 }));
  }
  if (kind === 'straight') {
    const mid = Math.floor((matched.length - 1) / 2);
    return matched.map((lane, index) => ({ ...lane, valid: index === mid || index === mid + 1 && matched.length > 2 }));
  }
  return matched;
}

export function laneArrowSymbol(indications: string[]): string {
  const joined = indications.join(' ');
  if (joined.includes('uturn') || joined.includes('u-turn')) return '↩';
  if (joined.includes('sharp left') || joined === 'left') return '←';
  if (joined.includes('slight left')) return '↖';
  if (joined.includes('sharp right') || joined === 'right') return '→';
  if (joined.includes('slight right')) return '↗';
  if (joined.includes('left') && joined.includes('right')) return '↔';
  if (joined.includes('left')) return '←';
  if (joined.includes('right')) return '→';
  return '↑';
}

export function shouldRenderLaneGuidance(
  lanes: NavLane[] | undefined,
  kind: string,
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  if (!lanes || lanes.length < 2) return false;
  if (kind === 'arrive' || kind === 'straight') return false;
  return true;
}

/** Matches the on-screen lane guidance aria-label. */
export function spokenLaneGuidance(lanes: NavLane[] | undefined, kind: string): string | null {
  if (!lanes || lanes.length === 0) return null;
  const highlighted = highlightLanesForManeuver(lanes, kind);
  if (!shouldRenderLaneGuidance(highlighted, kind, true)) return null;
  const activeIndexes = highlighted.flatMap((lane, index) => (lane.valid ? [index + 1] : []));
  if (activeIndexes.length > 0) {
    return `${highlighted.length} lanes. Use lane ${activeIndexes.join(' or ')}`;
  }
  return `${highlighted.length} lanes`;
}

interface OverpassWay {
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}

export async function fetchOsmLanes(
  location: LatLng,
  signal?: AbortSignal,
  streetName?: string,
): Promise<NavLane[] | null> {
  const key = `${cacheKey(location)}:${(streetName ?? '').trim().toLowerCase()}`;
  if (laneCache.has(key)) return laneCache.get(key) ?? null;

  try {
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
    });
    if (streetName?.trim()) params.set('name', streetName.trim());
    const response = await fetch(apiUrl(`/api/map/lanes?${params.toString()}`), {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = (await response.json()) as { lanes?: NavLane[] };
      const lanes = Array.isArray(data.lanes) ? data.lanes : [];
      const result = lanes.length > 0 ? lanes : null;
      laneCache.set(key, result);
      return result;
    }
  } catch {
    if (signal?.aborted) return null;
  }

  const nameFilter = streetName?.trim()
    ? `["name"="${streetName.replace(/"/g, '').trim()}"]`
    : '';
  const query = `[out:json][timeout:8];
way(around:22,${location.lat},${location.lng})["highway"]["highway"!~"^(footway|path|cycleway|steps|pedestrian|track|bridleway)$"]${nameFilter};
out tags center;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { elements?: OverpassWay[] };
      const ways = Array.isArray(data.elements) ? data.elements : [];
      if (ways.length === 0) continue;

      let best: OverpassWay | null = null;
      let bestDist = Infinity;
      for (const way of ways) {
        if (!way.center) continue;
        const dist = haversineMeters(location, { lat: way.center.lat, lng: way.center.lon });
        if (dist < bestDist) {
          bestDist = dist;
          best = way;
        }
      }

      const lanes = lanesFromOsmTags(best?.tags);
      const result = lanes.length > 0 ? lanes : null;
      laneCache.set(key, result);
      return result;
    } catch (error) {
      if (signal?.aborted) return null;
      // try next mirror
    }
  }

  if (signal?.aborted) return null;
  laneCache.set(key, null);
  return null;
}
