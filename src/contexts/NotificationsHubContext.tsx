import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import type { UserProfile } from '../types';
import FullScreenPanel from '../components/FullScreenPanel';
import NotificationSettings from '../components/NotificationSettings';
import UpdatesList from '../components/UpdatesList';
import AnnouncementsList from '../components/AnnouncementsList';

export type NotificationsHubTab = 'announcements' | 'updates' | 'alerts' | 'listings';

const HUB_TABS: { id: NotificationsHubTab; label: string }[] = [
  { id: 'announcements', label: 'Announcements' },
  { id: 'updates', label: 'Updates' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'listings', label: 'Notifications' },
];

type NotificationsHubContextValue = {
  openHub: (tab?: NotificationsHubTab) => void;
};

const NotificationsHubContext = createContext<NotificationsHubContextValue | null>(null);

let openNotificationsHubGlobal: ((tab?: NotificationsHubTab) => void) | null = null;

/** Open the navbar bell panel from outside React (e.g. push deep links in App.tsx). */
export function openNotificationsHub(tab: NotificationsHubTab | 'notifications' = 'announcements') {
  const resolvedTab: NotificationsHubTab = tab === 'notifications' ? 'alerts' : tab;
  openNotificationsHubGlobal?.(resolvedTab);
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
      title="Announcements, updates, alerts, and notifications"
      aria-label="Announcements, updates, alerts, and notifications"
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
    setTab(initialTab);
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
          title="Community alerts"
          subtitle="Announcements, app updates, push alerts, and listing notifications"
          onClose={() => setOpen(false)}
        >
          <div className="space-y-5">
            <div className="flex gap-1 p-1 rounded-xl bg-inset border border-app w-full overflow-x-auto">
              {HUB_TABS.map((hubTab) => (
                <button
                  key={hubTab.id}
                  type="button"
                  onClick={() => setTab(hubTab.id)}
                  className={`flex-1 min-w-0 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                    tab === hubTab.id
                      ? 'bg-accent text-on-accent shadow-sm'
                      : 'text-muted hover:text-app hover:bg-surface'
                  }`}
                >
                  {hubTab.label}
                </button>
              ))}
            </div>

            {tab === 'announcements' ? (
              <AnnouncementsList userProfile={userProfile} showVotes showComments />
            ) : null}
            {tab === 'updates' ? <UpdatesList userProfile={userProfile} showVotes /> : null}
            {tab === 'alerts' ? (
              <NotificationSettings
                userId={userProfile.uid}
                userRole={userProfile.role}
                embedded
                scope="alerts"
              />
            ) : null}
            {tab === 'listings' ? (
              <NotificationSettings
                userId={userProfile.uid}
                userRole={userProfile.role}
                embedded
                scope="listings"
              />
            ) : null}
          </div>
        </FullScreenPanel>
      ) : null}
    </NotificationsHubContext.Provider>
  );
}
