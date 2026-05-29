import { extractGPSCoordinates, convertPercentToLatLng, type ItemPost } from '../types';
import { haversineMeters } from './mapRoute';

/** ~400 ft — close enough for curb / porch contactless pickup. */
export const AT_PICKUP_MAX_METERS = 120;

export function isUserAtPickupLocation(
  userLat: number,
  userLng: number,
  item: ItemPost,
): boolean {
  const gps = extractGPSCoordinates(item.description);
  if (!gps) return false;
  const { lat, lng } = convertPercentToLatLng(gps.x, gps.y);
  return haversineMeters({ lat: userLat, lng: userLng }, { lat, lng }) <= AT_PICKUP_MAX_METERS;
}

export function pickupHasGpsPin(item: ItemPost): boolean {
  return !!extractGPSCoordinates(item.description);
}
