import type { CommunityEvent } from '../types';
import { isEventUpcoming } from './eventRsvp';

function startMs(event: Pick<CommunityEvent, 'eventStartAt'>): number {
  return new Date(event.eventStartAt).getTime();
}

function sortByStartAsc(a: CommunityEvent, b: CommunityEvent): number {
  return startMs(a) - startMs(b);
}

export function isSeriesEvent(event: Pick<CommunityEvent, 'seriesId'>): boolean {
  return Boolean(event.seriesId?.trim());
}

/** All occurrences in a series, oldest date first. */
export function getSeriesOccurrences(allEvents: CommunityEvent[], seriesId: string): CommunityEvent[] {
  const id = seriesId.trim();
  if (!id) return [];
  return allEvents.filter((event) => event.seriesId === id).sort(sortByStartAsc);
}

/** Other occurrences in the same series (excludes the current event). */
export function getSeriesSiblings(allEvents: CommunityEvent[], event: CommunityEvent): CommunityEvent[] {
  const seriesId = event.seriesId?.trim();
  if (!seriesId) return [];
  return getSeriesOccurrences(allEvents, seriesId).filter((e) => e.id !== event.id);
}

/** Upcoming occurrences in a series, including the given event if upcoming. */
export function getUpcomingSeriesOccurrences(allEvents: CommunityEvent[], seriesId: string): CommunityEvent[] {
  return getSeriesOccurrences(allEvents, seriesId).filter(isEventUpcoming);
}

export function countUpcomingInSeries(allEvents: CommunityEvent[], seriesId: string): number {
  return getUpcomingSeriesOccurrences(allEvents, seriesId).length;
}

export function buildSeriesUpcomingCountMap(events: CommunityEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const seriesId = event.seriesId?.trim();
    if (!seriesId || !isEventUpcoming(event)) continue;
    counts.set(seriesId, (counts.get(seriesId) || 0) + 1);
  }
  return counts;
}

export function generateSeriesId(): string {
  return `series_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Soonest upcoming date in a group; if none, keep the most recent past date. */
export function pickCurrentSeriesOccurrence(occurrences: CommunityEvent[]): CommunityEvent | null {
  if (occurrences.length === 0) return null;
  const upcoming = occurrences.filter(isEventUpcoming).sort(sortByStartAsc);
  if (upcoming[0]) return upcoming[0];
  return [...occurrences].sort((a, b) => startMs(b) - startMs(a))[0] ?? null;
}

/**
 * One card per repeat series while any date is still upcoming — always the next date,
 * never a passed occurrence that still has a later date.
 * When the list is only past dates (Past filter), keep every date so gone/missed stay per day.
 */
export function collapseEventSeriesForDisplay(events: CommunityEvent[]): CommunityEvent[] {
  const bySeries = new Map<string, CommunityEvent[]>();
  for (const event of events) {
    const seriesId = event.seriesId?.trim();
    if (!seriesId) continue;
    const list = bySeries.get(seriesId);
    if (list) list.push(event);
    else bySeries.set(seriesId, [event]);
  }

  const emittedUpcomingSeries = new Set<string>();
  const result: CommunityEvent[] = [];

  for (const event of events) {
    const seriesId = event.seriesId?.trim();
    if (!seriesId) {
      result.push(event);
      continue;
    }

    const group = bySeries.get(seriesId) ?? [event];
    const hasUpcoming = group.some(isEventUpcoming);
    if (!hasUpcoming) {
      result.push(event);
      continue;
    }

    if (emittedUpcomingSeries.has(seriesId)) continue;
    const next = pickCurrentSeriesOccurrence(group);
    if (next) result.push(next);
    emittedUpcomingSeries.add(seriesId);
  }

  return result;
}

/** Pick the soonest-upcoming row per series (for unsorted feeds like the map). */
export function pickSoonestPerEventSeries(events: CommunityEvent[]): CommunityEvent[] {
  const standalone: CommunityEvent[] = [];
  const bySeries = new Map<string, CommunityEvent[]>();

  for (const event of events) {
    const seriesId = event.seriesId?.trim();
    if (!seriesId) {
      standalone.push(event);
      continue;
    }
    const list = bySeries.get(seriesId);
    if (list) list.push(event);
    else bySeries.set(seriesId, [event]);
  }

  const seriesPicks: CommunityEvent[] = [];
  for (const group of bySeries.values()) {
    const pick = pickCurrentSeriesOccurrence(group);
    if (pick) seriesPicks.push(pick);
  }

  return [...standalone, ...seriesPicks];
}
