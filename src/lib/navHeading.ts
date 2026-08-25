import type { LatLng } from './mapRoute';
import { haversineMeters } from './mapRoute';
import { bearingAlongRoute, bearingDegrees, headingDeltaDegrees, smoothHeadingDegrees } from './navigationRoute';

export interface NavHeadingInput {
  previous: number;
  lastPosition: LatLng | null;
  currentPosition: LatLng;
  routeCoords: [number, number][] | null | undefined;
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
const MOVEMENT_MIN_METERS = 5;

function finiteHeading(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value) || value < 0) return null;
  return (value + 360) % 360;
}

function absHeadingDelta(from: number, to: number): number {
  return Math.abs(headingDeltaDegrees(from, to));
}

function settleToward(previous: number, target: number, dramatic: boolean): number {
  const delta = absHeadingDelta(previous, target);
  if (delta < NAV_HEADING_HOLD_DEG) return previous;
  if (dramatic || delta >= NAV_HEADING_DRAMATIC_DEG) {
    return smoothHeadingDegrees(previous, target, 62);
  }
  return smoothHeadingDegrees(previous, target, 10);
}

function movementBearing(lastPosition: LatLng | null, currentPosition: LatLng): number | null {
  if (!lastPosition) return null;
  const movedMeters = haversineMeters(lastPosition, currentPosition);
  if (movedMeters < MOVEMENT_MIN_METERS) return null;
  return finiteHeading(bearingDegrees(lastPosition, currentPosition));
}

/**
 * Keep the puck on the street using movement and route geometry only — never phone
 * compass or device-reported heading (which wiggles when the phone is rotated).
 */
export function resolveNavHeading(input: NavHeadingInput): number {
  const movement = movementBearing(input.lastPosition, input.currentPosition);
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

  let target = input.previous;
  if (movement != null) {
    target = movement;
  } else if (alongRoute != null) {
    target = alongRoute;
  }

  return settleToward(input.previous, target, false);
}
