import { useCallback, useEffect, useState } from 'react';
import {
  getSupabaseAppUpdates,
  getSupabaseHelpAnnouncements,
  getUnreadUserNotificationCount,
  markSupabaseNotificationsRead,
} from '../supabase';
import { readHubTabSeenAt, writeHubTabSeenAt } from '../lib/notificationsHubSeen';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

function countUnseenSince(
  rows: { updatedAt: string }[],
  seenAt: string | null,
): number {
  if (!rows.length) return 0;
  if (!seenAt) return rows.length;
  const seenMs = new Date(seenAt).getTime();
  if (Number.isNaN(seenMs)) return rows.length;
  return rows.filter((row) => {
    const ms = new Date(row.updatedAt).getTime();
    return !Number.isNaN(ms) && ms > seenMs;
  }).length;
}

export function useNotificationsHubUnread(userId?: string | null) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadUpdates, setUnreadUpdates] = useState(0);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setUnreadNotifications(0);
      setUnreadAnnouncements(0);
      setUnreadUpdates(0);
      setReady(false);
      return;
    }

    const [notifCount, announcements, updates] = await Promise.all([
      getUnreadUserNotificationCount(userId),
      getSupabaseHelpAnnouncements(),
      getSupabaseAppUpdates(),
    ]);

    const seenAnnouncementsAt = readHubTabSeenAt(userId, 'announcements');
    const seenUpdatesAt = readHubTabSeenAt(userId, 'updates');

    setUnreadNotifications(notifCount);
    setUnreadAnnouncements(countUnseenSince(announcements, seenAnnouncementsAt));
    setUnreadUpdates(countUnseenSince(updates, seenUpdatesAt));
    setReady(true);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!userId) return;

    const refresh = debounceRealtime(() => {
      void reload();
    }, 150);

    const unsubNotifs = subscribePostgresChanges(
      {
        channelName: `live-hub-unread-notifs-${userId}`,
        table: 'user_notifications',
        event: '*',
        filter: `userId=eq.${userId}`,
      },
      refresh,
    );
    const unsubAnnouncements = subscribePostgresChanges(
      { channelName: 'live-hub-unread-announcements', table: 'help_announcements', event: '*' },
      refresh,
    );
    const unsubUpdates = subscribePostgresChanges(
      { channelName: 'live-hub-unread-updates', table: 'app_updates', event: '*' },
      refresh,
    );

    return () => {
      unsubNotifs();
      unsubAnnouncements();
      unsubUpdates();
    };
  }, [reload, userId]);

  const shouldGlow = ready && (unreadNotifications > 0 || unreadAnnouncements > 0 || unreadUpdates > 0);

  const markNotificationsRead = useCallback(async () => {
    if (!userId) return;
    await markSupabaseNotificationsRead(userId);
    setUnreadNotifications(0);
  }, [userId]);

  const markAnnouncementsSeen = useCallback(() => {
    if (!userId) return;
    writeHubTabSeenAt(userId, 'announcements');
    setUnreadAnnouncements(0);
  }, [userId]);

  const markUpdatesSeen = useCallback(() => {
    if (!userId) return;
    writeHubTabSeenAt(userId, 'updates');
    setUnreadUpdates(0);
  }, [userId]);

  const markTabSeen = useCallback(
    async (tab: 'notifications' | 'announcements' | 'updates' | 'alerts') => {
      if (tab === 'notifications') await markNotificationsRead();
      else if (tab === 'announcements') markAnnouncementsSeen();
      else if (tab === 'updates') markUpdatesSeen();
    },
    [markAnnouncementsSeen, markNotificationsRead, markUpdatesSeen],
  );

  return {
    shouldGlow,
    unreadNotifications,
    unreadAnnouncements,
    unreadUpdates,
    markTabSeen,
    reload,
  };
}
