/** Community map basemap — SacramentoMapView and in-app navigation share this. */
/**
 * Esri World Street Map. CARTO's raster CDN now watermarks tiles without an API key
 * ("API KEY REQUIRED" / carto.com/basemaps/apikey). Esri needs no key and zooms to 19.
 * Note Esri's XYZ order is {z}/{y}/{x}, not OpenStreetMap's {z}/{x}/{y}.
 */
export const SBN_MAP_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

export const SBN_MAP_TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> — Esri, TomTom, Garmin, FAO, NOAA, USGS';

export const SBN_MAP_TILE_OPTIONS = {
  maxZoom: 19,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 3,
  attribution: SBN_MAP_TILE_ATTRIBUTION,
} as const;
