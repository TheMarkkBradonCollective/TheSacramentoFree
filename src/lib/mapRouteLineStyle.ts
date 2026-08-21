/** Uber-style road line: dark inner path with a light casing. No Leaflet simplify. */

const SHARED = {
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
  smoothFactor: 0,
  interactive: false,
  bubblingMouseEvents: false,
};

/** Light outline so the route stays readable on Voyager tiles. */
export const ROUTE_LINE_CASING = {
  ...SHARED,
  color: '#FFFFFF',
  weight: 12,
  opacity: 1,
};

/** Remaining / preview route — charcoal, street-snapped. */
export const ROUTE_LINE_MAIN = {
  ...SHARED,
  color: '#1A1A1A',
  weight: 7,
  opacity: 1,
};

export const ROUTE_LINE_TRAVELED_CASING = {
  ...SHARED,
  color: '#FFFFFF',
  weight: 10,
  opacity: 0.75,
};

export const ROUTE_LINE_TRAVELED = {
  ...SHARED,
  color: '#9CA3AF',
  weight: 5,
  opacity: 0.9,
};
