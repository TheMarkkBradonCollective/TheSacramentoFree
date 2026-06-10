import { useCallback, useEffect, useState } from 'react';
import { AppUpdateInput, AppUpdateRecord, UserProfile } from '../types';
import {
  createSupabaseAppUpdate,
  deleteSupabaseAppUpdate,
  getSupabaseAppUpdates,
  updateSupabaseAppUpdate,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { canEditAnnouncement, canPostAnnouncements } from '../lib/roles';

export function useAppUpdates(userProfile?: UserProfile | null) {
  const [updates, setUpdates] = useState<AppUpdateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSupabaseAppUpdates();
    setUpdates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribePostgresChanges<AppUpdateRecord>(
      { channelName: 'live-app-updates', table: 'app_updates', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  const createUpdate = async (input: AppUpdateInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as staff to post.' };
    const result = await createSupabaseAppUpdate(input, userProfile);
    if (result.ok && result.update) {
      setUpdates((prev) => [result.update!, ...prev]);
    }
    return result;
  };

  const saveUpdate = async (id: string, input: AppUpdateInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in to edit.' };
    const result = await updateSupabaseAppUpdate(id, input, userProfile);
    if (result.ok && result.update) {
      setUpdates((prev) => prev.map((row) => (row.id === id ? result.update! : row)));
    }
    return result;
  };

  const removeUpdate = async (id: string) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in to delete.' };
    const result = await deleteSupabaseAppUpdate(id, userProfile);
    if (result.ok) {
      setUpdates((prev) => prev.filter((row) => row.id !== id));
    }
    return result;
  };

  const canPost = canPostAnnouncements(userProfile?.role);

  const canEdit = (update: AppUpdateRecord) =>
    Boolean(userProfile && canEditAnnouncement(userProfile, update.postedByUserId));

  return { updates, loading, reload, createUpdate, saveUpdate, removeUpdate, canPost, canEdit };
}
