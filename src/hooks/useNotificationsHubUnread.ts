import { useCallback, useEffect, useState } from 'react';
import {
  getSupabaseAppUpdates,
  getSupabaseHelpAnnouncements,
  getUnreadUserNotificationCount,
  markSupabaseNotificationsRead,
  userHasStaffApplyInviteNotification,
} from '../supabase';
import { readHubTabSeenAt, writeHubTabSeenAt } from '../lib/notificationsHubSeen';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { STAFF_MODE_NOTIFICATION_KINDS } from '../../shared/staffInteractionMode';
import type { UserProfile } from '../types';
import { receivesStaffNotifications } from '../lib/staffInteractionMode';
import { isStaffApplyInviteSeen } from '../lib/staffApplyInvite';
import { isStaffRole } from '../lib/roles';
import { isPlayStoreDemo } from '../preview/playStoreDemo';

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

function latestRowUpdatedAt(rows: { updatedAt: string }[]): string {
  let maxMs = Date.now();
  for (const row of rows) {
    const ms = new Date(row.updatedAt).getTime();
    if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms;
  }
  return new Date(maxMs).toISOString();
}

export function useNotificationsHubUnread(
  userId?: string | null,
  profile?: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null,
) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [seededStaffApplyUnread, setSeededStaffApplyUnread] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadUpdates, setUnreadUpdates] = useState(0);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!userId || isPlayStoreDemo()) {
      setUnreadNotifications(0);
      setSeededStaffApplyUnread(0);
      setUnreadAnnouncements(0);
      setUnreadUpdates(0);
      setReady(Boolean(userId) && isPlayStoreDemo());
      return;
    }

    const excludeStaffKinds = profile && !receivesStaffNotifications(profile)
      ? [...STAFF_MODE_NOTIFICATION_KINDS]
      : undefined;

    const [notifCount, announcements, updates, hasDbStaffApplyInvite] = await Promise.all([
      getUnreadUserNotificationCount(userId, { excludeKinds: excludeStaffKinds }),
      getSupabaseHelpAnnouncements(),
      getSupabaseAppUpdates(),
      userHasStaffApplyInviteNotification(userId),
    ]);

    const seenAnnouncementsAt = readHubTabSeenAt(userId, 'announcements');
    const seenUpdatesAt = readHubTabSeenAt(userId, 'updates');

    let seededUnread = 0;
    if (profile && !isStaffRole(profile.role) && !isStaffApplyInviteSeen(userId) && !hasDbStaffApplyInvite) {
      seededUnread = 1;
    }

    setUnreadNotifications(notifCount);
    setSeededStaffApplyUnread(seededUnread);
    setUnreadAnnouncements(countUnseenSince(announcements, seenAnnouncementsAt));
    setUnreadUpdates(countUnseenSince(updates, seenUpdatesAt));
    setReady(true);
  }, [profile, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!userId || isPlayStoreDemo()) return;

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

  const notifyUnread = unreadNotifications + seededStaffApplyUnread;

  const shouldGlow =
    ready && (notifyUnread > 0 || unreadAnnouncements > 0 || unreadUpdates > 0);

  const markNotificationsRead = useCallback(async () => {
    if (!userId) return;
    const ok = await markSupabaseNotificationsRead(userId);
    if (!ok) return;
    setUnreadNotifications(0);
    setSeededStaffApplyUnread(0);
    await reload();
  }, [reload, userId]);

  const markAnnouncementsSeen = useCallback(async () => {
    if (!userId) return;
    const announcements = await getSupabaseHelpAnnouncements();
    writeHubTabSeenAt(userId, 'announcements', latestRowUpdatedAt(announcements));
    setUnreadAnnouncements(0);
  }, [userId]);

  const markUpdatesSeen = useCallback(async () => {
    if (!userId) return;
    const updates = await getSupabaseAppUpdates();
    writeHubTabSeenAt(userId, 'updates', latestRowUpdatedAt(updates));
    setUnreadUpdates(0);
  }, [userId]);

  const markTabSeen = useCallback(
    async (tab: 'notifications' | 'announcements' | 'updates' | 'alerts') => {
      if (tab === 'notifications') await markNotificationsRead();
      else if (tab === 'announcements') await markAnnouncementsSeen();
      else if (tab === 'updates') await markUpdatesSeen();
    },
    [markAnnouncementsSeen, markNotificationsRead, markUpdatesSeen],
  );

  return {
    shouldGlow,
    unreadNotifications: notifyUnread,
    unreadAnnouncements,
    unreadUpdates,
    markTabSeen,
    reload,
  };
}
