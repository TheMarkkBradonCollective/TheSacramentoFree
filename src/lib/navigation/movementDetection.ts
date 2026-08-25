import type { MovementState } from './types';

const WALKING_MAX_MPS = 2.4;
const DRIVING_MIN_MPS = 4.5;
const STATIONARY_MAX_DISPLACEMENT_M = 2.5;
const STATIONARY_MAX_MPS = 0.35;

/**
 * Classify movement from GPS speed and displacement between fixes.
 * Used to tune camera zoom, snap behavior, and battery strategy.
 */
export function detectMovementState(
  speedMps: number | null | undefined,
  displacementMeters: number,
  dtMs: number,
): MovementState {
  const speed = speedMps != null && Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  const dtSec = Math.max(0.001, dtMs / 1000);
  const derivedSpeed = displacementMeters / dtSec;

  const effectiveSpeed = Math.max(speed, derivedSpeed);

  if (
    displacementMeters <= STATIONARY_MAX_DISPLACEMENT_M &&
    effectiveSpeed <= STATIONARY_MAX_MPS
  ) {
    return 'stationary';
  }

  if (effectiveSpeed >= DRIVING_MIN_MPS) return 'driving';
  if (effectiveSpeed >= WALKING_MAX_MPS) return 'driving';
  return 'walking';
}

export function isMoving(state: MovementState): boolean {
  return state !== 'stationary';
}
