import assert from 'node:assert/strict';
import test from 'node:test';
import type { ItemPost } from '../types';
import {
  bothNeighborsCoordinationEnabled,
  coordProfilesForListingDm,
} from './goGetCoordinationGating';

function item(overrides: Partial<ItemPost> = {}): ItemPost {
  return {
    id: 'item_1',
    userId: 'poster',
    title: 'Chair',
    type: 'giveaway',
    status: 'active',
    category: 'Furniture',
    neighborhood: 'Midtown',
    userDisplayName: 'Avery',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as ItemPost;
}

test('coordProfilesForListingDm maps poster and neighbor correctly', () => {
  const listing = item();
  const poster = { uid: 'poster', goGetEnabled: true };
  const neighbor = { uid: 'neighbor', goGetEnabled: true };
  const fromPoster = coordProfilesForListingDm(listing, poster, neighbor);
  assert.equal(fromPoster.posterProfile.uid, 'poster');
  assert.equal(fromPoster.pickerProfile.uid, 'neighbor');
  const fromNeighbor = coordProfilesForListingDm(listing, neighbor, poster);
  assert.equal(fromNeighbor.posterProfile.uid, 'poster');
  assert.equal(fromNeighbor.pickerProfile.uid, 'neighbor');
});

test('Meet requires both neighbors to have coordination enabled', () => {
  const posterOn = { uid: 'poster', goGetEnabled: true };
  const neighborOn = { uid: 'neighbor', goGetEnabled: true };
  const neighborOff = { uid: 'neighbor', goGetEnabled: false };

  assert.equal(bothNeighborsCoordinationEnabled({ posterProfile: posterOn, pickerProfile: neighborOn }).ok, true);
  assert.equal(
    bothNeighborsCoordinationEnabled({ posterProfile: posterOn, pickerProfile: neighborOff }).ok,
    false,
  );
  assert.equal(
    bothNeighborsCoordinationEnabled({
      posterProfile: { uid: 'poster', goGetEnabled: false },
      pickerProfile: neighborOn,
    }).ok,
    false,
  );
});
