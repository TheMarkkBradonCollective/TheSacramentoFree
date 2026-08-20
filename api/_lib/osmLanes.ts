export interface OsmLane {
  indications: string[];
  valid: boolean;
}

interface OverpassWay {
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const;

function haversineMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
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

export function lanesFromOsmTags(tags: Record<string, string> | null | undefined): OsmLane[] {
  if (!tags) return [];

  const oneway = /^(yes|true|1|-1)$/i.test(tags.oneway ?? '');
  const turnLanes =
    splitTurnLanes(tags['turn:lanes:forward']) ??
    (oneway ? splitTurnLanes(tags['turn:lanes']) : null);

  if (turnLanes && turnLanes.length > 0) {
    return turnLanes.map((indications) => ({
      indications: indications.length > 0 ? indications : ['straight'],
      valid: false,
    }));
  }

  const directionalCount =
    parsePositiveInt(tags['lanes:forward']) ?? (oneway ? parsePositiveInt(tags.lanes) : null);
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

export async function fetchOsmLanesForPoint(
  lat: number,
  lng: number,
  streetName?: string,
): Promise<OsmLane[]> {
  const nameFilter = streetName?.trim()
    ? `["name"="${streetName.replace(/"/g, '').trim()}"]`
    : '';
  const query = `[out:json][timeout:8];
way(around:22,${lat},${lng})["highway"]["highway"!~"^(footway|path|cycleway|steps|pedestrian|track|bridleway)$"]${nameFilter};
out tags center;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9_000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { elements?: OverpassWay[] };
      const ways = Array.isArray(data.elements) ? data.elements : [];
      if (ways.length === 0) continue;

      const origin = { lat, lng };
      let best: OverpassWay | null = null;
      let bestDist = Infinity;
      for (const way of ways) {
        if (!way.center) continue;
        const dist = haversineMeters(origin, { lat: way.center.lat, lng: way.center.lon });
        if (dist < bestDist) {
          bestDist = dist;
          best = way;
        }
      }

      return lanesFromOsmTags(best?.tags);
    } catch {
      // try next mirror
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (streetName?.trim()) {
    return fetchOsmLanesForPoint(lat, lng);
  }

  return [];
}
