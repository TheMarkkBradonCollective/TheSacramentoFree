import { useEffect, useRef, useState } from 'react';
import {
  fetchDrivingRoute,
  haversineMeters,
  isRoadGeometry,
  type LatLng,
} from '../lib/mapRoute';
import { fetchNavigationRoute, type NavigationRouteResult } from '../lib/navigationRoute';
import { readNavigationSettings, subscribeNavigationSettings, type NavTravelMode } from '../lib/navigationSettings';

/** Refetch when the user has actually moved this far from the last route origin. */
const START_MOVE_REFETCH_M = 85;
/** Refetch when the destination pin itself moved. */
const DEST_MOVE_REFETCH_M = 25;

/**
 * Preview driving distance/polyline without flashing. Keeps the last good
 * route on screen while a new one loads, and ignores GPS jitter that would
 * otherwise clear the line and refetch the same path.
 *
 * Pass `destinationKey` (listing/event id) so clicking a different pin always
 * loads a new route even when two pins sit close together.
 */
export function usePreviewDrivingRoute(
  start: LatLng | null | undefined,
  end: LatLng | null | undefined,
  enabled = true,
  destinationKey?: string | null,
) {
  const [coords, setCoords] = useState<[number, number][] | null>(null);
  const [coordsKey, setCoordsKey] = useState<string | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [navRoute, setNavRoute] = useState<NavigationRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [travelMode, setTravelMode] = useState<NavTravelMode>(() => readNavigationSettings().travelMode);
  const fetchIdRef = useRef(0);
  const lastFetchedRef = useRef<{ start: LatLng; end: LatLng; key: string | null; mode: NavTravelMode } | null>(null);
  const hasPreviewRef = useRef(false);

  useEffect(() => subscribeNavigationSettings((settings) => setTravelMode(settings.travelMode)), []);

  useEffect(() => {
    if (!enabled) return;

    if (!end) {
      fetchIdRef.current += 1;
      lastFetchedRef.current = null;
      hasPreviewRef.current = false;
      setCoords(null);
      setCoordsKey(null);
      setDistanceMeters(null);
      setDurationSeconds(null);
      setNavRoute(null);
      setLoading(false);
      return;
    }

    if (!start) return;

    const destKey = destinationKey ?? null;
    const last = lastFetchedRef.current;
    const destChanged =
      !last ||
      last.key !== destKey ||
      last.mode !== travelMode ||
      haversineMeters(last.end, end) >= DEST_MOVE_REFETCH_M;
    const startMoved = !last || haversineMeters(last.start, start) >= START_MOVE_REFETCH_M;

    if (last && !destChanged && !startMoved) return;

    lastFetchedRef.current = { start, end, key: destKey, mode: travelMode };
    const fetchId = ++fetchIdRef.current;

    if (destChanged) {
      hasPreviewRef.current = false;
      setCoords(null);
      setCoordsKey(null);
      setDistanceMeters(null);
      setDurationSeconds(null);
      setNavRoute(null);
      setLoading(true);
    } else if (!hasPreviewRef.current) {
      setLoading(true);
    }

    void fetchNavigationRoute(start, end, travelMode).then(async (navResult) => {
      if (fetchId !== fetchIdRef.current) return;

      if (navResult) {
        hasPreviewRef.current = true;
        setNavRoute(navResult);
        setCoords(navResult.coords.length >= 2 ? navResult.coords : null);
        setCoordsKey(destKey);
        setDistanceMeters(navResult.distanceMeters);
        setDurationSeconds(navResult.durationSeconds);
        setLoading(false);
        return;
      }

      const fallback = await fetchDrivingRoute(start, end, travelMode);
      if (fetchId !== fetchIdRef.current) return;

      hasPreviewRef.current = true;
      setNavRoute(null);
      setCoords(fallback.onRoads && isRoadGeometry(fallback.coords) ? fallback.coords : null);
      setCoordsKey(destKey);
      setDistanceMeters(fallback.distanceMeters);
      setDurationSeconds(fallback.durationSeconds);
      setLoading(false);
    });
  }, [enabled, destinationKey, start?.lat, start?.lng, end?.lat, end?.lng, travelMode]);

  const activeKey = destinationKey ?? null;
  const matchesDest = coordsKey === activeKey;

  return {
    coords: matchesDest ? coords : null,
    distanceMeters: matchesDest ? distanceMeters : null,
    durationSeconds: matchesDest ? durationSeconds : null,
    navRoute: matchesDest ? navRoute : null,
    loading: loading || Boolean(end && start && enabled && !matchesDest),
    travelMode,
  };
}
