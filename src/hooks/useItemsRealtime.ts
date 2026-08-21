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

  if (eventType === 'INSERT') {
    const item = normalizeSupabaseItem(row);
    const without = prev.filter((i) => i.id !== item.id);
    return sortItemsNewestFirst([item, ...without]);
  }

  if (eventType === 'UPDATE') {
    const incomingId = row.id || oldId;
    const current = incomingId ? prev.find((i) => i.id === incomingId) : undefined;
    const merged = current
      ? mergeDefinedItemFields(current, row)
      : row;
    const item = normalizeSupabaseItem(merged);
    if (!current) return sortItemsNewestFirst([item, ...prev]);
    if (
      current.updatedAt === item.updatedAt &&
      current.status === item.status &&
      current.title === item.title
    ) {
      return prev;
    }
    return sortItemsNewestFirst(prev.map((i) => (i.id === item.id ? item : i)));
  }

  return prev;
}

function mergeDefinedItemFields(current: ItemPost, incoming: ItemPost): ItemPost {
  const next: ItemPost = { ...current };
  for (const [key, value] of Object.entries(incoming as unknown as Record<string, unknown>)) {
    if (value !== undefined && value !== null) {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return next;
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
