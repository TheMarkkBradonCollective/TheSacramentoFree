import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOsrmRouteUrl, osrmProfilePath } from './osrmProfile';

test('osrmProfilePath maps travel modes to OSRM profiles', () => {
  assert.equal(osrmProfilePath('driving'), 'driving');
  assert.equal(osrmProfilePath('walking'), 'foot');
  assert.equal(osrmProfilePath('cycling'), 'cycling');
});

test('buildOsrmRouteUrl uses dedicated host profile segment', () => {
  const url = buildOsrmRouteUrl(
    'https://routing.openstreetmap.de/routed-bike',
    '0,0;1,1',
    'cycling',
    true,
  );
  assert.match(url, /\/route\/v1\/driving\//);
});

test('buildOsrmRouteUrl uses foot profile on generic OSRM host for walking', () => {
  const url = buildOsrmRouteUrl(
    'https://router.project-osrm.org',
    '0,0;1,1',
    'walking',
    false,
  );
  assert.match(url, /\/route\/v1\/foot\//);
});
