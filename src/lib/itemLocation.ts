import { ItemPost, PostType, extractGPSCoordinates, convertPercentToLatLng, NEIGHBORHOOD_LAT_LONGS } from '../types';
import type { LatLng } from './mapRoute';

export { convertPercentToLatLng };
import { getListingDetailsText, parseListingDetails, parsePickupNotes } from './listingContent';

export const CATEGORIES_REQUIRING_GPS = ['Curb Alert', 'Porch Pickup'] as const;

export function categoryRequiresGps(category: string): boolean {
  return (CATEGORIES_REQUIRING_GPS as readonly string[]).includes(category);
}

export function isLocationPrivate(description: string): boolean {
  return /\[LOCATION:\s*private\]/i.test(description || '');
}

export function hasStoredGps(description: string): boolean {
  return !!extractGPSCoordinates(description || '');
}

/** Whether map/detail may show exact pin to this viewer. */
export function canViewerSeeExactLocation(
  item: ItemPost,
  viewerUserId: string | undefined,
): boolean {
  if (!hasStoredGps(item.description)) return false;
  if (item.userId === viewerUserId) return true;
  return !isLocationPrivate(item.description);
}

/** Exact pickup pin when visible; otherwise neighborhood center for map/navigation fallback. */
export function getItemMapDestination(
  item: ItemPost,
  viewerUserId: string | undefined,
): LatLng | null {
  if (canViewerSeeExactLocation(item, viewerUserId)) {
    const gps = extractGPSCoordinates(item.description);
    if (gps) return convertPercentToLatLng(gps.x, gps.y);
  }
  const neighborhood = NEIGHBORHOOD_LAT_LONGS[item.neighborhood];
  if (neighborhood) return { lat: neighborhood.lat, lng: neighborhood.lng };
  return null;
}

export function hasExactMapPin(item: ItemPost, viewerUserId: string | undefined): boolean {
  return canViewerSeeExactLocation(item, viewerUserId) && hasStoredGps(item.description);
}

export function stripListingMetadata(description: string): string {
  return getListingDetailsText(description);
}

export function parseTradeSeeking(description: string): string | null {
  const match = description.match(/\[TRADE_SEEKING:\s*(.+?)\]/i);
  return match ? match[1].trim() : null;
}

export function buildListingDescription(params: {
  type: PostType;
  details: string;
  pickupNotes?: string;
  collectionMethod?: string;
  tradeSeeking?: string;
  customCoords: { x: number; y: number } | null;
  locationIsPublic: boolean;
  pickupAddress?: string;
}): string {
  const parts: string[] = [];

  if (params.type === 'looking' && params.collectionMethod) {
    parts.push(`[TRANSPORT: ${params.collectionMethod}]`, '');
  }

  if (params.type === 'trade' && params.tradeSeeking?.trim()) {
    parts.push(`[TRADE_SEEKING: ${params.tradeSeeking.trim()}]`, '');
  }

  parts.push(`[DETAILS]\n${params.details.trim()}\n[/DETAILS]`);

  if (params.pickupNotes?.trim()) {
    parts.push(`[PICKUP_NOTES]\n${params.pickupNotes.trim()}\n[/PICKUP_NOTES]`);
  }

  if (params.pickupAddress?.trim()) {
    parts.push('', `[ADDRESS: ${params.pickupAddress.trim()}]`);
  }

  if (params.customCoords) {
    parts.push('', `[LOCATION: ${params.locationIsPublic ? 'public' : 'private'}]`);
    parts.push(
      `[GPS: ${params.customCoords.x.toFixed(2)},${params.customCoords.y.toFixed(2)}]`,
    );
  }

  return parts.join('\n').trim();
}

export function parsePickupAddress(description: string): string | null {
  const match = description.match(/\[ADDRESS:\s*(.+?)\]/i);
  return match ? match[1].trim() : null;
}

export function formatPickupLocationMessage(item: ItemPost): string {
  const gps = extractGPSCoordinates(item.description);
  const address = parsePickupAddress(item.description);

  if (gps) {
    const { lat, lng } = convertPercentToLatLng(gps.x, gps.y);
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    let msg = `📍 Pickup location for "${item.title}":\n${mapsUrl}\nNeighborhood: ${item.neighborhood}`;
    if (address) msg += `\nAddress: ${address}`;
    return msg;
  }

  if (address) {
    return `📍 Pickup address for "${item.title}":\n${address}\nNeighborhood: ${item.neighborhood}`;
  }

  return `📍 This item is in ${item.neighborhood}. Message me here for the exact pickup spot.`;
}

export function parseItemForEditForm(item: ItemPost) {
  const full = item.description || '';
  let collectionMethod = 'Willing to pick up (I have transport)';
  let tradeSeeking = '';
  let customCoords: { x: number; y: number } | null = null;
  let pickupAddress: string | null = null;
  const locationIsPublic = !isLocationPrivate(full);

  let details = parseListingDetails(full);
  const pickupNotes = parsePickupNotes(full);

  let working = full;
  if (item.type === 'trade') {
    const tradeMatch = working.match(/^\[TRADE_SEEKING:\s*(.+?)\]\s*\n\n/s);
    if (tradeMatch) {
      tradeSeeking = tradeMatch[1].trim();
      working = working.slice(tradeMatch[0].length);
    }
  }
  if (item.type === 'looking') {
    const transportMatch = working.match(/^\[TRANSPORT:\s*(.+?)\]\s*\n\n/s);
    if (transportMatch) {
      collectionMethod = transportMatch[1].trim();
      working = working.slice(transportMatch[0].length);
    }
  }

  working = working.replace(/\[PICKUP_NOTES\][\s\S]*?\[\/PICKUP_NOTES\]\s*/gi, '');
  working = working.replace(/\[DETAILS\][\s\S]*?\[\/DETAILS\]\s*/gi, '');

  if (!details) {
    pickupAddress = parsePickupAddress(working);
    if (pickupAddress) {
      working = working.replace(/\[ADDRESS:\s*.+?\]\s*/gi, '').trim();
    }
    working = working.replace(/\[LOCATION:\s*(public|private)\]\s*/gi, '').trim();
    const gpsMatch = working.match(/\n\n\[GPS:\s*([\d.]+),([\d.]+)\]\s*$/);
    if (gpsMatch) {
      customCoords = { x: parseFloat(gpsMatch[1]), y: parseFloat(gpsMatch[2]) };
      working = working.slice(0, gpsMatch.index).trim();
    }
    working = working.replace(/\n\n\[PHOTOS:[^\]]+\]\s*/gi, '');
    working = working.replace(/\n\n\[Photo\]:\s*https?:\/\/\S+\s*/g, '');
    details = working.trim();
  } else {
    pickupAddress = parsePickupAddress(full);
    const gpsMatch = full.match(/\[GPS:\s*([\d.]+),([\d.]+)\]/);
    if (gpsMatch) {
      customCoords = { x: parseFloat(gpsMatch[1]), y: parseFloat(gpsMatch[2]) };
    }
  }

  return {
    details: details.trim(),
    pickupNotes,
    collectionMethod,
    tradeSeeking,
    customCoords,
    pickupAddress: pickupAddress || '',
    locationIsPublic,
  };
}
