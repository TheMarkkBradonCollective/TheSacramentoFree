import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  accuracyTier,
  maxPositionShiftMeters,
  shouldShowLowAccuracyWarning,
  shouldSnapToRoute,
} from './locationAccuracy';
import { detectMovementState } from './movementDetection';
import {
  createLocationManagerState,
  processGpsFix,
  resetLocationManagerState,
} from './locationManager';
import { createNavigationEngineState, processNavigationUpdate } from './navigationEngine';

function mockPosition(
  lat: number,
  lng: number,
  overrides: Partial<GeolocationCoordinates> & { timestamp?: number } = {},
): GeolocationPosition {
  const { timestamp = Date.now(), ...coords } = overrides;
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 8,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON() {
        return this;
      },
      ...coords,
    },
    timestamp,
  } as GeolocationPosition;
}

test('accuracy tiers follow spec thresholds', () => {
  assert.equal(accuracyTier(8), 'excellent');
  assert.equal(accuracyTier(20), 'good');
  assert.equal(accuracyTier(40), 'moderate');
  assert.equal(accuracyTier(80), 'poor');
  assert.equal(accuracyTier(120), 'very_poor');
});

test('very poor accuracy limits position shift', () => {
  assert.ok(maxPositionShiftMeters('very_poor') < maxPositionShiftMeters('excellent'));
});

test('movement detection classifies stationary vs walking vs driving', () => {
  assert.equal(detectMovementState(0, 0.3, 1000), 'stationary');
  assert.equal(detectMovementState(1.2, 1.5, 1000), 'walking');
  assert.equal(detectMovementState(8, 12, 1000), 'driving');
});

test('location manager suppresses stationary jitter', () => {
  const state = createLocationManagerState();
  const first = processGpsFix(mockPosition(38.58, -121.49, { speed: 0 }), state);
  assert.ok(first);
  const second = processGpsFix(
    mockPosition(38.58001, -121.49001, { speed: 0, timestamp: Date.now() + 1000 }),
    state,
  );
  assert.ok(second);
  assert.equal(second.filtered.latitude, first!.filtered.latitude);
  assert.equal(second.filtered.longitude, first!.filtered.longitude);
  resetLocationManagerState(state);
});

test('location manager clamps large jumps on poor accuracy', () => {
  const state = createLocationManagerState();
  processGpsFix(mockPosition(38.58, -121.49, { accuracy: 90 }), state);
  const jumped = processGpsFix(
    mockPosition(38.59, -121.49, { accuracy: 90, timestamp: Date.now() + 1000 }),
    state,
  );
  assert.ok(jumped);
  assert.ok(Math.abs(jumped.filtered.latitude - 38.59) > 0.0001);
});

test('navigation engine detects arrival near destination', () => {
  const engineState = createNavigationEngineState();
  const destination = { lat: 38.58, lng: -121.49 };
  const result = processNavigationUpdate(
    {
      raw: { lat: 38.579996, lng: -121.49 },
      filtered: { lat: 38.579996, lng: -121.49 },
      route: null,
      destination,
      previousHeading: 0,
      lastLogicPosition: null,
      compassHeading: null,
      gpsHeading: null,
      speedMps: 0,
      settings: {
        travelMode: 'driving',
        voiceEnabled: true,
        headingUp: true,
        usePhoneCompass: false,
        showLaneGuidance: true,
        speakOnRecenter: false,
        theme: 'auto',
      },
      movement: 'stationary',
      accuracyTier: 'good',
      arrived: false,
      stepIndex: 0,
      offRouteTicks: 0,
      lastOffRouteEvalAt: 0,
    },
    engineState,
  );
  assert.equal(result.hasArrived, true);
});

test('poor accuracy disables road snap', () => {
  assert.equal(shouldSnapToRoute('very_poor'), false);
  assert.equal(shouldShowLowAccuracyWarning('poor'), true);
});
