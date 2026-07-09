import type { LatLng } from './mapRoute';
import { haversineMeters } from './mapRoute';

function latLngFromCoord(coord: [number, number]): LatLng {
  return { lat: coord[0], lng: coord[1] };
}

function projectOntoSegment(
  user: LatLng,
  a: LatLng,
  b: LatLng,
): { point: LatLng; along: number; segmentIndex: number } {
  const latScale = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const ax = a.lng * latScale;
  const ay = a.lat;
  const bx = b.lng * latScale;
  const by = b.lat;
  const px = user.lng * latScale;
  const py = user.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { point: a, along: 0, segmentIndex: 0 };
  }

  const along = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return {
    point: { lat: ay + along * dy, lng: (ax + along * dx) / latScale },
    along,
    segmentIndex: 0,
  };
}

export interface RouteProjection {
  snapped: LatLng;
  segmentIndex: number;
  along: number;
  distanceMeters: number;
}

/** Nearest point on the route polyline to the user. */
export function projectOntoRoute(coords: [number, number][], user: LatLng): RouteProjection {
  if (coords.length === 0) {
    return { snapped: user, segmentIndex: 0, along: 0, distanceMeters: Infinity };
  }
  if (coords.length === 1) {
    const point = latLngFromCoord(coords[0]);
    return {
      snapped: point,
      segmentIndex: 0,
      along: 0,
      distanceMeters: haversineMeters(user, point),
    };
  }

  let best: RouteProjection = {
    snapped: latLngFromCoord(coords[0]),
    segmentIndex: 0,
    along: 0,
    distanceMeters: Infinity,
  };

  for (let i = 0; i < coords.length - 1; i++) {
    const a = latLngFromCoord(coords[i]);
    const b = latLngFromCoord(coords[i + 1]);
    const projection = projectOntoSegment(user, a, b);
    const distanceMeters = haversineMeters(user, projection.point);
    if (distanceMeters < best.distanceMeters) {
      best = {
        snapped: projection.point,
        segmentIndex: i,
        along: projection.along,
        distanceMeters,
      };
    }
  }

  return best;
}

/** Default snap radius — must stay below the off-route threshold (55 m). */
export const NAV_SNAP_MAX_METERS = 35;

export function snapPositionToRoute(
  coords: [number, number][],
  user: LatLng,
  maxSnapMeters = NAV_SNAP_MAX_METERS,
): LatLng {
  const projection = projectOntoRoute(coords, user);
  return projection.distanceMeters <= maxSnapMeters ? projection.snapped : user;
}

export interface RouteProgressSplit {
  traveled: [number, number][];
  remaining: [number, number][];
  projection: RouteProjection;
}

/** Split a route into completed and upcoming geometry at the user's position. */
export function splitRouteProgress(coords: [number, number][], user: LatLng): RouteProgressSplit {
  if (coords.length < 2) {
    return {
      traveled: [],
      remaining: coords.slice(),
      projection: projectOntoRoute(coords, user),
    };
  }

  const projection = projectOntoRoute(coords, user);
  const { segmentIndex, snapped } = projection;
  const traveled: [number, number][] = coords.slice(0, segmentIndex + 1);
  traveled.push([snapped.lat, snapped.lng]);

  const remaining: [number, number][] = [[snapped.lat, snapped.lng]];
  // Always include the current segment end so we never drop a bend at the
  // projection point (along ≈ 1 previously skipped segmentIndex + 1).
  remaining.push(...coords.slice(segmentIndex + 1));

  if (remaining.length < 2 && coords.length >= 2) {
    const end = coords[coords.length - 1];
    if (remaining.length === 1) remaining.push(end);
  }

  return { traveled, remaining, projection };
}
