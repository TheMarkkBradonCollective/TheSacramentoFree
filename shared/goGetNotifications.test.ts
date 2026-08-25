import assert from 'node:assert/strict';
import test from 'node:test';
import {
  goGetFulfillerReadyTransition,
  goGetTransitionFromStatusChange,
} from './goGetNotifications';

test('status active transition notifies fulfiller on the way', () => {
  const session = {
    id: 'sess_1',
    itemId: 'item_1',
    fulfillerUserId: 'fulfiller',
    fulfillerName: 'Sam',
    requesterUserId: 'requester',
    requesterName: 'Alex',
    status: 'active' as const,
    startedAt: new Date().toISOString(),
  };
  const transition = goGetTransitionFromStatusChange(session, { status: 'scheduled' });
  assert.equal(transition?.eventType, 'go_get_started');
  assert.equal(transition?.recipientUserId, 'fulfiller');
});

test('fulfiller ready transition targets requester', () => {
  const transition = goGetFulfillerReadyTransition({
    id: 'sess_2',
    itemId: 'item_2',
    fulfillerUserId: 'fulfiller',
    fulfillerName: 'Sam',
    requesterUserId: 'requester',
    requesterName: 'Alex',
    status: 'scheduled',
  });
  assert.equal(transition.eventType, 'go_get_fulfiller_ready');
  assert.equal(transition.recipientUserId, 'requester');
});
