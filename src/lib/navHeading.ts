import type { LatLng } from './mapRoute';
import { haversineMeters } from './mapRoute';
import { bearingAlongRoute, bearingDegrees, headingDeltaDegrees, smoothHeadingDegrees } from './navigationRoute';
import type { NavTravelMode } from './navigationSettings';

export interface NavHeadingInput {
  previous: number;
  gpsHeading: number | null | undefined;
  lastPosition: LatLng | null;
  currentPosition: LatLng;
  routeCoords: [number, number][] | null | undefined;
  compassHeading: number | null;
  speedMps: number | null | undefined;
  travelMode: NavTravelMode;
  /** Distance from the user to the route polyline. On-route locks to the street. */
  offRouteMeters?: number | null;
}

/** Ignore heading noise smaller than this — keeps the arrow on the street. */
export const NAV_HEADING_HOLD_DEG = 28;
/** A real turn (intersection, U-turn). Catch up immediately. */
export const NAV_HEADING_DRAMATIC_DEG = 48;
/** Stay glued to the route tangent inside this offset. */
export const NAV_HEADING_ON_ROUTE_M = 32;
/** Movement bearing needs this much travel so GPS jitter cannot aim catty-corner. */
const MOVEMENT_MIN_METERS = 6;

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

function settleToward(previous: number, target: number, dramatic: boolean): number {
  const delta = absHeadingDelta(previous, target);
  if (delta < NAV_HEADING_HOLD_DEG) return previous;
  if (dramatic || delta >= NAV_HEADING_DRAMATIC_DEG) {
    return smoothHeadingDegrees(previous, target, 62);
  }
  return smoothHeadingDegrees(previous, target, 10);
}

/**
 * Keep the puck on the street. GPS/compass wiggles are ignored unless the user
 * actually turns (route tangent jumps, or they leave the road).
 */
export function resolveNavHeading(input: NavHeadingInput): number {
  const speed = input.speedMps != null && Number.isFinite(input.speedMps) ? Math.max(0, input.speedMps) : 0;
  const gpsHeading = finiteHeading(input.gpsHeading);
  const compass = finiteHeading(input.compassHeading);
  const movedMeters =
    input.lastPosition != null ? haversineMeters(input.lastPosition, input.currentPosition) : 0;
  const movement =
    input.lastPosition && speed >= 1.2 && movedMeters >= MOVEMENT_MIN_METERS
      ? finiteHeading(bearingDegrees(input.lastPosition, input.currentPosition))
      : null;
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

  const walkingOrBiking = input.travelMode !== 'driving';
  const movingFast = speed >= (walkingOrBiking ? 2.4 : 2.0);

  let target = input.previous;
  if (movingFast && movement != null) {
    target = movement;
  } else if (movingFast && gpsHeading != null) {
    target = gpsHeading;
  } else if (offRoute && gpsHeading != null && speed >= 1.4) {
    target = gpsHeading;
  } else if (offRoute && compass != null) {
    target = compass;
  } else if (alongRoute != null) {
    target = alongRoute;
  } else if (compass != null) {
    target = compass;
  } else if (gpsHeading != null) {
    target = gpsHeading;
  }

  return settleToward(input.previous, target, false);
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
