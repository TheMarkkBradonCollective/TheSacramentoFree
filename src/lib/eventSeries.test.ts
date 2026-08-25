import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CommunityEvent } from '../types';
import {
  collapseEventSeriesForDisplay,
  pickCurrentSeriesOccurrence,
  pickSoonestPerEventSeries,
} from './eventSeries';
import { formatOccurrenceRsvpSummary } from './eventRsvp';

function event(partial: Partial<CommunityEvent> & Pick<CommunityEvent, 'id' | 'eventStartAt' | 'status'>): CommunityEvent {
  return {
    title: 'Park meetup',
    description: '',
    location: 'Southside Park',
    neighborhood: 'Downtown',
    userId: 'host',
    userDisplayName: 'Host',
    isFree: true,
    createdAt: partial.eventStartAt,
    updatedAt: partial.eventStartAt,
    seriesId: 'series_park',
    ...partial,
  };
}

const past = event({
  id: 'e-past',
  eventStartAt: '2026-01-01T18:00:00.000Z',
  status: 'past',
});
const next = event({
  id: 'e-next',
  eventStartAt: '2026-09-01T18:00:00.000Z',
  status: 'upcoming',
});
const later = event({
  id: 'e-later',
  eventStartAt: '2026-10-01T18:00:00.000Z',
  status: 'upcoming',
});
const otherPast = event({
  id: 'e-past-2',
  eventStartAt: '2026-02-01T18:00:00.000Z',
  status: 'past',
});

test('series with a later date advances to the next upcoming occurrence', () => {
  const pick = pickCurrentSeriesOccurrence([later, past, next]);
  assert.equal(pick?.id, 'e-next');
});

test('feed does not show a passed date when another date is still upcoming', () => {
  const collapsed = collapseEventSeriesForDisplay([past, later, next]);
  assert.deepEqual(
    collapsed.map((e) => e.id),
    ['e-next'],
  );
});

test('past-only lists keep every date so gone/missed stay per day', () => {
  const collapsed = collapseEventSeriesForDisplay([past, otherPast]);
  assert.deepEqual(
    collapsed.map((e) => e.id),
    ['e-past', 'e-past-2'],
  );
});

test('map pick uses the next upcoming date, not an earlier past date', () => {
  const picked = pickSoonestPerEventSeries([past, later, next]);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, 'e-next');
});

test('each date formats its own going or gone/missed counts', () => {
  assert.equal(formatOccurrenceRsvpSummary({ going: 4, gone: 0, missed: 0 }, false), '4 going');
  assert.equal(formatOccurrenceRsvpSummary({ going: 0, gone: 2, missed: 1 }, true), '2 gone · 1 missed');
});
