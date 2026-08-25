import assert from 'node:assert/strict';
import test from 'node:test';
import type { UserProfile } from '../types';

const memory: Record<string, string> = {};
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => memory[key] ?? null,
      setItem: (key: string, value: string) => {
        memory[key] = value;
      },
      removeItem: (key: string) => {
        delete memory[key];
      },
    },
    dispatchEvent: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});

const { reconcileProfileWithStoredPreferences } = await import('./profilePrefsReconcile');
const { writeStoredGoGetPrefs } = await import('./goGetPrefs');

const baseProfile: UserProfile = {
  uid: 'user-goget-test',
  displayName: 'Test Neighbor',
  email: 'test@example.com',
  neighborhood: 'Midtown',
  role: 'user',
  goGetEnabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

test('reconcile keeps local Go Get opt-in until the cloud row matches', () => {
  writeStoredGoGetPrefs({
    uid: baseProfile.uid,
    goGetEnabled: true,
    pickupAvailability: null,
    goGetRingDurationSeconds: 140,
    goGetRingPattern: 'ring',
    savedAt: Date.now() - 120_000,
  });

  const reconciled = reconcileProfileWithStoredPreferences(baseProfile);
  assert.equal(reconciled.goGetEnabled, true);
});

test('reconcile uses cloud Go Get prefs once they match local saves', () => {
  writeStoredGoGetPrefs({
    uid: baseProfile.uid,
    goGetEnabled: true,
    pickupAvailability: null,
    goGetRingDurationSeconds: 140,
    goGetRingPattern: 'ring',
    savedAt: Date.now() - 120_000,
  });

  const reconciled = reconcileProfileWithStoredPreferences({
    ...baseProfile,
    goGetEnabled: true,
  });
  assert.equal(reconciled.goGetEnabled, true);
});
