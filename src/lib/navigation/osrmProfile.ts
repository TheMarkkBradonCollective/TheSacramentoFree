import type { NavTravelMode } from '../navigationSettings';

/** OSRM profile segment for generic OSRM servers (not profile-dedicated hosts). */
export function osrmProfilePath(mode: NavTravelMode): string {
  if (mode === 'walking') return 'foot';
  if (mode === 'cycling') return 'cycling';
  return 'driving';
}

/**
 * Build a turn-by-turn OSRM route URL for the given mirror base.
 * Dedicated hosts (routed-car, routed-bike, routed-foot) always use `driving` in the path.
 */
export function buildOsrmRouteUrl(
  base: string,
  coordPath: string,
  travelMode: NavTravelMode,
  steps: boolean,
): string {
  const profile = /routed-(car|bike|foot)/i.test(base) ? 'driving' : osrmProfilePath(travelMode);
  const query = steps
    ? 'overview=full&geometries=geojson&steps=true&annotations=false'
    : 'overview=full&geometries=geojson&steps=false';
  return `${base}/route/v1/${profile}/${coordPath}?${query}`;
}

export const OSRM_MIRROR_ENDPOINTS: Record<NavTravelMode, readonly string[]> = {
  driving: ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car'],
  cycling: ['https://routing.openstreetmap.de/routed-bike'],
  walking: ['https://routing.openstreetmap.de/routed-foot'],
};
