import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ItemPost, UserProfile } from '../types';
import { extractGPSCoordinates } from '../types';
import { canViewerSeeExactLocation, convertPercentToLatLng } from '../lib/itemLocation';
import {
  fetchDrivingRoute,
  isRoadGeometry,
  openDrivingDirections,
  type LatLng,
} from '../lib/mapRoute';
import { fetchNavigationRoute } from '../lib/navigationRoute';
import { getLastLiveLatLng, subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { notifyPosterEnRoute } from '../lib/navigationNotify';
import MapNavigationView from './MapNavigationView';
import MapSelectionRouteRow from './MapSelectionRouteRow';
import NavigateNotifyDialog from './NavigateNotifyDialog';

interface ItemDetailNavigationProps {
  item: ItemPost;
  currentUserId: string;
  userProfile?: UserProfile;
}

export default function ItemDetailNavigation({ item, currentUserId, userProfile }: ItemDetailNavigationProps) {
  const destination = useMemo<LatLng | null>(() => {
    if (!canViewerSeeExactLocation(item, currentUserId)) return null;
    const gps = extractGPSCoordinates(item.description);
    if (!gps) return null;
    return convertPercentToLatLng(gps.x, gps.y);
  }, [item, currentUserId]);

  const [userLocation, setUserLocation] = useState<LatLng | null>(() => getLastLiveLatLng());
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigateNotifyOpen, setNavigateNotifyOpen] = useState(false);
  const [notifyingPoster, setNotifyingPoster] = useState(false);
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

  const handleNavigateRequest = useCallback(() => {
    if (!destination || !userLocation) return;
    if (item.userId === currentUserId) {
      openNavigation();
      return;
    }
    setNavigateNotifyOpen(true);
  }, [destination, userLocation, item.userId, currentUserId, openNavigation]);

  const handleNavigateSkipNotify = useCallback(() => {
    setNavigateNotifyOpen(false);
    openNavigation();
  }, [openNavigation]);

  const handleNavigateNotifyPoster = useCallback(async () => {
    if (!userProfile || distanceMeters == null || durationSeconds == null) {
      setNavigateNotifyOpen(false);
      openNavigation();
      return;
    }

    setNotifyingPoster(true);
    try {
      await notifyPosterEnRoute({
        item,
        travelerUserId: userProfile.uid,
        travelerName: userProfile.displayName,
        distanceMeters,
        durationSeconds,
      });
    } finally {
      setNotifyingPoster(false);
      setNavigateNotifyOpen(false);
      openNavigation();
    }
  }, [userProfile, distanceMeters, durationSeconds, item, openNavigation]);

  if (!destination) return null;

  const locationHint = item.neighborhood?.trim() || 'Pickup pin';

  return (
    <>
      <MapSelectionRouteRow
        locationHint={locationHint}
        routeEndpoints={routeEndpoints}
        routeLoading={routeLoading}
        distanceMeters={distanceMeters}
        durationSeconds={durationSeconds}
        routeOnMap={isRoadGeometry(routeCoords)}
        hasLiveGps={!!userLocation}
        canNavigate={!!userLocation}
        onStartNavigation={handleNavigateRequest}
        onOpenExternalMaps={() => {
          if (!routeEndpoints) {
            openDrivingDirections(destination);
            return;
          }
          openDrivingDirections(routeEndpoints.end, routeEndpoints.start);
        }}
      />

      {item.userId !== currentUserId && (
        <NavigateNotifyDialog
          open={navigateNotifyOpen}
          posterName={item.userDisplayName}
          itemTitle={item.title}
          distanceMeters={distanceMeters}
          durationSeconds={durationSeconds}
          notifying={notifyingPoster}
          onNotify={() => void handleNavigateNotifyPoster()}
          onSkip={handleNavigateSkipNotify}
        />
      )}

      {navigationOpen && lockedOrigin && destination && (
        createPortal(
          <Fragment key={item.id}>
            <MapNavigationView
              origin={lockedOrigin}
              destination={destination}
              destinationLabel={item.title}
              onExit={() => {
                setNavigationOpen(false);
                setLockedOrigin(null);
              }}
            />
          </Fragment>,
          document.body,
        )
      )}
    </>
  );
}
