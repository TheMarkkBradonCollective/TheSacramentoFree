import { useCallback, useEffect, useState } from 'react';
import type { UserNotificationItem } from '../types';
import { getSupabaseUserNotifications } from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useUserNotifications(userId?: string) {
  const [items, setItems] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await getSupabaseUserNotifications(userId);
    setItems(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!userId) return;
    const refresh = debounceRealtime(() => {
      void reload();
    }, 150);

    return subscribePostgresChanges(
      {
        channelName: `live-user-notifications-${userId}`,
        table: 'user_notifications',
        event: '*',
        filter: `userId=eq.${userId}`,
      },
      refresh,
    );
  }, [userId, reload]);

  return { items, loading, reload };
}
