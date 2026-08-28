import assert from 'node:assert/strict';
import test from 'node:test';
import { coerceViewCount } from './viewCount';

test('coerceViewCount accepts numbers and numeric strings', () => {
  assert.equal(coerceViewCount(0), 0);
  assert.equal(coerceViewCount(12), 12);
  assert.equal(coerceViewCount('7'), 7);
  assert.equal(coerceViewCount('12.9'), 12);
  assert.equal(coerceViewCount(undefined), 0);
  assert.equal(coerceViewCount(null), 0);
  assert.equal(coerceViewCount('nope'), 0);
  assert.equal(coerceViewCount(-3), 0);
});
