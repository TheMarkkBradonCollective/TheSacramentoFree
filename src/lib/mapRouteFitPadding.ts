import L from 'leaflet';

export type MapFitPadding = {
  /** Leaflet paddingTopLeft: [left, top] */
  topLeft: [number, number];
  /** Leaflet paddingBottomRight: [right, bottom] */
  bottomRight: [number, number];
};

type LatLngLike = { lat: number; lng: number };

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

function clampFitPadding(size: L.Point, padding: MapFitPadding, minInner = 96): MapFitPadding {
  let left = Math.max(8, padding.topLeft[0]);
  let top = Math.max(8, padding.topLeft[1]);
  let right = Math.max(8, padding.bottomRight[0]);
  let bottom = Math.max(8, padding.bottomRight[1]);

  if (left + right > size.x - minInner) {
    const scale = Math.max(0.15, (size.x - minInner) / Math.max(1, left + right));
    left *= scale;
    right *= scale;
  }
  if (top + bottom > size.y - minInner) {
    const scale = Math.max(0.15, (size.y - minInner) / Math.max(1, top + bottom));
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
  const { map, routeCoords, start, end, maxZoom = 17 } = options;
  map.invalidateSize({ animate: false });

  const size = map.getSize();
  if (size.x < 32 || size.y < 32 || routeCoords.length < 2) return;

  const padding = clampFitPadding(size, options.padding);
  const bounds = L.latLngBounds(routeCoords.map(([lat, lng]) => L.latLng(lat, lng)));
  if (start) bounds.extend(L.latLng(start.lat, start.lng));
  if (end) bounds.extend(L.latLng(end.lat, end.lng));
  if (!bounds.isValid()) return;

  const zMin = options.minZoom ?? map.getMinZoom();
  const zMax = Math.min(maxZoom, map.getMaxZoom());

  map.fitBounds(bounds, {
    paddingTopLeft: padding.topLeft,
    paddingBottomRight: padding.bottomRight,
    maxZoom: zMax,
    animate: false,
  });

  if (map.getZoom() < zMin) {
    map.setZoom(zMin, { animate: false });
  }

  const innerLeft = padding.topLeft[0];
  const innerTop = padding.topLeft[1];
  const innerRight = size.x - padding.bottomRight[0];
  const innerBottom = size.y - padding.bottomRight[1];

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!routeOverflowsInnerViewport(map, routeCoords, innerLeft, innerTop, innerRight, innerBottom)) {
      break;
    }
    const z = map.getZoom();
    if (z <= zMin) break;
    map.setZoom(z - 1, { animate: false });
  }
}
