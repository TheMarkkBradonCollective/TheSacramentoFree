import type { OsrmTravelMode } from './osrmRoute';

/** OSRM profile segment for generic OSRM servers (not profile-dedicated hosts). */
export function osrmProfilePath(mode: OsrmTravelMode): string {
  if (mode === 'walking') return 'foot';
  if (mode === 'cycling') return 'cycling';
  return 'driving';
}

export function buildOsrmRouteUrl(
  base: string,
  coordPath: string,
  travelMode: OsrmTravelMode,
  steps: boolean,
): string {
  const profile = /routed-(car|bike|foot)/i.test(base) ? 'driving' : osrmProfilePath(travelMode);
  const query = steps
    ? 'overview=full&geometries=geojson&steps=true&annotations=false'
    : 'overview=full&geometries=geojson&steps=false';
  return `${base}/route/v1/${profile}/${coordPath}?${query}`;
}

export const OSRM_MIRROR_ENDPOINTS: Record<OsrmTravelMode, readonly string[]> = {
  driving: ['https://router.project-osrm.org', 'https://routing.openstreetmap.de/routed-car'],
  cycling: ['https://routing.openstreetmap.de/routed-bike'],
  walking: ['https://routing.openstreetmap.de/routed-foot'],
};
