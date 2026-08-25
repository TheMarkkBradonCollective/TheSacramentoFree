import assert from 'node:assert/strict';
import test from 'node:test';
import { meetCopyForItem, meetCopyForMode, MEET_UMBRELLA } from './meetCopy';
import { pickupModeConfigForItem } from './pickupEngine';
import type { ItemPost } from '../types';

function item(overrides: Partial<ItemPost>): ItemPost {
  return {
    id: '1',
    userId: 'u1',
    title: 'Lamp',
    description: '',
    category: 'Furniture',
    neighborhood: 'Midtown',
    type: 'giveaway',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as ItemPost;
}

test('umbrella name is Meet for every coordinated mode', () => {
  assert.equal(MEET_UMBRELLA, 'Meet');
  assert.equal(meetCopyForMode('go_get').umbrella, 'Meet');
  assert.equal(meetCopyForMode('drop_off').umbrella, 'Meet');
  assert.equal(meetCopyForMode('meet_up').umbrella, 'Meet');
});

test('trade Meet is an exchange, not a pickup', () => {
  const copy = meetCopyForItem(item({ type: 'trade' }));
  assert.match(copy.requestLine('Jordan', 'Lamp'), /meet to trade/i);
  assert.equal(copy.confirmHandoff, 'Confirm exchange');
  assert.equal(copy.startTrip, 'Start Meet');
  assert.match(copy.onTheWay('Avery'), /meetup pin/);
  assert.equal(pickupModeConfigForItem(item({ type: 'trade' })).bothTravel, true);
});

test('giveaway keeps Go Get it as the trip-start verb', () => {
  assert.equal(meetCopyForItem(item({ type: 'giveaway' })).startTrip, 'Go Get it');
});
