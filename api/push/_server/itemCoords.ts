const MAP_PICKUP_BOUNDS = {
  latMin: 38.35,
  latMax: 38.75,
  lngMin: -121.6,
  lngMax: -121.3,
} as const;

export function extractGPSCoordinates(description: string): { x: number; y: number } | null {
  if (!description) return null;
  const match = description.match(/\[GPS:\s*([\d.-]+),\s*([\d.-]+)\]/);
  if (!match) return null;
  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

export function convertPercentToLatLng(x: number, y: number): { lat: number; lng: number } {
  const { latMin, latMax, lngMin, lngMax } = MAP_PICKUP_BOUNDS;
  const lng = lngMin + (x / 100) * (lngMax - lngMin);
  const lat = latMin + (1 - y / 100) * (latMax - latMin);
  return { lat, lng };
}

export function itemCoordsFromDescription(description?: string | null): { lat: number; lng: number } | null {
  const gps = extractGPSCoordinates(String(description || ''));
  if (!gps) return null;
  return convertPercentToLatLng(gps.x, gps.y);
}
