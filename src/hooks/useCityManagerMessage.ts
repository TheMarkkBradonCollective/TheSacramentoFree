import { useCallback, useEffect, useState } from 'react';
import { CityManagerMessageContent, UserProfile } from '../types';
import {
  defaultCityManagerMessageContent,
  getSupabaseCityManagerMessage,
  updateSupabaseCityManagerMessage,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { canEditCityManagerMessage } from '../lib/roles';

export function useCityManagerMessage(userProfile?: UserProfile | null) {
  const [message, setMessage] = useState<CityManagerMessageContent>(defaultCityManagerMessageContent());
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSupabaseCityManagerMessage();
    setMessage(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribePostgresChanges<CityManagerMessageContent>(
      { channelName: 'live-city-manager-message', table: 'city_manager_message', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  const saveMessage = async (
    next: CityManagerMessageContent,
  ): Promise<{ ok: boolean; errorMessage?: string }> => {
    if (!userProfile) {
      return { ok: false, errorMessage: 'Sign in as city manager to edit.' };
    }
    const result = await updateSupabaseCityManagerMessage(next, userProfile);
    if (result.ok) {
      setMessage(next);
    }
    return result;
  };

  const canEdit = canEditCityManagerMessage(userProfile?.role);
  const isPublished = Boolean(message.updatedByUserId);

  return { message, loading, reload, saveMessage, canEdit, isPublished };
}
