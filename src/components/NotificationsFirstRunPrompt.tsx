import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { markNotificationsFirstRunPromptSeen } from '../lib/notificationsFirstRunState';
import { pauseAppUpdateWatcher } from '../pwa/appUpdateWatcher';

interface NotificationsFirstRunPromptProps {
  userId: string;
  onOpenNotificationSettings?: () => void;
}

export default function NotificationsFirstRunPrompt({
  userId,
  onOpenNotificationSettings,
}: NotificationsFirstRunPromptProps) {
  const { permission, isSubscribed, isLoading, enableNotifications } = usePushNotifications(userId, {
    syncPreferences: false,
  });
  const [enabling, setEnabling] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (permission === 'unsupported' || isSubscribed) {
      markNotificationsFirstRunPromptSeen();
    }
  }, [permission, isSubscribed]);

  if (permission === 'unsupported' || isSubscribed) {
    return null;
  }

  const dismiss = () => {
    markNotificationsFirstRunPromptSeen();
  };

  const handleTurnOn = async () => {
    setEnabling(true);
    setErr('');
    pauseAppUpdateWatcher(45_000);
    try {
      await enableNotifications();
      if (Notification.permission === 'granted') {
        markNotificationsFirstRunPromptSeen();
        return;
      }
      if (Notification.permission === 'denied') {
        markNotificationsFirstRunPromptSeen();
        onOpenNotificationSettings?.();
      }
    } catch {
      setErr('Could not turn on notifications. Try again in the bell → Alerts tab.');
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[126] bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div
        className="sbn-card w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications_first_run_title"
      >
        <div className="p-5 border-b border-app">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <h4 id="notifications_first_run_title" className="font-display font-bold text-app leading-snug">
                Stay in the loop
              </h4>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Turn on device notifications for messages, claims, nearby free items, News, and Updates. You can
                choose exactly what pings you anytime under the bell → Alerts tab.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {permission === 'denied' ? (
            <p className="text-xs text-muted leading-relaxed">
              Notifications are blocked in your browser or phone settings. Open the bell → Alerts tab for help
              turning them back on.
            </p>
          ) : null}

          {err ? <p className="text-xs font-semibold text-red-400">{err}</p> : null}

          <button
            type="button"
            disabled={enabling || isLoading || permission === 'denied'}
            onClick={() => void handleTurnOn()}
            className="sbn-btn sbn-btn-primary w-full justify-center"
            id="notifications_first_run_enable_btn"
          >
            {enabling || isLoading ? 'Turning on…' : 'Turn on notifications'}
          </button>
          <button
            type="button"
            disabled={enabling}
            onClick={dismiss}
            className="sbn-btn sbn-btn-secondary w-full justify-center"
            id="notifications_first_run_later_btn"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
