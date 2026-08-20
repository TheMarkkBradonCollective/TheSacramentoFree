export type MapFitPadding = {
  /** Leaflet paddingTopLeft: [left, top] */
  topLeft: [number, number];
  /** Leaflet paddingBottomRight: [right, bottom] */
  bottomRight: [number, number];
};

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
