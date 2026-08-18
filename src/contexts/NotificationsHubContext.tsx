import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import type { UserProfile } from '../types';
import FullScreenPanel from '../components/FullScreenPanel';
import NotificationSettings from '../components/NotificationSettings';
import UpdatesList from '../components/UpdatesList';
import AnnouncementsList from '../components/AnnouncementsList';
import UserNotificationsList from '../components/UserNotificationsList';
import { useNotificationsHubUnread } from '../hooks/useNotificationsHubUnread';
import HeaderActionButton from '../components/HeaderActionButton';
import type { PushDeepLinkTarget } from '../lib/pushDeepLink';
import { isStaffRole } from '../lib/roles';
import { isStaffApplyInviteSeen, markStaffApplyInviteSeen } from '../lib/staffApplyInvite';

export type NotificationsHubTab = 'announcements' | 'updates' | 'notifications' | 'alerts';

const HUB_TAB_ORDER: NotificationsHubTab[] = ['notifications', 'announcements', 'updates', 'alerts'];

const HUB_TAB_META: Record<
  NotificationsHubTab,
  { label: string; mobileLabel: string; title: string; subtitle: string; intro: string }
> = {
  notifications: {
    label: 'Notify',
    mobileLabel: 'Notify',
    title: 'Notifications',
    subtitle: 'Every alert you receive — messages, listings, comments, claims, and more',
    intro: 'Your inbox mirrors push alerts: if you would get an alert for it, it appears here. Choose what sends push under Alerts (last tab).',
  },
  announcements: {
    label: 'News',
    mobileLabel: 'News',
    title: 'Announcements',
    subtitle: 'Staff community news — vote and comment',
    intro: 'Posts from directors and staff. Turn on push for new announcements under Alerts → Announcements.',
  },
  updates: {
    label: 'Updates',
    mobileLabel: 'Updates',
    title: 'App updates',
    subtitle: 'Director changelog — vote and comment',
    intro: 'Technical release notes for the app. Expand any entry for the full story and discussion.',
  },
  alerts: {
    label: 'Alerts',
    mobileLabel: 'Alerts',
    title: 'Push alerts',
    subtitle: 'Turn push on and choose what sends you an alert',
    intro: 'Device setup and all push toggles — messages, discover, community, and your-post alerts.',
  },
};

const HUB_TABS = HUB_TAB_ORDER.map((id) => ({
  id,
  ...HUB_TAB_META[id],
}));

type NotificationsHubContextValue = {
  openHub: (tab?: NotificationsHubTab) => void;
  shouldGlow: boolean;
};

const NotificationsHubContext = createContext<NotificationsHubContextValue | null>(null);

let openNotificationsHubGlobal: ((tab?: NotificationsHubTab) => void) | null = null;
let closeNotificationsHubGlobal: (() => void) | null = null;

function resolveHubTab(tab: NotificationsHubTab | 'notifications' | 'listings'): NotificationsHubTab {
  if (tab === 'listings') return 'notifications';
  return tab;
}

/** Open the navbar bell panel from outside React (e.g. push deep links in App.tsx). */
export function openNotificationsHub(tab: NotificationsHubTab | 'listings' = 'notifications') {
  openNotificationsHubGlobal?.(resolveHubTab(tab));
}

export function closeNotificationsHub() {
  closeNotificationsHubGlobal?.();
}

export function useNotificationsHub(): NotificationsHubContextValue {
  const ctx = useContext(NotificationsHubContext);
  if (!ctx) {
    throw new Error('useNotificationsHub must be used within NotificationsHubProvider');
  }
  return ctx;
}

export function NotificationsHubButton({ className = '' }: { className?: string }) {
  const { openHub, shouldGlow } = useNotificationsHub();

  return (
    <HeaderActionButton
      onClick={() => openHub('notifications')}
      icon={Bell}
      label="Notify"
      glow={shouldGlow}
      title={shouldGlow ? 'You have unread notifications' : 'Notify, news, updates, and alerts'}
      ariaLabel={shouldGlow ? 'Notifications — unread items' : 'Notify, news, updates, and alerts'}
      id="notifications_hub_btn"
      className={className}
    />
  );
}

function tabUnreadCount(
  tab: NotificationsHubTab,
  counts: { unreadNotifications: number; unreadAnnouncements: number; unreadUpdates: number },
): number {
  if (tab === 'notifications') return counts.unreadNotifications;
  if (tab === 'announcements') return counts.unreadAnnouncements;
  if (tab === 'updates') return counts.unreadUpdates;
  return 0;
}

export function NotificationsHubProvider({
  userProfile,
  onDeepLink,
  children,
}: {
  userProfile: UserProfile | null;
  onDeepLink?: (target: PushDeepLinkTarget) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationsHubTab>('notifications');
  const [inviteSeen, setInviteSeen] = useState(true);

  const {
    shouldGlow,
    unreadNotifications,
    unreadAnnouncements,
    unreadUpdates,
    markTabSeen,
  } = useNotificationsHubUnread(userProfile?.uid);

  useEffect(() => {
    if (!userProfile || isStaffRole(userProfile.role)) {
      setInviteSeen(true);
      return;
    }
    setInviteSeen(isStaffApplyInviteSeen(userProfile.uid));
  }, [userProfile]);

  const inviteUnread = userProfile && !isStaffRole(userProfile.role) && !inviteSeen ? 1 : 0;
  const notifyUnread = unreadNotifications + inviteUnread;

  const unreadCounts = { unreadNotifications: notifyUnread, unreadAnnouncements, unreadUpdates };

  const openHub = useCallback((initialTab: NotificationsHubTab = 'notifications') => {
    const resolved = resolveHubTab(initialTab);
    setTab(resolved);
    setOpen(true);
  }, []);

  useEffect(() => {
    openNotificationsHubGlobal = openHub;
    closeNotificationsHubGlobal = () => setOpen(false);
    return () => {
      openNotificationsHubGlobal = null;
      closeNotificationsHubGlobal = null;
    };
  }, [openHub]);

  useEffect(() => {
    if (!open || !userProfile) return;
    // Notify (user_notifications) is marked read when its list mounts — not on hub open —
    // so opening the bell on Alerts/Updates does not clear unread glow early.
    if (tab === 'notifications') return;
    void markTabSeen(tab);
  }, [open, tab, userProfile, markTabSeen]);

  const handleNotificationsViewed = useCallback(() => {
    if (userProfile && !isStaffRole(userProfile.role)) {
      markStaffApplyInviteSeen(userProfile.uid);
      setInviteSeen(true);
    }
    void markTabSeen('notifications');
  }, [markTabSeen, userProfile]);

  const value = useMemo(
    () => ({ openHub, shouldGlow: shouldGlow || inviteUnread > 0 }),
    [openHub, shouldGlow, inviteUnread],
  );

  const selectTab = (next: NotificationsHubTab) => {
    setTab(next);
  };

  return (
    <NotificationsHubContext.Provider value={value}>
      {children}
      {open && userProfile ? (
        <FullScreenPanel
          wide
          title={HUB_TAB_META[tab].title}
          subtitle={HUB_TAB_META[tab].subtitle}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-5">
            <div className="flex gap-1 p-1 rounded-xl bg-inset border border-app w-full">
              {HUB_TABS.map((hubTab) => {
                const unread = tabUnreadCount(hubTab.id, unreadCounts);
                return (
                  <button
                    key={hubTab.id}
                    type="button"
                    onClick={() => selectTab(hubTab.id)}
                    aria-label={hubTab.label}
                    className={`relative flex-1 min-w-0 px-1.5 sm:px-3 py-2 rounded-lg text-[10px] sm:text-sm font-bold transition-colors leading-tight text-center ${
                      tab === hubTab.id
                        ? 'bg-accent text-on-accent shadow-sm'
                        : 'text-muted hover:text-app hover:bg-surface'
                    }`}
                  >
                    <span className="sm:hidden">{hubTab.mobileLabel}</span>
                    <span className="hidden sm:inline">{hubTab.label}</span>
                    {unread > 0 && tab !== hubTab.id ? (
                      <span className="absolute -top-1 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-accent text-on-accent text-[9px] font-bold leading-4">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted -mt-2">{HUB_TAB_META[tab].intro}</p>

            {tab === 'announcements' ? (
              <AnnouncementsList userProfile={userProfile} showVotes showComments />
            ) : null}
            {tab === 'updates' ? <UpdatesList userProfile={userProfile} showVotes showComments /> : null}
            {tab === 'notifications' ? (
              <UserNotificationsList
                user={userProfile}
                onViewed={handleNotificationsViewed}
                onNavigate={(target) => {
                  setOpen(false);
                  onDeepLink?.(target);
                }}
              />
            ) : null}
            {tab === 'alerts' ? (
              <NotificationSettings
                userId={userProfile.uid}
                userRole={userProfile.role}
                embedded
                scope="alerts"
              />
            ) : null}
          </div>
        </FullScreenPanel>
      ) : null}
    </NotificationsHubContext.Provider>
  );
}
