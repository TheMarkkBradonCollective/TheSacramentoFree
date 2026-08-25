import type { LatLng } from '../mapRoute';
import type { NavTravelMode } from '../navigationSettings';
import type { NavigationRouteResult } from '../navigationRoute';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NavigationLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export type MovementState = 'stationary' | 'walking' | 'driving';

export type GpsAccuracyTier = 'excellent' | 'good' | 'moderate' | 'poor' | 'very_poor';

export type NavigationSessionStatus = 'active' | 'paused' | 'arrived' | 'cancelled' | 'failed';

export interface NavigationSession {
  id: string;
  userId: string;
  origin: Coordinates;
  destination: Coordinates;
  startedAt: string;
  endedAt?: string;
  status: NavigationSessionStatus;
  distanceMeters?: number;
  durationSeconds?: number;
}

export interface RouteOptions {
  travelMode?: NavTravelMode;
}

export interface RoutePosition {
  coordinates: LatLng;
  distanceAlongRouteMeters: number;
  distanceToRouteMeters: number;
  segmentIndex: number;
}

export type { NavigationRouteResult, NavTravelMode };

export function coordinatesFromLatLng(point: LatLng): Coordinates {
  return { latitude: point.lat, longitude: point.lng };
}

export function latLngFromCoordinates(point: Coordinates): LatLng {
  return { lat: point.latitude, lng: point.longitude };
}

export function navigationLocationFromGeolocation(position: GeolocationPosition): NavigationLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    altitude: position.coords.altitude ?? null,
    speed: position.coords.speed ?? null,
    heading: position.coords.heading ?? null,
    timestamp: position.timestamp,
  };
}
