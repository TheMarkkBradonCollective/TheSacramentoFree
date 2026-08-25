import type { LatLng } from '../mapRoute';
import { fetchNavigationRoute, type NavigationRouteResult } from '../navigationRoute';
import { projectOntoRoute } from '../navMapGeometry';
import type { Coordinates, RouteOptions, RoutePosition } from './types';
import { latLngFromCoordinates } from './types';

export interface RoutingService {
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: RouteOptions,
  ): Promise<NavigationRouteResult | null>;

  matchLocationToRoute(
    route: NavigationRouteResult,
    location: Coordinates,
  ): RoutePosition;
}

export const defaultRoutingService: RoutingService = {
  async getRoute(origin, destination, options = {}) {
    const from = latLngFromCoordinates(origin);
    const to = latLngFromCoordinates(destination);
    return fetchNavigationRoute(from, to, options.travelMode ?? 'driving');
  },

  matchLocationToRoute(route, location) {
    const user = latLngFromCoordinates(location);
    const projection = projectOntoRoute(route.coords, user);
    let distanceAlong = 0;
    for (let i = 0; i < projection.segmentIndex; i++) {
      const a = route.coords[i];
      const b = route.coords[i + 1];
      distanceAlong += haversineSegment(a, b);
    }
    if (projection.segmentIndex < route.coords.length - 1) {
      const a = route.coords[projection.segmentIndex];
      const b = route.coords[projection.segmentIndex + 1];
      distanceAlong += haversineSegment(a, b) * projection.along;
    }

    return {
      coordinates: projection.snapped,
      distanceAlongRouteMeters: distanceAlong,
      distanceToRouteMeters: projection.distanceMeters,
      segmentIndex: projection.segmentIndex,
    };
  },
};

function haversineSegment(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export type { NavigationRouteResult };
