import type { LatLng } from '../mapRoute';
import { haversineMeters } from '../mapRoute';
import { projectOntoRoute, snapPositionToRoute } from '../navMapGeometry';
import { resolveNavHeading } from '../navHeading';
import {
  findCurrentStepIndex,
  remainingRouteMeters,
  type NavigationRouteResult,
} from '../navigationRoute';
import type { NavigationSettings } from '../navigationSettings';
import { shouldSnapToRoute, type GpsAccuracyTier } from './locationAccuracy';
import type { MovementState } from './types';

export const NAV_OFF_ROUTE_THRESHOLD_M = 55;
export const NAV_OFF_ROUTE_EVAL_MS = 900;
export const NAV_OFF_ROUTE_TICKS = 4;
export const NAV_ARRIVE_DEST_M = 40;
export const NAV_ARRIVE_REMAINING_M = 40;

export type NavigationEngineInput = {
  raw: LatLng;
  filtered: LatLng;
  route: NavigationRouteResult | null;
  destination: LatLng;
  previousHeading: number;
  lastLogicPosition: LatLng | null;
  compassHeading: number | null;
  gpsHeading: number | null;
  speedMps: number | null;
  settings: NavigationSettings;
  movement: MovementState;
  accuracyTier: GpsAccuracyTier;
  arrived: boolean;
  stepIndex: number;
  offRouteTicks: number;
  lastOffRouteEvalAt: number;
};

export type NavigationEngineOutput = {
  logicPosition: LatLng;
  targetPosition: LatLng;
  targetHeading: number;
  offRouteMeters: number;
  hasArrived: boolean;
  stepIndex: number;
  stepIndexChanged: boolean;
  remainingMeters: number;
  etaSeconds: number;
  shouldRequestReroute: boolean;
  offRouteTicks: number;
  lastOffRouteEvalAt: number;
  currentlyOffRoute: boolean;
};

export type NavigationEngineState = {
  smoothedEtaSeconds: number | null;
};

export function createNavigationEngineState(): NavigationEngineState {
  return { smoothedEtaSeconds: null };
}

function computeEtaSeconds(
  route: NavigationRouteResult | null,
  remainingMeters: number,
  state: NavigationEngineState,
): number {
  if (!route || route.distanceMeters <= 0) return 0;
  const raw = Math.max(0, Math.round(route.durationSeconds * (remainingMeters / route.distanceMeters)));

  if (state.smoothedEtaSeconds == null) {
    state.smoothedEtaSeconds = raw;
    return raw;
  }

  const delta = Math.abs(raw - state.smoothedEtaSeconds);
  if (delta <= 30) {
    state.smoothedEtaSeconds = raw;
    return raw;
  }

  const eased = Math.round(state.smoothedEtaSeconds + (raw - state.smoothedEtaSeconds) * 0.35);
  state.smoothedEtaSeconds = eased;
  return eased;
}

export function processNavigationUpdate(
  input: NavigationEngineInput,
  engineState: NavigationEngineState,
  now = Date.now(),
): NavigationEngineOutput {
  const { route, destination, settings, arrived } = input;

  const projection = route && !arrived ? projectOntoRoute(route.coords, input.raw) : null;
  const offRouteDistance = projection?.distanceMeters ?? 0;

  const allowSnap = shouldSnapToRoute(input.accuracyTier) && input.movement !== 'stationary';
  const snapped =
    route && !arrived && allowSnap
      ? snapPositionToRoute(route.coords, input.filtered)
      : input.filtered;

  const logicPosition = snapped;
  const targetPosition = snapped;

  const targetHeading = resolveNavHeading({
    previous: input.previousHeading,
    lastPosition: input.lastLogicPosition,
    currentPosition: logicPosition,
    routeCoords: route?.coords,
    offRouteMeters: offRouteDistance,
    gpsHeading: input.gpsHeading,
    compassHeading: input.compassHeading,
    speedMps: input.speedMps,
    travelMode: settings.travelMode,
    usePhoneCompass: settings.usePhoneCompass,
  });

  const distToDest = haversineMeters(logicPosition, destination);
  const remainingAlongRoute = route ? remainingRouteMeters(route.coords, logicPosition) : distToDest;
  const hasArrived =
    distToDest < NAV_ARRIVE_DEST_M ||
    (route != null && remainingAlongRoute < NAV_ARRIVE_REMAINING_M && distToDest < 80);

  let stepIndex = input.stepIndex;
  let stepIndexChanged = false;
  if (route && !hasArrived) {
    const nextIdx = findCurrentStepIndex(route.steps, logicPosition, stepIndex, {
      coords: route.coords,
      distanceMeters: route.distanceMeters,
    });
    if (nextIdx !== stepIndex) {
      stepIndex = nextIdx;
      stepIndexChanged = true;
    }
  }

  let offRouteTicks = input.offRouteTicks;
  let lastOffRouteEvalAt = input.lastOffRouteEvalAt;
  let shouldRequestReroute = false;
  let currentlyOffRoute = false;

  if (route && !hasArrived && now - lastOffRouteEvalAt >= NAV_OFF_ROUTE_EVAL_MS) {
    lastOffRouteEvalAt = now;
    currentlyOffRoute = offRouteDistance > NAV_OFF_ROUTE_THRESHOLD_M;

    if (currentlyOffRoute) {
      offRouteTicks += 1;
      if (offRouteTicks >= NAV_OFF_ROUTE_TICKS) {
        shouldRequestReroute = true;
      }
    } else {
      offRouteTicks = 0;
    }
  }

  const etaSeconds = computeEtaSeconds(route, remainingAlongRoute, engineState);

  return {
    logicPosition,
    targetPosition,
    targetHeading,
    offRouteMeters: offRouteDistance,
    hasArrived,
    stepIndex,
    stepIndexChanged,
    remainingMeters: remainingAlongRoute,
    etaSeconds,
    shouldRequestReroute,
    offRouteTicks,
    lastOffRouteEvalAt,
    currentlyOffRoute,
  };
}
