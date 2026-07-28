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
