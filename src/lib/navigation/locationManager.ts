import { haversineMeters } from '../mapRoute';
import { geolocationAgeMs } from '../mapRoute';
import { detectMovementState } from './movementDetection';
import {
  accuracyTier,
  maxPositionShiftMeters,
  NAV_STALE_GPS_MS,
  shouldShowLowAccuracyWarning,
} from './locationAccuracy';
import { logNavigationEvent } from './navigationLog';
import {
  navigationLocationFromGeolocation,
  type NavigationLocation,
  type GpsAccuracyTier,
  type MovementState,
} from './types';

export type ProcessedGpsFix = {
  raw: NavigationLocation;
  filtered: NavigationLocation;
  tier: GpsAccuracyTier;
  movement: MovementState;
  accepted: boolean;
  lowAccuracyWarning: boolean;
  rejectedReason?: 'stale' | 'jump' | 'stationary';
};

export type LocationManagerState = {
  lastRaw: NavigationLocation | null;
  lastFiltered: NavigationLocation | null;
};

export function createLocationManagerState(): LocationManagerState {
  return { lastRaw: null, lastFiltered: null };
}

function locationToLatLng(location: NavigationLocation) {
  return { lat: location.latitude, lng: location.longitude };
}

function latLngToLocation(
  point: { lat: number; lng: number },
  source: NavigationLocation,
): NavigationLocation {
  return {
    ...source,
    latitude: point.lat,
    longitude: point.lng,
  };
}

/**
 * Validate, filter, and smooth a raw GPS fix before navigation consumes it.
 * Pipeline: timestamp → accuracy tier → movement → jump clamp → stationary hold.
 */
export function processGpsFix(
  position: GeolocationPosition,
  state: LocationManagerState,
): ProcessedGpsFix | null {
  const raw = navigationLocationFromGeolocation(position);

  if (geolocationAgeMs(position) > NAV_STALE_GPS_MS) {
    logNavigationEvent('GPS_STALE', { ageMs: geolocationAgeMs(position) });
    return null;
  }

  const tier = accuracyTier(raw.accuracy);
  const previousFiltered = state.lastFiltered;
  const previousRaw = state.lastRaw;

  const displacementMeters = previousFiltered
    ? haversineMeters(locationToLatLng(previousFiltered), locationToLatLng(raw))
    : 0;
  const dtMs = previousRaw ? Math.max(1, raw.timestamp - previousRaw.timestamp) : 1000;
  const movement = detectMovementState(raw.speed, displacementMeters, dtMs);

  let filtered = raw;
  let rejectedReason: ProcessedGpsFix['rejectedReason'];
  let accepted = true;

  if (previousFiltered && displacementMeters < 4 && (raw.speed == null || raw.speed <= 0.5)) {
    filtered = {
      ...raw,
      latitude: previousFiltered.latitude,
      longitude: previousFiltered.longitude,
      heading: previousFiltered.heading,
      speed: 0,
    };
    rejectedReason = 'stationary';
    logNavigationEvent('GPS_STATIONARY_SUPPRESSED', { displacementMeters: Math.round(displacementMeters) });
  } else if (previousFiltered) {
    const maxShift = maxPositionShiftMeters(tier);
    if (displacementMeters > maxShift) {
      const ratio = maxShift / displacementMeters;
      const prev = locationToLatLng(previousFiltered);
      const next = locationToLatLng(raw);
      filtered = latLngToLocation(
        {
          lat: prev.lat + (next.lat - prev.lat) * ratio,
          lng: prev.lng + (next.lng - prev.lng) * ratio,
        },
        raw,
      );
      rejectedReason = 'jump';
      logNavigationEvent('GPS_REJECTED_JUMP', {
        tier,
        displacementMeters: Math.round(displacementMeters),
        maxShiftMeters: maxShift,
      });
    }
  }

  if (tier === 'very_poor' && shouldShowLowAccuracyWarning(tier)) {
    logNavigationEvent('GPS_LOW_ACCURACY', { tier, accuracyMeters: raw.accuracy ?? null });
  }

  state.lastRaw = raw;
  state.lastFiltered = filtered;

  return {
    raw,
    filtered,
    tier,
    movement,
    accepted,
    lowAccuracyWarning: shouldShowLowAccuracyWarning(tier),
    rejectedReason,
  };
}

export function resetLocationManagerState(state: LocationManagerState): void {
  state.lastRaw = null;
  state.lastFiltered = null;
}

export type { NavigationLocation, GpsAccuracyTier, MovementState };
