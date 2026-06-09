import { useCallback, useEffect, useState } from 'react';
import { StaffMessageContent, UserProfile } from '../types';
import {
  defaultStaffMessageContent,
  getSupabaseStaffMessage,
  updateSupabaseStaffMessage,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { canEditOwnStaffMessage } from '../lib/roles';

export function useStaffMessage(userProfile?: UserProfile | null) {
  const userId = userProfile?.uid;
  const [message, setMessage] = useState<StaffMessageContent | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  const reload = useCallback(async () => {
    if (!userId) {
      setMessage(null);
      setLoading(false);
      return;
    }
    const data = await getSupabaseStaffMessage(userId, userProfile);
    setMessage(data);
    setLoading(false);
  }, [userId, userProfile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!userId) return;
    return subscribePostgresChanges<StaffMessageContent>(
      {
        channelName: `live-staff-message-${userId}`,
        table: 'staff_messages',
        event: '*',
        filter: `userId=eq.${userId}`,
      },
      () => {
        void reload();
      },
    );
  }, [reload, userId]);

  const saveMessage = async (
    next: StaffMessageContent,
  ): Promise<{ ok: boolean; errorMessage?: string }> => {
    if (!userProfile) {
      return { ok: false, errorMessage: 'Sign in as staff to edit.' };
    }
    const result = await updateSupabaseStaffMessage(next, userProfile);
    if (result.ok) {
      setMessage(next);
    }
    return result;
  };

  const canEdit = canEditOwnStaffMessage(userProfile?.role);
  const isPublished = Boolean(message?.updatedByUserId);
  const fallback = userId ? defaultStaffMessageContent(userId, userProfile) : null;

  return {
    message: message ?? fallback,
    loading,
    reload,
    saveMessage,
    canEdit,
    isPublished,
  };
}
