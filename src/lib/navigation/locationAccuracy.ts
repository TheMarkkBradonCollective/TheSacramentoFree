import type { GpsAccuracyTier } from './types';

export type { GpsAccuracyTier };

/** Maximum age of a GPS fix before it is discarded. */
export const NAV_STALE_GPS_MS = 60_000;

export function accuracyTier(accuracyMeters: number | null | undefined): GpsAccuracyTier {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters) || accuracyMeters < 0) {
    return 'moderate';
  }
  if (accuracyMeters <= 10) return 'excellent';
  if (accuracyMeters <= 25) return 'good';
  if (accuracyMeters <= 50) return 'moderate';
  if (accuracyMeters <= 100) return 'poor';
  return 'very_poor';
}

/** Max single-update shift allowed for each accuracy tier (meters). */
export function maxPositionShiftMeters(tier: GpsAccuracyTier): number {
  switch (tier) {
    case 'excellent':
      return 80;
    case 'good':
      return 55;
    case 'moderate':
      return 35;
    case 'poor':
      return 18;
    case 'very_poor':
      return 8;
  }
}

export function shouldShowLowAccuracyWarning(tier: GpsAccuracyTier): boolean {
  return tier === 'poor' || tier === 'very_poor';
}

export function shouldSnapToRoute(tier: GpsAccuracyTier): boolean {
  return tier !== 'very_poor';
}

export function locationSmoothingHalfLifeMs(tier: GpsAccuracyTier, driving: boolean): number {
  const base = driving ? 95 : 75;
  switch (tier) {
    case 'excellent':
    case 'good':
      return base;
    case 'moderate':
      return base + 25;
    case 'poor':
      return base + 55;
    case 'very_poor':
      return base + 90;
  }
}
