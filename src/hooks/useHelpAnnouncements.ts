import { useCallback, useEffect, useState } from 'react';
import { HelpAnnouncementInput, HelpAnnouncementRecord, UserProfile } from '../types';
import {
  createSupabaseHelpAnnouncement,
  deleteSupabaseHelpAnnouncement,
  getSupabaseHelpAnnouncements,
  updateSupabaseHelpAnnouncement,
} from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { canEditAnnouncement, canPostAnnouncements } from '../lib/roles';

export function useHelpAnnouncements(userProfile?: UserProfile | null) {
  const [announcements, setAnnouncements] = useState<HelpAnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSupabaseHelpAnnouncements();
    const seen = new Set<string>();
    const unique = data.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
    setAnnouncements(unique);
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

    const unsubscribe = subscribePostgresChanges<HelpAnnouncementRecord>(
      { channelName: 'live-help-announcements', table: 'help_announcements', event: '*' },
      refresh,
    );

    return () => {
      window.removeEventListener('sbn-refresh-changelog', onChangelogRefresh);
      unsubscribe();
    };
  }, [reload]);

  const createAnnouncement = async (input: HelpAnnouncementInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as staff to post.' };
    const result = await createSupabaseHelpAnnouncement(input, userProfile);
    if (result.ok) {
      await reload();
    }
    return result;
  };

  const saveAnnouncement = async (id: string, input: HelpAnnouncementInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in to edit.' };
    const result = await updateSupabaseHelpAnnouncement(id, input, userProfile);
    if (result.ok && result.announcement) {
      setAnnouncements((prev) => prev.map((row) => (row.id === id ? result.announcement! : row)));
    }
    return result;
  };

  const removeAnnouncement = async (id: string) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in to delete.' };
    const result = await deleteSupabaseHelpAnnouncement(id, userProfile);
    if (result.ok) {
      setAnnouncements((prev) => prev.filter((row) => row.id !== id));
    }
    return result;
  };

  const canPost = canPostAnnouncements(userProfile?.role);

  const canEdit = (announcement: HelpAnnouncementRecord) =>
    Boolean(userProfile && canEditAnnouncement(userProfile, announcement.postedByUserId));

  return {
    announcements,
    loading,
    reload,
    createAnnouncement,
    saveAnnouncement,
    removeAnnouncement,
    canPost,
    canEdit,
  };
}
