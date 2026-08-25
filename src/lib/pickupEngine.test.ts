import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARRIVAL_GEOFENCE_METERS,
  coordinationModeFromItem,
  formatPickupCountdown,
  formatRingCountdown,
  handshakeModeForCoordination,
  isNavigationOnlyMode,
  pickupModeConfigForItem,
  pickupStartActionForItem,
} from './pickupEngine';
import type { ItemPost } from '../types';

function item(overrides: Partial<ItemPost>): ItemPost {
  return {
    id: '1',
    userId: 'u1',
    title: 'Chair',
    description: '',
    category: 'Furniture',
    neighborhood: 'Midtown',
    type: 'giveaway',
    status: 'active',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as ItemPost;
}

test('coordination modes follow listing type', () => {
  assert.equal(coordinationModeFromItem(item({ type: 'giveaway' })), 'go_get');
  assert.equal(coordinationModeFromItem(item({ type: 'giveaway', category: 'Curb Alert' })), 'curb_alert');
  assert.equal(coordinationModeFromItem(item({ type: 'giveaway', category: 'Porch Pickup' })), 'porch_pickup');
  assert.equal(coordinationModeFromItem(item({ type: 'looking' })), 'drop_off');
  assert.equal(coordinationModeFromItem(item({ type: 'trade' })), 'meet_up');
  assert.equal(pickupModeConfigForItem(item({ type: 'trade' })).bothTravel, true);
  assert.equal(pickupModeConfigForItem(item({ type: 'giveaway' })).bothTravel, true);
  assert.equal(pickupModeConfigForItem(item({ type: 'looking' })).bothTravel, true);
  assert.equal(pickupModeConfigForItem(item({ type: 'giveaway', category: 'Curb Alert' })).bothTravel, false);
});

test('mode matrix: curb has instant trip sharing; go get has the full engine', () => {
  const curb = pickupModeConfigForItem(item({ category: 'Curb Alert' }));
  assert.equal(curb.availability, false);
  assert.equal(curb.handoff, false);
  assert.equal(curb.navigation, true);
  assert.equal(curb.liveLocation, true);
  assert.equal(isNavigationOnlyMode(curb.mode), false);
  assert.equal(pickupStartActionForItem(item({ category: 'Curb Alert' })), 'create_session');

  const goGet = pickupModeConfigForItem(item({}));
  assert.equal(goGet.availability, true);
  assert.equal(goGet.schedule, true);
  assert.equal(goGet.liveLocation, true);
  assert.equal(goGet.handoff, true);
  assert.equal(handshakeModeForCoordination(goGet.mode), 'availability');
});

test('porch pickup is instant with live location and handoff', () => {
  const porch = pickupModeConfigForItem(item({ category: 'Porch Pickup' }));
  assert.equal(porch.handshakeMode, 'instant');
  assert.equal(porch.availability, false);
  assert.equal(porch.liveLocation, true);
  assert.equal(porch.handoff, true);
  assert.equal(pickupStartActionForItem(item({ category: 'Porch Pickup' })), 'create_session');
});

test('curb alert start action creates an instant trip session', () => {
  assert.equal(pickupStartActionForItem(item({ category: 'Curb Alert' })), 'create_session');
  assert.equal(pickupStartActionForItem(item({})), 'create_session');
});

test('ring countdown formats as m:ss', () => {
  assert.equal(formatRingCountdown(23), '0:23');
  assert.equal(formatRingCountdown(140), '2:20');
  assert.equal(formatRingCountdown(0), '0:00');
});

test('pickup countdown uses minutes until scheduled time', () => {
  const inFortyTwo = new Date(Date.now() + 42 * 60 * 1000).toISOString();
  assert.equal(formatPickupCountdown(inFortyTwo), 'Pickup in 42 minutes');
});

test('arrival geofence is an assist radius, not a city-block', () => {
  assert.ok(ARRIVAL_GEOFENCE_METERS >= 40);
  assert.ok(ARRIVAL_GEOFENCE_METERS <= 150);
});
