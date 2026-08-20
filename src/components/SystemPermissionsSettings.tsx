import { useCallback, useEffect, useState } from 'react';
import { Bell, MapPin, Settings2 } from 'lucide-react';
import {
  checkLocationPermission,
  checkNotificationPermission,
  openAppPermissionSettings,
  permissionStatusLabel,
  requestLocationPermission,
  requestNotificationPermission,
  type SystemPermissionState,
} from '../lib/systemPermissions';

interface PermissionToggleProps {
  id: string;
  icon: typeof Bell;
  title: string;
  description: string;
  state: SystemPermissionState;
  busy: boolean;
  onToggle: () => void;
}

function PermissionToggle({ id, icon: Icon, title, description, state, busy, onToggle }: PermissionToggleProps) {
  const enabled = state === 'granted';
  const blocked = state === 'denied';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${title}: ${permissionStatusLabel(state)}`}
      disabled={busy || state === 'unsupported'}
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors disabled:opacity-60 ${
        enabled ? 'border-accent/40 bg-accent/10' : blocked ? 'border-red-500/30 bg-red-500/5' : 'border-app bg-inset'
      }`}
      id={id}
    >
      <div className="flex items-start gap-2.5 min-w-0 text-left">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? 'text-accent' : blocked ? 'text-red-400' : 'text-muted'}`} />
        <div className="min-w-0">
          <p className="text-xs font-bold text-app">{title}</p>
          <p className="text-[10px] text-muted mt-0.5 leading-snug">{description}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${enabled ? 'text-emerald-500' : blocked ? 'text-red-400' : 'text-subtle'}`}>
            System: {permissionStatusLabel(state)}
          </p>
        </div>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-accent' : blocked ? 'bg-red-500/60' : 'bg-zinc-600'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

export default function SystemPermissionsSettings() {
  const [notificationState, setNotificationState] = useState<SystemPermissionState>('prompt');
  const [locationState, setLocationState] = useState<SystemPermissionState>('prompt');
  const [busy, setBusy] = useState<'notifications' | 'location' | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [notifications, location] = await Promise.all([
      checkNotificationPermission(),
      checkLocationPermission(),
    ]);
    setNotificationState(notifications);
    setLocationState(location);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const handleNotificationToggle = async () => {
    setMessage('');
    setBusy('notifications');

    try {
      if (notificationState === 'granted') {
        const opened = await openAppPermissionSettings();
        setMessage(
          opened
            ? 'Open your device settings to turn notifications off for Sacramento Buy Nothing.'
            : 'To turn notifications off, open your browser or device settings for this app.',
        );
        return;
      }

      if (notificationState === 'denied') {
        const opened = await openAppPermissionSettings();
        setMessage(
          opened
            ? 'Notifications are blocked — allow them in your device settings, then return here.'
            : 'Notifications are blocked. Enable them in your browser or device settings, then return here.',
        );
        return;
      }

      const next = await requestNotificationPermission();
      setNotificationState(next);
      if (next === 'granted') {
        setMessage('Notifications allowed on this device.');
      } else if (next === 'denied') {
        setMessage('Notification permission was denied. You can enable it in device settings.');
      }
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const handleLocationToggle = async () => {
    setMessage('');
    setBusy('location');

    try {
      if (locationState === 'granted') {
        const opened = await openAppPermissionSettings();
        setMessage(
          opened
            ? 'Open your device settings to turn location off for Sacramento Buy Nothing.'
            : 'To turn location off, open your browser or device settings for this site.',
        );
        return;
      }

      if (locationState === 'denied') {
        const opened = await openAppPermissionSettings();
        setMessage(
          opened
            ? 'Location is blocked — allow it in your device settings, then return here.'
            : 'Location is blocked. Enable it in your browser or device settings, then return here.',
        );
        return;
      }

      const next = await requestLocationPermission();
      setLocationState(next);
      if (next === 'granted') {
        setMessage('Location allowed on this device.');
      } else if (next === 'denied') {
        setMessage('Location permission was denied. Map and pickup features need GPS access.');
      }
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  return (
    <section className="space-y-3 border-t border-app pt-5 mt-5 min-w-0" id="profile_system_permissions">
      <div className="flex items-start gap-2">
        <Settings2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Device permissions</h4>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Allow notifications and location on this phone or browser. Tap a switch to allow access, or open settings to
            change it later.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <PermissionToggle
          id="profile_notification_permission_toggle"
          icon={Bell}
          title="Notifications"
          description="Alerts for messages, listings, Go Get pickup, and community news."
          state={notificationState}
          busy={busy === 'notifications'}
          onToggle={() => void handleNotificationToggle()}
        />
        <PermissionToggle
          id="profile_location_permission_toggle"
          icon={MapPin}
          title="Location"
          description="Map, nearby listings, turn-by-turn navigation, and pickup coordination."
          state={locationState}
          busy={busy === 'location'}
          onToggle={() => void handleLocationToggle()}
        />
      </div>

      {message ? <p className="text-xs font-semibold text-muted leading-relaxed">{message}</p> : null}
    </section>
  );
}
