/** Community map basemap — SacramentoMapView and in-app navigation share this. */
export const SBN_MAP_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';

export const SBN_MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

export const SBN_MAP_TILE_OPTIONS = {
  maxZoom: 19,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 3,
  attribution: SBN_MAP_TILE_ATTRIBUTION,
} as const;
