import assert from 'node:assert/strict';
import test from 'node:test';
import { SBN_MAP_TILE_ATTRIBUTION, SBN_MAP_TILE_OPTIONS, SBN_MAP_TILE_URL } from './mapTiles';

test('basemap URL is a no-key raster template', () => {
  assert.match(SBN_MAP_TILE_URL, /^https:\/\//);
  assert.ok(!SBN_MAP_TILE_URL.includes('basemaps.cartocdn.com'));
  assert.ok(!SBN_MAP_TILE_URL.includes('key='));
  assert.ok(SBN_MAP_TILE_URL.includes('{z}'));
  assert.ok(SBN_MAP_TILE_URL.includes('{x}'));
  assert.ok(SBN_MAP_TILE_URL.includes('{y}'));
});

test('basemap options keep attribution and high zoom', () => {
  assert.equal(SBN_MAP_TILE_OPTIONS.maxZoom, 19);
  assert.equal(SBN_MAP_TILE_OPTIONS.attribution, SBN_MAP_TILE_ATTRIBUTION);
  assert.match(SBN_MAP_TILE_ATTRIBUTION, /Esri/i);
});
