import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CommunityEvent } from '../types';
import {
  haversineMeters,
  isRoadGeometry,
  openDrivingDirections,
  type LatLng,
} from '../lib/mapRoute';
import { remainingRouteMeters } from '../lib/navigationRoute';
import { usePreviewDrivingRoute } from '../hooks/usePreviewDrivingRoute';
import { getLastLiveLatLng, retainLiveGeolocation, subscribeLiveGeolocation } from '../lib/liveGeolocation';
import {
  clearActiveNavSession,
  readActiveNavSession,
  saveActiveNavSession,
} from '../lib/navigationSession';
import { supportsInAppNavigation } from '../lib/goGetCoordinationGating';
import MapNavigationView from './MapNavigationView';
import { unlockNavigationSpeech } from '../lib/navigationVoice';
import MapSelectionRouteRow from './MapSelectionRouteRow';

interface EventDetailNavigationProps {
  event: CommunityEvent;
  currentUserId: string;
  /** When true, start in-app navigation once GPS is ready. */
  autoStartNavigation?: boolean;
  onAutoStartNavigationConsumed?: () => void;
}

export default function EventDetailNavigation({
  event,
  currentUserId,
  autoStartNavigation = false,
  onAutoStartNavigationConsumed,
}: EventDetailNavigationProps) {
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [lockedOrigin, setLockedOrigin] = useState<LatLng | null>(null);
  const autoStartAttemptedRef = useRef(false);

  useEffect(() => {
    autoStartAttemptedRef.current = false;
  }, [event.id]);

  useEffect(() => {
    if (!destination) return;
    const unsub = subscribeLiveGeolocation((position) => {
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation((prev) => (prev && haversineMeters(prev, next) < 12 ? prev : next));
    });
    return unsub;
  }, [destination]);

  const routeEndpoints = useMemo(() => {
    if (!destination || !userLocation) return null;
    return { start: userLocation, end: destination };
  }, [destination, userLocation]);

  const {
    coords: routeCoords,
    distanceMeters: fetchedDistanceMeters,
    durationSeconds,
    navRoute: previewNavRoute,
    loading: routeLoading,
  } = usePreviewDrivingRoute(userLocation, destination, true, event.id);

  const distanceMeters =
    routeCoords && userLocation && routeCoords.length >= 2
      ? remainingRouteMeters(routeCoords, userLocation)
      : fetchedDistanceMeters;

  const openNavigation = useCallback(() => {
    if (!destination || !userLocation) return;
    unlockNavigationSpeech();
    saveActiveNavSession({
      userId: currentUserId,
      targetType: 'event',
      targetId: event.id,
      destination,
      destinationLabel: event.title,
      startedAt: Date.now(),
    });
    setLockedOrigin(userLocation);

    if (currentUserId) {
      const existing = readActiveNavSession(currentUserId);
      const sameTarget =
        existing?.targetType === 'event' && existing.targetId === event.id ? existing : null;
      saveActiveNavSession({
        userId: currentUserId,
        targetType: 'event',
        targetId: event.id,
        destination,
        destinationLabel: event.title,
        startedAt: sameTarget?.startedAt ?? Date.now(),
      });
    }

    setNavigationOpen(true);
  }, [destination, userLocation, currentUserId, event.id, event.title]);

  useEffect(() => {
    if (!navigationOpen || !currentUserId) return;
    return retainLiveGeolocation();
  }, [navigationOpen, currentUserId]);

  useEffect(() => {
    if (!navigationOpen || !destination || !currentUserId) return;
    const existing = readActiveNavSession(currentUserId);
    const sameTarget =
      existing?.targetType === 'event' && existing.targetId === event.id ? existing : null;
    saveActiveNavSession({
      userId: currentUserId,
      targetType: 'event',
      targetId: event.id,
      destination,
      destinationLabel: event.title,
      startedAt: sameTarget?.startedAt ?? Date.now(),
    });
  }, [navigationOpen, destination, currentUserId, event.id, event.title]);

  useEffect(() => {
    if (!autoStartNavigation || autoStartAttemptedRef.current) return;
    if (!destination) {
      onAutoStartNavigationConsumed?.();
      return;
    }
    if (!userLocation) return;
    autoStartAttemptedRef.current = true;
    onAutoStartNavigationConsumed?.();
    openNavigation();
  }, [
    autoStartNavigation,
    destination,
    userLocation,
    openNavigation,
    onAutoStartNavigationConsumed,
  ]);

  if (!destination) {
    return (
      <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2">
        No map pin yet — the host can set an exact location so neighbors can navigate here.
      </p>
    );
  }

  if (!supportsInAppNavigation()) {
    return null;
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
          <Fragment key={event.id}>
            <MapNavigationView
              origin={lockedOrigin}
              destination={destination}
              destinationLabel={event.title}
              initialRoute={previewNavRoute}
              onExit={() => {
                clearActiveNavSession();
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
