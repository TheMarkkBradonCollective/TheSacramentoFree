import { useCallback, useEffect, useState } from 'react';
import { DirectorMessageContent, UserProfile } from '../types';
import {
  defaultDirectorMessageContent,
  getSupabaseDirectorMessage,
  updateSupabaseDirectorMessage,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useDirectorMessage(userProfile?: UserProfile | null) {
  const [message, setMessage] = useState<DirectorMessageContent>(defaultDirectorMessageContent());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSupabaseDirectorMessage();
    setMessage(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribePostgresChanges<DirectorMessageContent>(
      { channelName: 'live-director-message', table: 'director_message', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  const saveMessage = async (
    next: DirectorMessageContent,
  ): Promise<{ ok: boolean; errorMessage?: string }> => {
    if (!userProfile) {
      return { ok: false, errorMessage: 'Sign in as director to edit.' };
    }
    const result = await updateSupabaseDirectorMessage(next, userProfile);
    if (result.ok) {
      setMessage(next);
    }
    return result;
  };

  const canEdit = userProfile?.role === 'director';

  return { message, loading, reload, saveMessage, canEdit };
}
