import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clipRouteAhead, followRouteLine, splitRouteProgress } from './navMapGeometry';
import { haversineMeters } from './mapRoute';

/** Straight north route: ~111 m per 0.001° latitude. */
function northRoute(points: number): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    coords.push([38.58 + i * 0.001, -121.49]);
  }
  return coords;
}

test('remaining line starts at the user so traveled path shrinks behind', () => {
  const coords = northRoute(20);
  const user = { lat: 38.585, lng: -121.49 };
  const split = splitRouteProgress(coords, user);
  const start = split.remaining[0];
  assert.ok(start, 'remaining should exist');
  assert.ok(
    haversineMeters(user, { lat: start[0], lng: start[1] }) < 2,
    `remaining should start at the puck, got ${start}`,
  );
  const traveledEnd = split.traveled[split.traveled.length - 1];
  assert.ok(traveledEnd);
  assert.ok(haversineMeters(user, { lat: traveledEnd[0], lng: traveledEnd[1] }) < 2);
});

test('lookahead window extends farther along the route as the user moves', () => {
  const coords = northRoute(80);
  const ahead = 4500;
  const startUser = { lat: 38.58, lng: -121.49 };
  const laterUser = { lat: 38.59, lng: -121.49 }; // ~1.1 km north

  const first = followRouteLine(coords, startUser, ahead);
  const later = followRouteLine(coords, laterUser, ahead);

  assert.ok(first.length >= 2 && later.length >= 2);
  const firstEnd = first[first.length - 1];
  const laterEnd = later[later.length - 1];
  assert.ok(laterEnd[0] > firstEnd[0] + 0.005, `far end should extend north, ${firstEnd[0]} → ${laterEnd[0]}`);

  const laterStart = later[0];
  assert.ok(
    haversineMeters(laterUser, { lat: laterStart[0], lng: laterStart[1] }) < 2,
    'moved remaining should still start at the puck',
  );

  const firstLen = haversineMeters({ lat: first[0][0], lng: first[0][1] }, { lat: firstEnd[0], lng: firstEnd[1] });
  const laterLen = haversineMeters({ lat: later[0][0], lng: later[0][1] }, { lat: laterEnd[0], lng: laterEnd[1] });
  assert.ok(Math.abs(firstLen - ahead) < 80, `first window ~${ahead}m, got ${firstLen}`);
  assert.ok(Math.abs(laterLen - ahead) < 80, `later window ~${ahead}m, got ${laterLen}`);
});

test('clipRouteAhead keeps a sliding meter budget', () => {
  const remaining: [number, number][] = northRoute(50);
  const clipped = clipRouteAhead(remaining, 1000);
  assert.ok(clipped.length >= 2);
  let acc = 0;
  for (let i = 1; i < clipped.length; i++) {
    acc += haversineMeters(
      { lat: clipped[i - 1][0], lng: clipped[i - 1][1] },
      { lat: clipped[i][0], lng: clipped[i][1] },
    );
  }
  assert.ok(Math.abs(acc - 1000) < 5, `expected ~1000m, got ${acc}`);
});
