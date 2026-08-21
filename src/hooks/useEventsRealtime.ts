import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { CommunityEvent } from '../types';
import { normalizeSupabaseEvent } from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';

function sortEventsByStartDate(list: CommunityEvent[]): CommunityEvent[] {
  return [...list].sort(
    (a, b) => new Date(a.eventStartAt).getTime() - new Date(b.eventStartAt).getTime(),
  );
}

export function applyEventRealtimeChange(
  prev: CommunityEvent[],
  eventType: string,
  row: CommunityEvent | null,
  oldId?: string,
): CommunityEvent[] {
  if (eventType === 'DELETE') {
    const id = oldId ?? row?.id;
    if (!id) return prev;
    return prev.filter((event) => event.id !== id);
  }

  if (!row) return prev;

  if (eventType === 'INSERT') {
    const event = normalizeSupabaseEvent(row);
    const without = prev.filter((e) => e.id !== event.id);
    return sortEventsByStartDate([...without, event]);
  }

  if (eventType === 'UPDATE') {
    const incomingId = row.id || oldId;
    const current = incomingId ? prev.find((e) => e.id === incomingId) : undefined;
    const merged = current ? mergeDefinedEventFields(current, row) : row;
    const event = normalizeSupabaseEvent(merged);
    if (!current) return sortEventsByStartDate([...prev, event]);
    if (
      current.updatedAt === event.updatedAt &&
      current.status === event.status &&
      current.title === event.title
    ) {
      return prev;
    }
    return sortEventsByStartDate(prev.map((e) => (e.id === event.id ? event : e)));
  }

  return prev;
}

function mergeDefinedEventFields(current: CommunityEvent, incoming: CommunityEvent): CommunityEvent {
  const next: CommunityEvent = { ...current };
  for (const [key, value] of Object.entries(incoming as unknown as Record<string, unknown>)) {
    if (value !== undefined && value !== null) {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

/** Live community events — new posts, edits, and cancellations without refresh. */
export function useEventsRealtime(
  enabled: boolean,
  setEvents: Dispatch<SetStateAction<CommunityEvent[]>>,
) {
  useEffect(() => {
    if (!enabled) return;

    return subscribePostgresChanges<CommunityEvent>(
      { channelName: 'live-community-events', table: 'community_events', event: '*' },
      (payload) => {
        setEvents((prev) =>
          applyEventRealtimeChange(
            prev,
            payload.eventType,
            payload.new as CommunityEvent | null,
            (payload.old as CommunityEvent | undefined)?.id,
          ),
        );
      },
    );
  }, [enabled, setEvents]);
}
