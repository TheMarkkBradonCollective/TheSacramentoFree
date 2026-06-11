import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import type { UserProfile } from '../types';
import FullScreenPanel from '../components/FullScreenPanel';
import NotificationSettings from '../components/NotificationSettings';
import UpdatesList from '../components/UpdatesList';
import AnnouncementsList from '../components/AnnouncementsList';
import UserNotificationsList from '../components/UserNotificationsList';

export type NotificationsHubTab = 'announcements' | 'updates' | 'notifications' | 'alerts';

const HUB_TAB_ORDER: NotificationsHubTab[] = ['announcements', 'updates', 'notifications', 'alerts'];

const HUB_TAB_META: Record<
  NotificationsHubTab,
  { label: string; mobileLabel: string; title: string; subtitle: string; intro: string }
> = {
  announcements: {
    label: 'Announcements',
    mobileLabel: 'News',
    title: 'Announcements',
    subtitle: 'Staff community news — vote and comment',
    intro: 'Posts from directors and staff. Turn on push for new announcements under Alerts → Announcements.',
  },
  updates: {
    label: 'Updates',
    mobileLabel: 'Updates',
    title: 'App updates',
    subtitle: 'Director changelog — what shipped and why',
    intro: 'Technical release notes for the app. Expand any entry for the full story.',
  },
  notifications: {
    label: 'Notifications',
    mobileLabel: 'Notify',
    title: 'Notifications',
    subtitle: 'Every alert you receive — messages, listings, comments, claims, and more',
    intro: 'Your inbox mirrors push alerts: if you would get an alert for it, it appears here. Choose what sends push under Alerts (last tab).',
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
};

const NotificationsHubContext = createContext<NotificationsHubContextValue | null>(null);

let openNotificationsHubGlobal: ((tab?: NotificationsHubTab) => void) | null = null;

function resolveHubTab(tab: NotificationsHubTab | 'notifications' | 'listings'): NotificationsHubTab {
  if (tab === 'listings') return 'notifications';
  return tab;
}

/** Open the navbar bell panel from outside React (e.g. push deep links in App.tsx). */
export function openNotificationsHub(tab: NotificationsHubTab | 'listings' = 'announcements') {
  openNotificationsHubGlobal?.(resolveHubTab(tab));
}

export function useNotificationsHub(): NotificationsHubContextValue {
  const ctx = useContext(NotificationsHubContext);
  if (!ctx) {
    throw new Error('useNotificationsHub must be used within NotificationsHubProvider');
  }
  return ctx;
}

export function NotificationsHubButton({ className = '' }: { className?: string }) {
  const { openHub } = useNotificationsHub();

  return (
    <button
      type="button"
      onClick={() => openHub('announcements')}
      className={`inline-flex items-center gap-1.5 p-2 rounded-xl border border-app bg-surface text-app hover:bg-surface-hover transition-colors cursor-pointer ${className}`}
      title="Announcements, updates, notifications, and alerts"
      aria-label="Announcements, updates, notifications, and alerts"
      id="notifications_hub_btn"
    >
      <Bell className="w-4 h-4 text-accent" />
    </button>
  );
}

export function NotificationsHubProvider({
  userProfile,
  children,
}: {
  userProfile: UserProfile | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationsHubTab>('announcements');

  const openHub = useCallback((initialTab: NotificationsHubTab = 'announcements') => {
    setTab(resolveHubTab(initialTab));
    setOpen(true);
  }, []);

  useEffect(() => {
    openNotificationsHubGlobal = openHub;
    return () => {
      openNotificationsHubGlobal = null;
    };
  }, [openHub]);

  const value = useMemo(() => ({ openHub }), [openHub]);

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
              {HUB_TABS.map((hubTab) => (
                <button
                  key={hubTab.id}
                  type="button"
                  onClick={() => setTab(hubTab.id)}
                  aria-label={hubTab.label}
                  className={`flex-1 min-w-0 px-1.5 sm:px-3 py-2 rounded-lg text-[10px] sm:text-sm font-bold transition-colors leading-tight text-center ${
                    tab === hubTab.id
                      ? 'bg-accent text-on-accent shadow-sm'
                      : 'text-muted hover:text-app hover:bg-surface'
                  }`}
                >
                  <span className="sm:hidden">{hubTab.mobileLabel}</span>
                  <span className="hidden sm:inline">{hubTab.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted -mt-2">{HUB_TAB_META[tab].intro}</p>

            {tab === 'announcements' ? (
              <AnnouncementsList userProfile={userProfile} showVotes showComments />
            ) : null}
            {tab === 'updates' ? <UpdatesList userProfile={userProfile} showVotes /> : null}
            {tab === 'notifications' ? <UserNotificationsList userId={userProfile.uid} /> : null}
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
