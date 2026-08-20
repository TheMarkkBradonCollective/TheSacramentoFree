import type { CommunityEvent } from '../types';
import { isEventUpcoming } from './eventRsvp';

export function isSeriesEvent(event: Pick<CommunityEvent, 'seriesId'>): boolean {
  return Boolean(event.seriesId?.trim());
}

/** Other occurrences in the same series (excludes the current event). */
export function getSeriesSiblings(allEvents: CommunityEvent[], event: CommunityEvent): CommunityEvent[] {
  const seriesId = event.seriesId?.trim();
  if (!seriesId) return [];
  return allEvents
    .filter((e) => e.seriesId === seriesId && e.id !== event.id)
    .sort((a, b) => new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime());
}

/** Upcoming occurrences in a series, including the given event if upcoming. */
export function getUpcomingSeriesOccurrences(allEvents: CommunityEvent[], seriesId: string): CommunityEvent[] {
  return allEvents
    .filter((e) => e.seriesId === seriesId && isEventUpcoming(e))
    .sort((a, b) => new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime());
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

/** One card per repeat series — keeps the first event per seriesId in the given order. */
export function collapseEventSeriesForDisplay(events: CommunityEvent[]): CommunityEvent[] {
  const seenSeries = new Set<string>();
  const result: CommunityEvent[] = [];

  for (const event of events) {
    const seriesId = event.seriesId?.trim();
    if (!seriesId) {
      result.push(event);
      continue;
    }
    if (seenSeries.has(seriesId)) continue;
    seenSeries.add(seriesId);
    result.push(event);
  }

  return result;
}

/** Pick the soonest-upcoming row per series (for unsorted feeds like the map). */
export function pickSoonestPerEventSeries(events: CommunityEvent[]): CommunityEvent[] {
  const standalone: CommunityEvent[] = [];
  const bySeries = new Map<string, CommunityEvent>();

  for (const event of events) {
    const seriesId = event.seriesId?.trim();
    if (!seriesId) {
      standalone.push(event);
      continue;
    }

    const existing = bySeries.get(seriesId);
    if (!existing) {
      bySeries.set(seriesId, event);
      continue;
    }

    if (new Date(event.eventStartAt).getTime() < new Date(existing.eventStartAt).getTime()) {
      bySeries.set(seriesId, event);
    }
  }

  return [...standalone, ...bySeries.values()];
}
