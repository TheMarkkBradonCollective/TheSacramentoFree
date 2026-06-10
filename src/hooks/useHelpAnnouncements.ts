import { useCallback, useEffect, useState } from 'react';
import { HelpAnnouncementInput, HelpAnnouncementRecord, UserProfile } from '../types';
import {
  createSupabaseHelpAnnouncement,
  deleteSupabaseHelpAnnouncement,
  getSupabaseHelpAnnouncements,
  updateSupabaseHelpAnnouncement,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { canEditAnnouncement, canPostAnnouncements } from '../lib/roles';

export function useHelpAnnouncements(userProfile?: UserProfile | null) {
  const [announcements, setAnnouncements] = useState<HelpAnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getSupabaseHelpAnnouncements();
    setAnnouncements(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribePostgresChanges<HelpAnnouncementRecord>(
      { channelName: 'live-help-announcements', table: 'help_announcements', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  const createAnnouncement = async (input: HelpAnnouncementInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as staff to post.' };
    const result = await createSupabaseHelpAnnouncement(input, userProfile);
    if (result.ok && result.announcement) {
      setAnnouncements((prev) => [result.announcement!, ...prev]);
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
