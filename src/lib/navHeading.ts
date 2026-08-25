import type { LatLng } from './mapRoute';
import { haversineMeters } from './mapRoute';
import { bearingAlongRoute, bearingDegrees, headingDeltaDegrees } from './navigationRoute';
import type { NavTravelMode } from './navigationSettings';

export interface NavHeadingInput {
  previous: number;
  lastPosition: LatLng | null;
  currentPosition: LatLng;
  routeCoords: [number, number][] | null | undefined;
  gpsHeading?: number | null | undefined;
  compassHeading?: number | null;
  speedMps?: number | null | undefined;
  travelMode?: NavTravelMode;
  /** Distance from the user to the route polyline. On-route locks to the street. */
  offRouteMeters?: number | null;
  /** When true, device compass may steer the arrow (Navigation settings). */
  usePhoneCompass?: boolean;
}

/** Ignore heading noise smaller than this — keeps the arrow on the street. */
export const NAV_HEADING_HOLD_DEG = 28;
/** A real turn (intersection, U-turn). Catch up immediately. */
export const NAV_HEADING_DRAMATIC_DEG = 48;
/** Stay glued to the route tangent inside this offset. */
export const NAV_HEADING_ON_ROUTE_M = 32;

function finiteHeading(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value < 0) return null;
  return (value + 360) % 360;
}

function absHeadingDelta(from: number, to: number): number {
  return Math.abs(headingDeltaDegrees(from, to));
}

/** Prefer a true compass event; fall back to alpha-based heading. */
export function compassHeadingFromEvent(event: DeviceOrientationEvent): number | null {
  const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
  if (typeof webkitHeading === 'number' && Number.isFinite(webkitHeading) && webkitHeading >= 0) {
    return webkitHeading % 360;
  }

  if (event.alpha == null || Number.isNaN(event.alpha)) return null;
  return (360 - event.alpha) % 360;
}

function settleToward(previous: number, target: number, _dramatic: boolean): number {
  const delta = absHeadingDelta(previous, target);
  // Hold tiny wiggles on straightaways; let the display layer ease real turns.
  if (delta < NAV_HEADING_HOLD_DEG) return previous;
  return target;
}

function movementMinMeters(speedMps: number): number {
  if (speedMps < 0.6) return 3;
  if (speedMps < 1.8) return 4;
  return 5;
}

function movementBearing(
  lastPosition: LatLng | null,
  currentPosition: LatLng,
  speedMps: number,
): number | null {
  if (!lastPosition) return null;
  const movedMeters = haversineMeters(lastPosition, currentPosition);
  const minMeters = movementMinMeters(speedMps);
  if (movedMeters < minMeters) return null;
  return finiteHeading(bearingDegrees(lastPosition, currentPosition));
}

/**
 * Resolve map / live-location heading. Default is movement + route geometry.
 * Phone compass is only used when `usePhoneCompass` is enabled in GPS settings.
 */
export function resolveNavHeading(input: NavHeadingInput): number {
  const speed = input.speedMps != null && Number.isFinite(input.speedMps) ? Math.max(0, input.speedMps) : 0;
  const gpsHeading = finiteHeading(input.gpsHeading);
  const compass = input.usePhoneCompass ? finiteHeading(input.compassHeading) : null;
  const movement = movementBearing(input.lastPosition, input.currentPosition, speed);
  const alongRoute =
    input.routeCoords && input.routeCoords.length >= 2
      ? finiteHeading(bearingAlongRoute(input.routeCoords, input.currentPosition))
      : null;

  const offRoute = input.offRouteMeters != null && input.offRouteMeters > NAV_HEADING_ON_ROUTE_M;
  const onStreet = alongRoute != null && !offRoute;

  if (onStreet && alongRoute != null) {
    const streetTurn = absHeadingDelta(input.previous, alongRoute);
    return settleToward(input.previous, alongRoute, streetTurn >= NAV_HEADING_DRAMATIC_DEG);
  }

  const walkingOrBiking = input.travelMode != null && input.travelMode !== 'driving';
  const gpsCourseMinSpeed = walkingOrBiking ? 0.8 : 1.2;

  let target = input.previous;
  if (movement != null) {
    target = movement;
  } else if (gpsHeading != null && speed >= gpsCourseMinSpeed) {
    target = gpsHeading;
  } else if (alongRoute != null) {
    target = alongRoute;
  } else if (compass != null) {
    target = compass;
  }

  return settleToward(input.previous, target, false);
}

export type NavHeadingTracker = {
  setCompassHeading: (heading: number | null) => void;
  reset: (position?: LatLng | null) => void;
  update: (input: Omit<NavHeadingInput, 'previous' | 'lastPosition' | 'compassHeading'>) => number;
  readonly heading: number;
};

export function createNavHeadingTracker(initialHeading = 0): NavHeadingTracker {
  let previous = initialHeading;
  let lastPosition: LatLng | null = null;
  let compassHeading: number | null = null;

  return {
    setCompassHeading(heading) {
      compassHeading = heading;
    },
    reset(position = null) {
      lastPosition = position;
      if (position) previous = initialHeading;
    },
    update(input) {
      const next = resolveNavHeading({
        ...input,
        previous,
        lastPosition,
        compassHeading,
      });
      lastPosition = input.currentPosition;
      previous = next;
      return next;
    },
    get heading() {
      return previous;
    },
  };
}

export function headingFromGeolocation(
  tracker: NavHeadingTracker,
  position: GeolocationPosition,
  options: Partial<
    Omit<NavHeadingInput, 'previous' | 'lastPosition' | 'currentPosition' | 'compassHeading' | 'gpsHeading' | 'speedMps'>
  > = {},
): number {
  return tracker.update({
    routeCoords: null,
    ...options,
    currentPosition: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    },
    gpsHeading: position.coords.heading,
    speedMps: position.coords.speed,
  });
}

export async function requestCompassPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const DeviceOrientation = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
    | undefined;
  if (!DeviceOrientation) return false;
  if (typeof DeviceOrientation.requestPermission !== 'function') return true;
  try {
    const result = await DeviceOrientation.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/** Live compass heading in degrees (0 = north). */
export function subscribeDeviceCompass(onHeading: (degrees: number) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let hasAbsolute = false;

  const handleAbsolute = (event: Event) => {
    const heading = compassHeadingFromEvent(event as DeviceOrientationEvent);
    if (heading == null) return;
    hasAbsolute = true;
    onHeading(heading);
  };

  const handleRelative = (event: Event) => {
    if (hasAbsolute) return;
    const device = event as DeviceOrientationEvent;
    const webkit = (device as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof webkit !== 'number' && device.absolute !== true) return;
    const heading = compassHeadingFromEvent(device);
    if (heading == null) return;
    onHeading(heading);
  };

  window.addEventListener('deviceorientationabsolute', handleAbsolute, true);
  window.addEventListener('deviceorientation', handleRelative, true);

  return () => {
    window.removeEventListener('deviceorientationabsolute', handleAbsolute, true);
    window.removeEventListener('deviceorientation', handleRelative, true);
  };
}
