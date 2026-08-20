import { useCallback, useEffect, useState } from 'react';
import { AppUpdateInput, AppUpdateRecord, UserProfile } from '../types';
import {
  createSupabaseAppUpdate,
  deleteSupabaseAppUpdate,
  getSupabaseAppUpdates,
  updateSupabaseAppUpdate,
} from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { canManageAppUpdates } from '../lib/roles';

export function useAppUpdates(userProfile?: UserProfile | null) {
  const [updates, setUpdates] = useState<AppUpdateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSupabaseAppUpdates();
    const seen = new Set<string>();
    const unique = data.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
    setUpdates(unique);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void reload();
    }, 150);

    const onChangelogRefresh = () => {
      void reload();
    };
    window.addEventListener('sbn-refresh-changelog', onChangelogRefresh);

    const unsubscribe = subscribePostgresChanges<AppUpdateRecord>(
      { channelName: 'live-app-updates', table: 'app_updates', event: '*' },
      refresh,
    );

    return () => {
      window.removeEventListener('sbn-refresh-changelog', onChangelogRefresh);
      unsubscribe();
    };
  }, [reload]);

  const createUpdate = async (input: AppUpdateInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as director to post.' };
    const result = await createSupabaseAppUpdate(input, userProfile);
    if (result.ok) {
      await reload();
    }
    return result;
  };

  const saveUpdate = async (id: string, input: AppUpdateInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as director to edit.' };
    const result = await updateSupabaseAppUpdate(id, input, userProfile);
    if (result.ok && result.update) {
      setUpdates((prev) => prev.map((row) => (row.id === id ? result.update! : row)));
    }
    return result;
  };

  const removeUpdate = async (id: string) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as director to delete.' };
    const result = await deleteSupabaseAppUpdate(id, userProfile);
    if (result.ok) {
      setUpdates((prev) => prev.filter((row) => row.id !== id));
    }
    return result;
  };

  const canManage = canManageAppUpdates(userProfile?.role);

  return { updates, loading, reload, createUpdate, saveUpdate, removeUpdate, canManage };
}
