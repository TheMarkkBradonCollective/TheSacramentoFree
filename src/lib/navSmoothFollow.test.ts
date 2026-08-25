import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  expSmoothAlpha,
  headingFollowHalfLifeMs,
  lerpAngleDegrees,
  lerpLatLng,
  smoothFollowAngle,
} from './navSmoothFollow';

test('expSmoothAlpha approaches 1 as half-life shrinks', () => {
  assert.ok(expSmoothAlpha(50, 16) > expSmoothAlpha(200, 16));
  assert.equal(expSmoothAlpha(0, 16), 1);
});

test('lerpLatLng moves halfway at t=0.5', () => {
  const mid = lerpLatLng({ lat: 0, lng: 0 }, { lat: 2, lng: 4 }, 0.5);
  assert.equal(mid.lat, 1);
  assert.equal(mid.lng, 2);
});

test('lerpAngleDegrees takes the short arc', () => {
  const next = lerpAngleDegrees(350, 10, 0.5);
  assert.ok(Math.abs(next - 0) < 2 || Math.abs(next - 360) < 2, `expected ~0°, got ${next}`);
});

test('smoothFollowAngle eases toward the target', () => {
  const eased = smoothFollowAngle(0, 90, 16, 80);
  assert.ok(eased > 0 && eased < 90, `expected partial turn, got ${eased}`);
});

test('headingFollowHalfLifeMs shortens on larger turns', () => {
  assert.ok(headingFollowHalfLifeMs(50) < headingFollowHalfLifeMs(5));
});
