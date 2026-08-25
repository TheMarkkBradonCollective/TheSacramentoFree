import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bearingAlongRoute, headingDeltaDegrees } from './navigationRoute';
import { NAV_HEADING_HOLD_DEG, resolveNavHeading } from './navHeading';

/** ~111 m per 0.001° latitude. */
function northStreetWithJog(): [number, number][] {
  return [
    [38.58, -121.49],
    [38.58015, -121.49],
    [38.58017, -121.48997], // ~3 m east jog
    [38.5804, -121.49],
  ];
}

function eastThenNorth(): [number, number][] {
  return [
    [38.58, -121.49],
    [38.58, -121.4896], // east ~35 m
    [38.5804, -121.4896], // north
  ];
}

test('route bearing ignores a tiny catty-corner jog', () => {
  const heading = bearingAlongRoute(northStreetWithJog(), { lat: 38.58005, lng: -121.49 });
  assert.ok(Math.abs(headingDeltaDegrees(0, heading)) < 18, `heading ${heading} should stay northish`);
});

test('on-route heading holds through GPS/compass wiggles', () => {
  const route = northStreetWithJog();
  const here = { lat: 38.58008, lng: -121.49 };
  const locked = resolveNavHeading({
    previous: 2,
    gpsHeading: 70,
    lastPosition: { lat: 38.58007, lng: -121.49 },
    currentPosition: here,
    routeCoords: route,
    compassHeading: 95,
    speedMps: 8,
    travelMode: 'driving',
    offRouteMeters: 4,
  });
  assert.ok(
    Math.abs(headingDeltaDegrees(2, locked)) < NAV_HEADING_HOLD_DEG,
    `held heading ${locked} drifted from the street`,
  );
});

test('a real left turn on the route updates heading quickly', () => {
  const route = eastThenNorth();
  const atTurn = { lat: 38.58002, lng: -121.4896 };
  const next = resolveNavHeading({
    previous: 90,
    gpsHeading: 88,
    lastPosition: { lat: 38.58, lng: -121.4897 },
    currentPosition: atTurn,
    routeCoords: route,
    compassHeading: 40,
    speedMps: 9,
    travelMode: 'driving',
    offRouteMeters: 3,
  });
  assert.ok(Math.abs(headingDeltaDegrees(0, next)) < 40, `expected north after the turn, got ${next}`);
});
