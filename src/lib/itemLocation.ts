import { ItemPost, PostType, extractGPSCoordinates } from '../types';

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

export function stripListingMetadata(description: string): string {
  let text = description || '';
  text = text.replace(/^\[TRANSPORT:\s*.+?\]\s*\n\n/s, '');
  text = text.replace(/\[LOCATION:\s*(public|private)\]\s*/gi, '');
  text = text.replace(/\n\n\[GPS:\s*[\d.]+,[\d.]+\]\s*/g, '');
  text = text.replace(/\n\n\[Photo\]:\s*https?:\/\/\S+\s*/g, '');
  text = text.replace(/\[ADDRESS:\s*.+?\]\s*/gi, '');
  return text.trim();
}

export function convertPercentToLatLng(x: number, y: number): { lat: number; lng: number } {
  const latMin = 38.35;
  const latMax = 38.75;
  const lngMin = -121.6;
  const lngMax = -121.3;
  const lng = lngMin + (x / 100) * (lngMax - lngMin);
  const lat = latMin + (1 - y / 100) * (latMax - latMin);
  return { lat, lng };
}

export function buildListingDescription(params: {
  type: PostType;
  body: string;
  collectionMethod?: string;
  customCoords: { x: number; y: number } | null;
  locationIsPublic: boolean;
  pickupAddress?: string;
}): string {
  const parts: string[] = [];

  if (params.type === 'looking' && params.collectionMethod) {
    parts.push(`[TRANSPORT: ${params.collectionMethod}]`, '');
  }

  parts.push(params.body.trim());

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
  let description = item.description || '';
  let collectionMethod = 'Willing to pick up (I have transport)';
  let customCoords: { x: number; y: number } | null = null;
  let pickupAddress: string | null = null;
  const locationIsPublic = !isLocationPrivate(description);

  if (item.type === 'looking') {
    const transportMatch = description.match(/^\[TRANSPORT:\s*(.+?)\]\s*\n\n/s);
    if (transportMatch) {
      collectionMethod = transportMatch[1].trim();
      description = description.slice(transportMatch[0].length);
    }
  }

  pickupAddress = parsePickupAddress(description);
  if (pickupAddress) {
    description = description.replace(/\[ADDRESS:\s*.+?\]\s*/gi, '').trim();
  }

  description = description.replace(/\[LOCATION:\s*(public|private)\]\s*/gi, '').trim();

  const gpsMatch = description.match(/\n\n\[GPS:\s*([\d.]+),([\d.]+)\]\s*$/);
  if (gpsMatch) {
    customCoords = { x: parseFloat(gpsMatch[1]), y: parseFloat(gpsMatch[2]) };
    description = description.slice(0, gpsMatch.index).trim();
  }

  const photoMatch = description.match(/\n\n\[Photo\]:\s*(https?:\/\/\S+)\s*$/);
  if (photoMatch) {
    description = description.slice(0, photoMatch.index).trim();
  }

  return {
    description: description.trim(),
    collectionMethod,
    customCoords,
    pickupAddress: pickupAddress || '',
    locationIsPublic,
  };
}
