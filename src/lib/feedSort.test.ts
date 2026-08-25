import assert from 'node:assert/strict';
import test from 'node:test';
import { itemMatchesCoordinationFeedSort, isCoordinationFeedSort } from './feedSort';
import type { ItemPost } from '../types';

function item(overrides: Partial<ItemPost>): ItemPost {
  return {
    id: '1',
    userId: 'u1',
    title: 'Test',
    description: '',
    category: 'Furniture',
    neighborhood: 'Midtown',
    type: 'giveaway',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as ItemPost;
}

test('isCoordinationFeedSort identifies pickup coordination modes', () => {
  assert.equal(isCoordinationFeedSort('go_get'), true);
  assert.equal(isCoordinationFeedSort('drop_off'), true);
  assert.equal(isCoordinationFeedSort('new'), false);
});

test('itemMatchesCoordinationFeedSort maps listing types to coordination labels', () => {
  assert.equal(itemMatchesCoordinationFeedSort(item({ type: 'giveaway' }), 'go_get'), true);
  assert.equal(itemMatchesCoordinationFeedSort(item({ type: 'giveaway' }), 'drop_off'), false);

  assert.equal(itemMatchesCoordinationFeedSort(item({ type: 'looking' }), 'drop_off'), true);
  assert.equal(itemMatchesCoordinationFeedSort(item({ type: 'trade' }), 'meet_up'), true);

  assert.equal(
    itemMatchesCoordinationFeedSort(item({ type: 'giveaway', category: 'Curb Alert' }), 'pick_up'),
    true,
  );
  assert.equal(
    itemMatchesCoordinationFeedSort(item({ type: 'giveaway', category: 'Curb Alert' }), 'go_get'),
    false,
  );
});
