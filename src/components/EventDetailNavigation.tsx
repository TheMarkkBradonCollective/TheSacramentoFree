import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CommunityEvent } from '../types';
import {
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  isRoadGeometry,
  openDrivingDirections,
  type LatLng,
} from '../lib/mapRoute';
import { fetchNavigationRoute } from '../lib/navigationRoute';
import { getLastLiveLatLng, subscribeLiveGeolocation } from '../lib/liveGeolocation';
import MapNavigationView from './MapNavigationView';
import MapSelectionRouteRow from './MapSelectionRouteRow';

interface EventDetailNavigationProps {
  event: CommunityEvent;
}

export default function EventDetailNavigation({ event }: EventDetailNavigationProps) {
  const destination = useMemo<LatLng | null>(() => {
    if (
      typeof event.locationLat !== 'number' ||
      typeof event.locationLng !== 'number' ||
      !Number.isFinite(event.locationLat) ||
      !Number.isFinite(event.locationLng)
    ) {
      return null;
    }
    return { lat: event.locationLat, lng: event.locationLng };
  }, [event.locationLat, event.locationLng]);

  const [userLocation, setUserLocation] = useState<LatLng | null>(() => getLastLiveLatLng());
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [lockedOrigin, setLockedOrigin] = useState<LatLng | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!destination) return;
    const unsub = subscribeLiveGeolocation((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
    return unsub;
  }, [destination]);

  const routeEndpoints = useMemo(() => {
    if (!destination || !userLocation) return null;
    return { start: userLocation, end: destination };
  }, [destination, userLocation]);

  useEffect(() => {
    if (!routeEndpoints) {
      setRouteCoords(null);
      setDistanceMeters(null);
      setDurationSeconds(null);
      setRouteLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setRouteLoading(true);
    setRouteCoords(null);
    setDistanceMeters(null);
    setDurationSeconds(null);

    fetchNavigationRoute(routeEndpoints.start, routeEndpoints.end).then(async (navResult) => {
      if (fetchId !== fetchIdRef.current) return;

      if (navResult) {
        setRouteCoords(navResult.coords.length >= 2 ? navResult.coords : null);
        setDistanceMeters(navResult.distanceMeters);
        setDurationSeconds(navResult.durationSeconds);
        setRouteLoading(false);
        return;
      }

      const fallback = await fetchDrivingRoute(routeEndpoints.start, routeEndpoints.end);
      if (fetchId !== fetchIdRef.current) return;

      setRouteCoords(fallback.onRoads && isRoadGeometry(fallback.coords) ? fallback.coords : null);
      setDistanceMeters(fallback.distanceMeters);
      setDurationSeconds(fallback.durationSeconds);
      setRouteLoading(false);
    });
  }, [routeEndpoints]);

  const openNavigation = useCallback(() => {
    if (!destination || !userLocation) return;
    setLockedOrigin(userLocation);
    setNavigationOpen(true);
  }, [destination, userLocation]);

  if (!destination) {
    return (
      <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2">
        No map pin yet — the host can set an exact location so neighbors can navigate here.
      </p>
    );
  }

  const locationHint = event.location?.trim() || `Event pin · ${event.neighborhood}`;

  return (
    <>
      <div className="sbn-card p-3">
        <MapSelectionRouteRow
          locationHint={locationHint}
          routeEndpoints={routeEndpoints}
          routeLoading={routeLoading}
          distanceMeters={distanceMeters}
          durationSeconds={durationSeconds}
          routeOnMap={isRoadGeometry(routeCoords)}
          hasLiveGps={!!userLocation}
          canNavigate={!!userLocation}
          onStartNavigation={openNavigation}
          onOpenExternalMaps={() => {
            if (!routeEndpoints) {
              openDrivingDirections(destination);
              return;
            }
            openDrivingDirections(routeEndpoints.end, routeEndpoints.start);
          }}
        />
      </div>

      {navigationOpen && lockedOrigin && destination && (
        createPortal(
          <MapNavigationView
            key={event.id}
            origin={lockedOrigin}
            destination={destination}
            destinationLabel={event.title}
            onExit={() => {
              setNavigationOpen(false);
              setLockedOrigin(null);
            }}
          />,
          document.body,
        )
      )}
    </>
  );
}
