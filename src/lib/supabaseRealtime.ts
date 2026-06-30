import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../supabase';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export function subscribePostgresChanges<T extends object>(
  options: {
    channelName: string;
    table: string;
    event?: '*' | PostgresEvent;
    filter?: string;
  },
  handler: (payload: RealtimePostgresChangesPayload<T>) => void,
): () => void {
  try {
    const channel = supabase
      .channel(options.channelName)
      .on(
        'postgres_changes',
        {
          event: options.event ?? '*',
          schema: 'public',
          table: options.table,
          ...(options.filter ? { filter: options.filter } : {}),
        },
        handler as (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void,
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`Realtime unavailable for ${options.table}:`, err?.message ?? status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn(`Realtime subscribe failed for ${options.table}:`, (err as Error).message);
    return () => {};
  }
}

/** Debounce bursty realtime events (e.g. multiple votes) into one callback. */
export function debounceRealtime<T extends unknown[]>(
  fn: (...args: T) => void,
  ms = 120,
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}
