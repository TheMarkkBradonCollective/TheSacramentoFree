import L from 'leaflet';
import { haversineMeters, type LatLng } from './mapRoute';

export type MapFitPadding = {
  /** Leaflet paddingTopLeft: [left, top] */
  topLeft: [number, number];
  /** Leaflet paddingBottomRight: [right, bottom] */
  bottomRight: [number, number];
};

type LatLngLike = { lat: number; lng: number };

/** Ignore vertices farther than this from the destination when fitting. */
const MAX_FIT_SPAN_M = 40_000;
/** If GPS is farther than this, frame the pin alone instead of both points. */
const MAX_PREVIEW_PAIR_M = 25_000;
/** Don't street-zoom an overview. */
const DEFAULT_FIT_MAX_ZOOM = 15;
/** Floor when we have to zoom out so the line stays on screen. */
const DEFAULT_FIT_MIN_ZOOM = 9;

/** Compute Leaflet fitBounds padding from elements that overlap the map viewport. */
export function measureMapFitPadding(options: {
  mapElement: HTMLElement;
  obstructingElements?: Array<HTMLElement | null | undefined>;
  defaults?: { top?: number; bottom?: number; left?: number; right?: number };
  margin?: number;
}): MapFitPadding {
  const { mapElement, obstructingElements = [], defaults = {}, margin = 12 } = options;
  const mapRect = mapElement.getBoundingClientRect();

  let top = defaults.top ?? 28;
  let bottom = defaults.bottom ?? 28;
  const left = defaults.left ?? 28;
  const right = defaults.right ?? 28;
  const midY = mapRect.top + mapRect.height / 2;

  for (const el of obstructingElements) {
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const intersectsVertically = rect.bottom > mapRect.top && rect.top < mapRect.bottom;
    const intersectsHorizontally = rect.right > mapRect.left && rect.left < mapRect.right;
    if (!intersectsVertically || !intersectsHorizontally) continue;

    const coversMostOfWidth = rect.width >= mapRect.width * 0.45;
    if (!coversMostOfWidth) continue;

    if (rect.top >= midY) {
      const overlapFromBottom = mapRect.bottom - rect.top;
      if (overlapFromBottom > 0) bottom = Math.max(bottom, overlapFromBottom + margin);
    } else {
      const overlapFromTop = rect.bottom - mapRect.top;
      if (overlapFromTop > 0) top = Math.max(top, overlapFromTop + margin);
    }
  }

  return { topLeft: [left, top], bottomRight: [right, bottom] };
}

function clampFitPadding(size: L.Point, padding: MapFitPadding): MapFitPadding {
  const minInner = Math.max(120, Math.round(Math.min(size.x, size.y) * 0.4));
  const maxLeft = size.x * 0.28;
  const maxRight = size.x * 0.28;
  const maxTop = size.y * 0.3;
  const maxBottom = size.y * 0.48;

  let left = Math.min(maxLeft, Math.max(8, padding.topLeft[0]));
  let top = Math.min(maxTop, Math.max(8, padding.topLeft[1]));
  let right = Math.min(maxRight, Math.max(8, padding.bottomRight[0]));
  let bottom = Math.min(maxBottom, Math.max(8, padding.bottomRight[1]));

  if (left + right > size.x - minInner) {
    const scale = Math.max(0.2, (size.x - minInner) / Math.max(1, left + right));
    left *= scale;
    right *= scale;
  }
  if (top + bottom > size.y - minInner) {
    const scale = Math.max(0.2, (size.y - minInner) / Math.max(1, top + bottom));
    top *= scale;
    bottom *= scale;
  }

  return {
    topLeft: [Math.round(left), Math.round(top)],
    bottomRight: [Math.round(right), Math.round(bottom)],
  };
}

function routeOverflowsInnerViewport(
  map: L.Map,
  routeCoords: [number, number][],
  innerLeft: number,
  innerTop: number,
  innerRight: number,
  innerBottom: number,
): boolean {
  for (const [lat, lng] of routeCoords) {
    const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
    if (pt.x < innerLeft || pt.x > innerRight || pt.y < innerTop || pt.y > innerBottom) {
      return true;
    }
  }
  return false;
}

function isFiniteLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Keep only vertices near the destination so a stale GPS origin cannot
 * explode the camera to another city.
 */
export function coordsForRouteViewportFit(
  routeCoords: [number, number][],
  dest?: LatLngLike | null,
): [number, number][] {
  const usable = routeCoords.filter(([lat, lng]) => isFiniteLatLng(lat, lng));
  if (usable.length === 0) return [];

  const anchor: LatLng =
    dest && isFiniteLatLng(dest.lat, dest.lng)
      ? { lat: dest.lat, lng: dest.lng }
      : { lat: usable[usable.length - 1][0], lng: usable[usable.length - 1][1] };

  const kept = usable.filter(([lat, lng]) => haversineMeters(anchor, { lat, lng }) <= MAX_FIT_SPAN_M);
  if (kept.length >= 2) return kept;

  const dLat = 0.0035;
  const dLng = 0.0045;
  return [
    [anchor.lat - dLat, anchor.lng - dLng],
    [anchor.lat + dLat, anchor.lng + dLng],
  ];
}

function applyFit(
  map: L.Map,
  bounds: L.LatLngBounds,
  fitCoords: [number, number][],
  padding: MapFitPadding,
  maxZoom: number,
  minZoom: number,
  dest?: LatLngLike | null,
): void {
  const size = map.getSize();
  const zMax = Math.min(maxZoom, map.getMaxZoom());
  const zMin = Math.max(minZoom, map.getMinZoom());

  map.fitBounds(bounds, {
    paddingTopLeft: padding.topLeft,
    paddingBottomRight: padding.bottomRight,
    maxZoom: zMax,
    animate: false,
  });

  // A world-scale leftover zoom means the bounds were still unusable — sit on
  // the pin instead of showing the Pacific.
  if (map.getZoom() < zMin) {
    const fallback = dest && Number.isFinite(dest.lat) ? dest : bounds.getCenter();
    map.setView([fallback.lat, fallback.lng], Math.min(14, zMax), { animate: false });
    return;
  }

  const innerLeft = padding.topLeft[0];
  const innerTop = padding.topLeft[1];
  const innerRight = size.x - padding.bottomRight[0];
  const innerBottom = size.y - padding.bottomRight[1];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!routeOverflowsInnerViewport(map, fitCoords, innerLeft, innerTop, innerRight, innerBottom)) {
      break;
    }
    const z = map.getZoom();
    if (z <= zMin) break;
    map.setZoom(z - 1, { animate: false });
  }
}

/**
 * Fit an active route so the whole path fills the visible map hole
 * (the area not covered by the listing card / nav sheet) — Uber-style.
 */
export function fitRoutePreviewToViewport(options: {
  map: L.Map;
  routeCoords: [number, number][];
  start?: LatLngLike | null;
  end?: LatLngLike | null;
  padding: MapFitPadding;
  maxZoom?: number;
  minZoom?: number;
}): void {
  const { map, end, maxZoom = DEFAULT_FIT_MAX_ZOOM, minZoom = DEFAULT_FIT_MIN_ZOOM } = options;
  map.invalidateSize({ animate: false });

  const size = map.getSize();
  if (size.x < 32 || size.y < 32) return;

  const fitCoords = coordsForRouteViewportFit(options.routeCoords, end);
  if (fitCoords.length < 2) return;

  const padding = clampFitPadding(size, options.padding);
  const bounds = L.latLngBounds(fitCoords.map(([lat, lng]) => L.latLng(lat, lng)));
  if (!bounds.isValid()) return;

  applyFit(map, bounds, fitCoords, padding, maxZoom, minZoom, end);
}

/** Show the pin (and nearby GPS) at a neighborhood zoom while the road line loads. */
export function frameSelectionPreview(options: {
  map: L.Map;
  dest: LatLngLike;
  user?: LatLngLike | null;
  padding: MapFitPadding;
  maxZoom?: number;
}): void {
  const { map, dest, user, maxZoom = DEFAULT_FIT_MAX_ZOOM } = options;
  if (!isFiniteLatLng(dest.lat, dest.lng)) return;
  map.invalidateSize({ animate: false });

  const size = map.getSize();
  if (size.x < 32 || size.y < 32) {
    map.setView([dest.lat, dest.lng], 14, { animate: false });
    return;
  }

  const nearbyUser =
    user && isFiniteLatLng(user.lat, user.lng) && haversineMeters(user, dest) <= MAX_PREVIEW_PAIR_M
      ? user
      : null;

  if (!nearbyUser) {
    map.setView([dest.lat, dest.lng], Math.min(14, maxZoom), { animate: false });
    return;
  }

  fitRoutePreviewToViewport({
    map,
    routeCoords: [
      [nearbyUser.lat, nearbyUser.lng],
      [dest.lat, dest.lng],
    ],
    end: dest,
    padding: options.padding,
    maxZoom,
  });
}
