import { useCallback, useEffect, useState } from 'react';
import { StaffMessageContent } from '../types';
import { getSupabasePublishedStaffMessages } from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';

export function usePublishedStaffMessages() {
  const [messages, setMessages] = useState<StaffMessageContent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSupabasePublishedStaffMessages();
    setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribePostgresChanges<StaffMessageContent>(
      { channelName: 'live-published-staff-messages', table: 'staff_messages', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  return { messages, loading, reload };
}
