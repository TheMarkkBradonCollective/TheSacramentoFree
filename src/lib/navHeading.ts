import type { LatLng } from './mapRoute';
import { bearingAlongRoute, bearingDegrees, smoothHeadingDegrees } from './navigationRoute';
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
}

function finiteHeading(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value < 0) return null;
  return (value + 360) % 360;
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

/**
 * Fuse GPS motion, device compass, and the route polyline into a stable heading.
 * Compass wins when you are walking/biking or barely moving; GPS motion wins in a car.
 */
export function resolveNavHeading(input: NavHeadingInput): number {
  const speed = input.speedMps != null && Number.isFinite(input.speedMps) ? Math.max(0, input.speedMps) : 0;
  const gpsHeading = finiteHeading(input.gpsHeading);
  const compass = finiteHeading(input.compassHeading);
  const movement =
    input.lastPosition && speed >= 0.6
      ? finiteHeading(bearingDegrees(input.lastPosition, input.currentPosition))
      : null;
  const alongRoute =
    input.routeCoords && input.routeCoords.length >= 2
      ? finiteHeading(bearingAlongRoute(input.routeCoords, input.currentPosition))
      : null;

  const walkingOrBiking = input.travelMode !== 'driving';
  const movingFast = speed >= (walkingOrBiking ? 2.2 : 1.6);
  const creeping = speed >= 0.45 && speed < 1.2;

  let next = input.previous;
  let maxStep = 18;

  if (movingFast && movement != null) {
    next = movement;
    maxStep = walkingOrBiking ? 16 : 24;
  } else if (movingFast && gpsHeading != null) {
    next = gpsHeading;
    maxStep = 20;
  } else if (compass != null && (walkingOrBiking || !movingFast)) {
    next = compass;
    maxStep = creeping ? 10 : walkingOrBiking ? 14 : 16;
  } else if (gpsHeading != null && speed >= 0.8) {
    next = gpsHeading;
    maxStep = 14;
  } else if (alongRoute != null) {
    next = alongRoute;
    maxStep = 8;
  } else if (compass != null) {
    next = compass;
    maxStep = 12;
  } else if (gpsHeading != null) {
    next = gpsHeading;
    maxStep = 10;
  }

  return smoothHeadingDegrees(input.previous, next, maxStep);
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
