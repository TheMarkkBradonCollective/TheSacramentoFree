import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChatMeetLocation, ItemPost } from '../types';
import {
  hasCoordinationDestination,
  resolveCoordinationDestination,
} from './coordinationDestination';

function item(overrides: Partial<ItemPost>): ItemPost {
  return {
    id: 'item_1',
    userId: 'poster',
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

const chatMeet: ChatMeetLocation = {
  chatId: 'chat_1',
  itemId: 'item_1',
  setByUserId: 'poster',
  lat: 38.58,
  lng: -121.49,
  label: 'Park bench',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('chat meet location enables coordination when listing has no public pin', () => {
  const listing = item({ description: 'No pin yet' });
  assert.equal(hasCoordinationDestination(listing, 'neighbor', null), false);
  assert.equal(hasCoordinationDestination(listing, 'neighbor', chatMeet), true);
  const dest = resolveCoordinationDestination(listing, 'neighbor', chatMeet);
  assert.equal(dest?.lat, 38.58);
  assert.equal(dest?.lng, -121.49);
});
