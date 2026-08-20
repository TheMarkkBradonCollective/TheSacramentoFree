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
  const { mapElement, obstructingElements = [], defaults = {}, margin = 16 } = options;
  const mapRect = mapElement.getBoundingClientRect();

  let top = defaults.top ?? 48;
  let bottom = defaults.bottom ?? 48;
  const left = defaults.left ?? 48;
  const right = defaults.right ?? 48;

  for (const el of obstructingElements) {
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const intersectsVertically = rect.bottom > mapRect.top && rect.top < mapRect.bottom;
    if (!intersectsVertically) continue;

    if (rect.top >= mapRect.top && rect.top < mapRect.bottom) {
      const overlapFromBottom = mapRect.bottom - rect.top;
      if (overlapFromBottom > 0) {
        bottom = Math.max(bottom, overlapFromBottom + margin);
      }
    }

    if (rect.top < mapRect.top && rect.bottom > mapRect.top) {
      const overlapFromTop = rect.bottom - mapRect.top;
      if (overlapFromTop > 0) {
        top = Math.max(top, overlapFromTop + margin);
      }
    }
  }

  return { topLeft: [left, top], bottomRight: [right, bottom] };
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

function alignRouteEndpointsOnScreen(
  map: L.Map,
  startLL: L.LatLng,
  endLL: L.LatLng,
  anchorX: number,
  startAnchorY: number,
  endAnchorY: number,
): void {
  const startPt = map.latLngToContainerPoint(startLL);
  const endPt = map.latLngToContainerPoint(endLL);
  const panY = (startAnchorY - startPt.y + endAnchorY - endPt.y) / 2;
  const panX = anchorX - (startPt.x + endPt.x) / 2;
  if (Math.abs(panX) > 0.5 || Math.abs(panY) > 0.5) {
    map.panBy(L.point(panX, panY), { animate: false });
  }
}

/**
 * Fit a route preview so the user sits near the bottom (above the card) and the
 * destination sits toward the top of the visible map — zoomed in enough to read
 * the path without manual pinch-zoom.
 */
export function fitRoutePreviewToViewport(options: {
  map: L.Map;
  routeCoords: [number, number][];
  start: LatLngLike;
  end: LatLngLike;
  padding: MapFitPadding;
  maxZoom?: number;
  minZoom?: number;
}): void {
  const { map, routeCoords, start, end, padding, maxZoom = 17, minZoom } = options;
  const size = map.getSize();
  if (size.x <= 0 || size.y <= 0 || routeCoords.length < 2) return;

  const innerLeft = padding.topLeft[0];
  const innerTop = padding.topLeft[1];
  const innerRight = size.x - padding.bottomRight[0];
  const innerBottom = size.y - padding.bottomRight[1];
  const innerWidth = Math.max(48, innerRight - innerLeft);
  const innerHeight = Math.max(48, innerBottom - innerTop);

  const startLL = L.latLng(start.lat, start.lng);
  const endLL = L.latLng(end.lat, end.lng);

  const startAnchorY = innerTop + innerHeight * 0.86;
  const endAnchorY = innerTop + innerHeight * 0.14;
  const anchorX = innerLeft + innerWidth * 0.5;
  const targetVertSpan = Math.max(32, startAnchorY - endAnchorY);

  const zMin = minZoom ?? map.getMinZoom();
  const zMax = Math.min(maxZoom, map.getMaxZoom());

  const endpointSpanMeters = startLL.distanceTo(endLL);
  if (endpointSpanMeters < 35) {
    map.setView(startLL, Math.min(zMax, 16), { animate: false });
    return;
  }

  let chosenZoom = zMin;
  for (let z = zMax; z >= zMin; z -= 1) {
    const s = map.project(startLL, z);
    const e = map.project(endLL, z);
    const vertSpan = Math.abs(e.y - s.y);
    const horizSpan = Math.abs(e.x - s.x);
    if (vertSpan <= targetVertSpan * 0.96 && horizSpan <= innerWidth * 0.94) {
      chosenZoom = z;
      break;
    }
    if (z === zMin) chosenZoom = zMin;
  }

  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;
  map.setView([midLat, midLng], chosenZoom, { animate: false });
  alignRouteEndpointsOnScreen(map, startLL, endLL, anchorX, startAnchorY, endAnchorY);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (
      !routeOverflowsInnerViewport(map, routeCoords, innerLeft, innerTop, innerRight, innerBottom)
    ) {
      break;
    }
    const z = map.getZoom();
    if (z <= zMin) break;
    map.setZoom(z - 1, { animate: false });
    alignRouteEndpointsOnScreen(map, startLL, endLL, anchorX, startAnchorY, endAnchorY);
  }
}
