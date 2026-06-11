import { useCallback, useEffect, useState } from 'react';
import type { UserNotificationItem } from '../types';
import { getSupabaseUserNotifications } from '../supabase';

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

  return { items, loading, reload };
}
