import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import type { UserProfile } from '../types';
import FullScreenPanel from '../components/FullScreenPanel';
import NotificationSettings from '../components/NotificationSettings';
import UpdatesList from '../components/UpdatesList';

export type NotificationsHubTab = 'notifications' | 'updates';

type NotificationsHubContextValue = {
  openHub: (tab?: NotificationsHubTab) => void;
};

const NotificationsHubContext = createContext<NotificationsHubContextValue | null>(null);

let openNotificationsHubGlobal: ((tab?: NotificationsHubTab) => void) | null = null;

/** Open the navbar bell panel from outside React (e.g. push deep links in App.tsx). */
export function openNotificationsHub(tab: NotificationsHubTab = 'notifications') {
  openNotificationsHubGlobal?.(tab);
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
      onClick={() => openHub('notifications')}
      className={`inline-flex items-center gap-1.5 p-2 rounded-xl border border-app bg-surface text-app hover:bg-surface-hover transition-colors cursor-pointer ${className}`}
      title="Notifications and app updates"
      aria-label="Notifications and app updates"
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
  const [tab, setTab] = useState<NotificationsHubTab>('notifications');

  const openHub = useCallback((initialTab: NotificationsHubTab = 'notifications') => {
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
          title="Alerts & updates"
          subtitle="Push notification settings and what is new in the app"
          onClose={() => setOpen(false)}
        >
          <div className="space-y-5">
            <div className="flex gap-2 p-1 rounded-xl bg-inset border border-app w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTab('notifications')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  tab === 'notifications'
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'text-muted hover:text-app hover:bg-surface'
                }`}
              >
                Notifications
              </button>
              <button
                type="button"
                onClick={() => setTab('updates')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  tab === 'updates'
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'text-muted hover:text-app hover:bg-surface'
                }`}
              >
                App updates
              </button>
            </div>

            {tab === 'notifications' ? (
              <NotificationSettings
                userId={userProfile.uid}
                userRole={userProfile.role}
                embedded
              />
            ) : (
              <UpdatesList userProfile={userProfile} showVotes />
            )}
          </div>
        </FullScreenPanel>
      ) : null}
    </NotificationsHubContext.Provider>
  );
}
