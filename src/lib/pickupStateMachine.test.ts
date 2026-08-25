import assert from 'node:assert/strict';
import test from 'node:test';
import type { GoGetSession } from '../types';
import {
  canPerformPickupAction,
  cancelRequiresReason,
  isTooEarlyToStartTrip,
  isWithinReadyWindow,
  travelerUserId,
} from './pickupStateMachine';

function session(overrides: Partial<GoGetSession> = {}): GoGetSession {
  return {
    id: 'ggs_1',
    itemId: 'item_1',
    itemType: 'giveaway',
    fulfillerUserId: 'poster',
    fulfillerName: 'Avery',
    requesterUserId: 'picker',
    requesterName: 'Jordan',
    chatId: 'chat_1',
    handshakeMode: 'availability',
    status: 'awaiting_availability',
    destinationLat: 38.58,
    destinationLng: -121.49,
    destinationLabel: 'Porch',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test('fulfiller can accept a live ring; requester cannot', () => {
  const ring = session();
  const ok = canPerformPickupAction({ session: ring, action: 'available_now', actorUserId: 'poster' });
  assert.equal(ok.ok, true);
  const blocked = canPerformPickupAction({ session: ring, action: 'available_now', actorUserId: 'picker' });
  assert.equal(blocked.ok, false);
});

test('requester starts the trip only after fulfiller is ready', () => {
  const scheduled = session({ status: 'scheduled', scheduledAt: new Date().toISOString() });
  const early = canPerformPickupAction({
    session: scheduled,
    action: 'start_trip',
    actorUserId: 'picker',
  });
  assert.equal(early.ok, false);

  const ready = canPerformPickupAction({
    session: { ...scheduled, fulfillerReadyAt: new Date().toISOString() },
    action: 'start_trip',
    actorUserId: 'picker',
  });
  assert.equal(ready.ok, true);
});

test('two-sided completion: only fulfiller confirms handoff from arrived', () => {
  const arrived = session({ status: 'arrived' });
  const poster = canPerformPickupAction({
    session: arrived,
    action: 'confirm_complete',
    actorUserId: 'poster',
  });
  assert.equal(poster.ok, true);
  const picker = canPerformPickupAction({
    session: arrived,
    action: 'confirm_complete',
    actorUserId: 'picker',
  });
  assert.equal(picker.ok, false);
});

test('dual-travel Meet: both neighbors can mark arrived', () => {
  const active = session({ status: 'active' });
  const picker = canPerformPickupAction({ session: active, action: 'mark_arrived', actorUserId: 'picker' });
  assert.equal(picker.ok, true);
  const poster = canPerformPickupAction({ session: active, action: 'mark_arrived', actorUserId: 'poster' });
  assert.equal(poster.ok, true);
});

test('ready window blocks marking ready hours before pickup', () => {
  const later = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  assert.equal(isTooEarlyToStartTrip(later), true);
  assert.equal(isWithinReadyWindow(new Date().toISOString()), true);
});

test('expired ring can move to awaiting_schedule; live ring cannot', () => {
  const live = session({
    ringExpiresAt: new Date(Date.now() + 30_000).toISOString(),
  });
  const blocked = canPerformPickupAction({ session: live, action: 'expire_ring', actorUserId: 'picker' });
  assert.equal(blocked.ok, false);

  const timedOut = session({
    ringExpiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  const ok = canPerformPickupAction({ session: timedOut, action: 'expire_ring', actorUserId: 'picker' });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.nextStatus, 'awaiting_schedule');
});

test('cancel requires a reason once the pickup is scheduled or live', () => {
  assert.equal(cancelRequiresReason('awaiting_availability'), false);
  assert.equal(cancelRequiresReason('scheduled'), true);
  assert.equal(cancelRequiresReason('active'), true);

  const live = session({ status: 'scheduled', scheduledAt: new Date().toISOString() });
  const missing = canPerformPickupAction({
    session: live,
    action: 'cancel',
    actorUserId: 'picker',
  });
  assert.equal(missing.ok, false);

  const ok = canPerformPickupAction({
    session: live,
    action: 'cancel',
    actorUserId: 'picker',
    cancelReason: 'Plans changed',
  });
  assert.equal(ok.ok, true);
});

test('trade Meet lets both neighbors start the trip and mark arrived', () => {
  const trade = session({
    coordinationMode: 'meet_up',
    status: 'scheduled',
    scheduledAt: new Date().toISOString(),
    fulfillerReadyAt: new Date().toISOString(),
  });
  const posterStart = canPerformPickupAction({
    session: trade,
    action: 'start_trip',
    actorUserId: 'poster',
  });
  assert.equal(posterStart.ok, true);

  const giveaway = session({
    status: 'scheduled',
    scheduledAt: new Date().toISOString(),
    fulfillerReadyAt: new Date().toISOString(),
  });
  const posterBlocked = canPerformPickupAction({
    session: giveaway,
    action: 'start_trip',
    actorUserId: 'poster',
  });
  assert.equal(posterBlocked.ok, true);

  const tradeActive = session({ coordinationMode: 'meet_up', status: 'active' });
  const posterArrive = canPerformPickupAction({
    session: tradeActive,
    action: 'mark_arrived',
    actorUserId: 'poster',
  });
  assert.equal(posterArrive.ok, true);
});

test('curb alert stays single-travel', () => {
  const curb = session({
    coordinationMode: 'curb_alert',
    status: 'scheduled',
    scheduledAt: new Date().toISOString(),
    fulfillerReadyAt: new Date().toISOString(),
  });
  const posterBlocked = canPerformPickupAction({
    session: curb,
    action: 'start_trip',
    actorUserId: 'poster',
  });
  assert.equal(posterBlocked.ok, false);
});

test('drop-off traveler is the requester (neighbor bringing the item)', () => {
  const drop = session({ coordinationMode: 'drop_off' });
  assert.equal(travelerUserId(drop), 'picker');
});
