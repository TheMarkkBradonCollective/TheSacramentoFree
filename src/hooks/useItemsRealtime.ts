import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { ItemPost } from '../types';
import { normalizeSupabaseItem } from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';

function sortItemsNewestFirst(list: ItemPost[]): ItemPost[] {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function applyItemRealtimeChange(
  prev: ItemPost[],
  eventType: string,
  row: ItemPost | null,
  oldId?: string,
): ItemPost[] {
  if (eventType === 'DELETE') {
    const id = oldId ?? row?.id;
    if (!id) return prev;
    return prev.filter((item) => item.id !== id);
  }

  if (!row) return prev;
  const item = normalizeSupabaseItem(row);

  if (eventType === 'INSERT') {
    const without = prev.filter((i) => i.id !== item.id);
    return sortItemsNewestFirst([item, ...without]);
  }

  if (eventType === 'UPDATE') {
    const exists = prev.some((i) => i.id === item.id);
    if (!exists) return sortItemsNewestFirst([item, ...prev]);
    return sortItemsNewestFirst(prev.map((i) => (i.id === item.id ? item : i)));
  }

  return prev;
}

/** Live listing feed — new posts, edits, claims, and deletes without refresh. */
export function useItemsRealtime(
  enabled: boolean,
  setItems: Dispatch<SetStateAction<ItemPost[]>>,
) {
  useEffect(() => {
    if (!enabled) return;

    return subscribePostgresChanges<ItemPost>(
      { channelName: 'live-items', table: 'items', event: '*' },
      (payload) => {
        setItems((prev) =>
          applyItemRealtimeChange(
            prev,
            payload.eventType,
            payload.new as ItemPost | null,
            (payload.old as ItemPost | undefined)?.id,
          ),
        );
      },
    );
  }, [enabled, setItems]);
}
