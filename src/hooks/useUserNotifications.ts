import { useCallback, useEffect, useState } from 'react';
import type { UserNotificationItem } from '../types';
import { dismissSupabaseNotification, getSupabaseUserNotifications } from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useUserNotifications(userId?: string) {
  const [items, setItems] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

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

  const dismissNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return false;
      setHiddenIds((prev) => new Set(prev).add(notificationId));
      setItems((prev) => prev.filter((row) => row.id !== notificationId));
      const ok = await dismissSupabaseNotification(userId, notificationId);
      if (!ok) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
        await reload();
      }
      return ok;
    },
    [userId, reload],
  );

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

  const visibleItems = items.filter((item) => !hiddenIds.has(item.id));

  return { items: visibleItems, loading, reload, dismissNotification };
}
