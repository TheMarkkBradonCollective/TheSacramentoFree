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

test('on-route heading holds through GPS wiggles', () => {
  const route = northStreetWithJog();
  const here = { lat: 38.58008, lng: -121.49 };
  const locked = resolveNavHeading({
    previous: 2,
    lastPosition: { lat: 38.58007, lng: -121.49 },
    currentPosition: here,
    routeCoords: route,
    gpsHeading: 70,
    compassHeading: 95,
    speedMps: 8,
    travelMode: 'driving',
    offRouteMeters: 4,
    usePhoneCompass: false,
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
    lastPosition: { lat: 38.58, lng: -121.4897 },
    currentPosition: atTurn,
    routeCoords: route,
    gpsHeading: 88,
    speedMps: 9,
    travelMode: 'driving',
    offRouteMeters: 3,
    usePhoneCompass: false,
  });
  assert.ok(Math.abs(headingDeltaDegrees(0, next)) < 40, `expected north after the turn, got ${next}`);
});

test('stationary off-route heading ignores phone rotation unless compass setting is on', () => {
  const held = resolveNavHeading({
    previous: 45,
    lastPosition: { lat: 38.58, lng: -121.49 },
    currentPosition: { lat: 38.58, lng: -121.49 },
    routeCoords: null,
    compassHeading: 200,
    speedMps: 0,
    usePhoneCompass: false,
    offRouteMeters: 80,
  });
  assert.equal(held, 45);

  const withCompass = resolveNavHeading({
    previous: 45,
    lastPosition: { lat: 38.58, lng: -121.49 },
    currentPosition: { lat: 38.58, lng: -121.49 },
    routeCoords: null,
    compassHeading: 200,
    speedMps: 0,
    usePhoneCompass: true,
    offRouteMeters: 80,
  });
  assert.notEqual(withCompass, 45);
  assert.ok(Math.abs(headingDeltaDegrees(200, withCompass)) < 170);
});

test('movement bearing drives heading when traveling off-route', () => {
  const next = resolveNavHeading({
    previous: 10,
    lastPosition: { lat: 38.58, lng: -121.49 },
    currentPosition: { lat: 38.58006, lng: -121.49 },
    routeCoords: null,
    speedMps: 6,
    travelMode: 'driving',
    usePhoneCompass: false,
    offRouteMeters: 80,
  });
  assert.ok(Math.abs(headingDeltaDegrees(0, next)) < 20, `expected northbound movement, got ${next}`);
});

test('slow walking updates heading with a short GPS step', () => {
  const next = resolveNavHeading({
    previous: 10,
    lastPosition: { lat: 38.58, lng: -121.49 },
    currentPosition: { lat: 38.58003, lng: -121.49 },
    routeCoords: null,
    speedMps: 1.1,
    travelMode: 'walking',
    usePhoneCompass: false,
    offRouteMeters: 80,
  });
  assert.ok(Math.abs(headingDeltaDegrees(0, next)) < 25, `expected northbound walk, got ${next}`);
});
