import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isOverSafetyWindow,
  staffBypassesSafetyCooldowns,
  VOTE_BURST_MAX_NEW_VOTES,
  VOTE_COOLDOWN_MAX_NEW_VOTES,
} from './safetyCooldowns';

test('staff mode bypasses neighbor vote cooldowns', () => {
  assert.equal(
    staffBypassesSafetyCooldowns({ role: 'city_moderator', staffInteractionMode: 'staff' }),
    true,
  );
  assert.equal(
    staffBypassesSafetyCooldowns({ role: 'director', staffInteractionMode: 'staff' }),
    true,
  );
});

test('staff in neighbor mode still has cooldowns', () => {
  assert.equal(
    staffBypassesSafetyCooldowns({ role: 'city_moderator', staffInteractionMode: 'neighbor' }),
    false,
  );
});

test('regular neighbors never bypass cooldowns', () => {
  assert.equal(staffBypassesSafetyCooldowns({ role: 'user' }), false);
  assert.equal(staffBypassesSafetyCooldowns(null), false);
});

test('vote burst fills before the longer window', () => {
  assert.equal(isOverSafetyWindow(VOTE_BURST_MAX_NEW_VOTES, VOTE_BURST_MAX_NEW_VOTES), true);
  assert.equal(isOverSafetyWindow(VOTE_BURST_MAX_NEW_VOTES - 1, VOTE_BURST_MAX_NEW_VOTES), false);
  assert.equal(isOverSafetyWindow(VOTE_COOLDOWN_MAX_NEW_VOTES, VOTE_COOLDOWN_MAX_NEW_VOTES), true);
});
