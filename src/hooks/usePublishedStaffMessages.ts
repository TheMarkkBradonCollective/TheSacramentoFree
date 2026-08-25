import { useCallback, useEffect, useState } from 'react';
import { StaffMessageContent } from '../types';
import { getSupabasePublishedStaffMessages } from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { isPlayStoreDemo } from '../preview/playStoreDemo';

export function usePublishedStaffMessages() {
  const [messages, setMessages] = useState<StaffMessageContent[]>([]);
  const [loading, setLoading] = useState(() => !isPlayStoreDemo());

  const reload = useCallback(async () => {
    if (isPlayStoreDemo()) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const data = await getSupabasePublishedStaffMessages();
    setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    return subscribePostgresChanges<StaffMessageContent>(
      { channelName: 'live-published-staff-messages', table: 'staff_messages', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  return { messages, loading, reload };
}
