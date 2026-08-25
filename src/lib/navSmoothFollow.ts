import type { LatLng } from './mapRoute';
import { headingDeltaDegrees } from './navigationRoute';

/** Frame-rate-independent exponential smoothing factor (0–1). */
export function expSmoothAlpha(halfLifeMs: number, dtMs: number): number {
  if (halfLifeMs <= 0 || dtMs <= 0) return 1;
  return 1 - Math.exp((-Math.LN2 * dtMs) / halfLifeMs);
}

export function lerpLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  const alpha = Math.min(1, Math.max(0, t));
  return {
    lat: from.lat + (to.lat - from.lat) * alpha,
    lng: from.lng + (to.lng - from.lng) * alpha,
  };
}

/** Shortest-path angle interpolation in degrees. */
export function lerpAngleDegrees(from: number, to: number, t: number): number {
  const alpha = Math.min(1, Math.max(0, t));
  const delta = headingDeltaDegrees(from, to);
  return (from + delta * alpha + 360) % 360;
}

export function smoothFollowLatLng(
  current: LatLng,
  target: LatLng,
  dtMs: number,
  halfLifeMs: number,
): LatLng {
  return lerpLatLng(current, target, expSmoothAlpha(halfLifeMs, dtMs));
}

export function smoothFollowAngle(
  current: number,
  target: number,
  dtMs: number,
  halfLifeMs: number,
): number {
  return lerpAngleDegrees(current, target, expSmoothAlpha(halfLifeMs, dtMs));
}

/** Faster convergence on corners; slower on straightaways to reject GPS wiggle. */
export function headingFollowHalfLifeMs(headingDelta: number): number {
  const abs = Math.abs(headingDelta);
  if (abs >= 45) return 55;
  if (abs >= 22) return 75;
  if (abs >= 10) return 110;
  return 160;
}
