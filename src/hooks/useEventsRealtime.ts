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
  const event = normalizeSupabaseEvent(row);

  if (eventType === 'INSERT') {
    const without = prev.filter((e) => e.id !== event.id);
    return sortEventsByStartDate([...without, event]);
  }

  if (eventType === 'UPDATE') {
    const exists = prev.some((e) => e.id === event.id);
    if (!exists) return sortEventsByStartDate([...prev, event]);
    return sortEventsByStartDate(prev.map((e) => (e.id === event.id ? event : e)));
  }

  return prev;
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
