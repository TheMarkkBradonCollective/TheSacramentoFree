/** Uber-style road line: dark inner path with a light casing. No Leaflet simplify. */

const SHARED = {
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
  smoothFactor: 0,
  interactive: false,
  bubblingMouseEvents: false,
};

/** Preview route on the community map — same green GPS path as turn-by-turn. */
export const ROUTE_LINE_CASING = {
  ...SHARED,
  color: '#FFFFFF',
  weight: 14,
  opacity: 1,
};

/** Remaining / preview route — Sacramento green, street-snapped. */
export const ROUTE_LINE_MAIN = {
  ...SHARED,
  color: '#00845A',
  weight: 8,
  opacity: 1,
};

/** Turn-by-turn remaining path — slightly thicker for heading-up GPS. */
export const NAV_ROUTE_LINE_CASING = {
  ...SHARED,
  color: '#FFFFFF',
  weight: 16,
  opacity: 1,
};

export const NAV_ROUTE_LINE_MAIN = {
  ...SHARED,
  color: '#00845A',
  weight: 9,
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
