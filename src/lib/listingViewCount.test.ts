import assert from 'node:assert/strict';
import test from 'node:test';
import { formatListingViewCount } from '../components/ListingViewBadge';

test('formatListingViewCount abbreviates large counts', () => {
  assert.equal(formatListingViewCount(0), '0');
  assert.equal(formatListingViewCount(42), '42');
  assert.equal(formatListingViewCount(1500), '1.5k');
  assert.equal(formatListingViewCount(12000), '12k');
});
