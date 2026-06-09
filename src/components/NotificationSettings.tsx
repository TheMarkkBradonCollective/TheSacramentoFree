import { Bell, BellOff, MapPin } from 'lucide-react';
import { ITEM_CATEGORIES, ISO_CATEGORIES, type NotificationPreferences, type NearbyRadiusMiles } from '../types';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface NotificationSettingsProps {
  userId: string;
  fullBleed?: boolean;
}

const RADIUS_OPTIONS: { value: NearbyRadiusMiles; label: string }[] = [
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 0, label: 'Entire city only' },
];

const PREF_TOGGLES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'messages', label: 'Messages', description: 'Direct messages from neighbors' },
  { key: 'claims', label: 'Claims', description: 'When someone claims your item' },
  { key: 'gifts', label: 'Gifts', description: 'When an item is marked gifted' },
  { key: 'comments', label: 'Comments', description: 'New comments on your listings' },
  { key: 'nearbyListings', label: 'Nearby listings', description: 'Free items near you' },
  { key: 'requests', label: 'Requests', description: 'Neighbors seeking items' },
  { key: 'announcements', label: 'Community announcements', description: 'News from community leaders' },
  { key: 'pickupReminders', label: 'Pickup reminders', description: 'Scheduled pickups and nudges' },
];

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 py-2.5 border-b border-app/60 last:border-0">
      <span>
        <span className="block text-sm font-semibold text-app">{label}</span>
        <span className="block text-[11px] text-muted mt-0.5">{description}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[#FF4500]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function NotificationSettings({ userId, fullBleed = false }: NotificationSettingsProps) {
  const {
    permission,
    isSubscribed,
    isLoading,
    error,
    preferences,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    sendTestNotification,
    isTesting,
    testMessage,
  } = usePushNotifications(userId);

  const shell = fullBleed
    ? 'border-b border-app px-4 py-6 bg-surface'
    : 'bg-surface border border-app rounded-2xl p-6 shadow-md';

  const masterDisabled = !preferences.enabled || permission === 'denied' || permission === 'unsupported';

  const setPref = (key: keyof NotificationPreferences, value: boolean | number | string[]) => {
    void updatePreferences({ ...preferences, [key]: value });
  };

  const allCategories = [...ITEM_CATEGORIES, ...ISO_CATEGORIES];

  return (
    <section className={shell} id="notification_settings">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-bold text-app">Push notifications</h3>
      </div>
      <p className="text-xs text-muted mb-4">
        Get real-time alerts for listings, messages, claims, and community news — even when the app is closed.
      </p>

      {permission === 'unsupported' && (
        <p className="text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
          This browser does not support push notifications.
        </p>
      )}

      {permission === 'denied' && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          Notifications are blocked. Enable them in your browser or device settings, then return here.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {!isSubscribed ? (
          <button
            type="button"
            onClick={() => void enableNotifications()}
            disabled={isLoading || permission === 'unsupported' || permission === 'denied'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-on-accent text-sm font-bold disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            {isLoading ? 'Enabling…' : 'Enable notifications'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void disableNotifications()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-app text-sm font-bold text-muted hover:bg-inset disabled:opacity-50"
          >
            <BellOff className="w-4 h-4" />
            {isLoading ? 'Turning off…' : 'Turn off notifications'}
          </button>
        )}
        {isSubscribed && (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Subscribed on this device
            </span>
            <button
              type="button"
              onClick={() => void sendTestNotification()}
              disabled={isTesting || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-app text-sm font-bold text-app hover:bg-inset disabled:opacity-50"
            >
              {isTesting ? 'Sending…' : 'Send test notification'}
            </button>
          </>
        )}
      </div>

      {testMessage && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
          {testMessage}
        </p>
      )}

      <ToggleRow
        label="All notifications"
        description="Master switch for push alerts"
        checked={preferences.enabled}
        onChange={(value) => setPref('enabled', value)}
      />

      <div className={`mt-4 space-y-0 ${masterDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {PREF_TOGGLES.map((toggle) => (
          <ToggleRow
            key={toggle.key}
            label={toggle.label}
            description={toggle.description}
            checked={Boolean(preferences[toggle.key])}
            onChange={(value) => setPref(toggle.key, value)}
          />
        ))}
      </div>

      <div className={`mt-6 pt-4 border-t border-app ${masterDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-accent" />
          <h4 className="text-sm font-bold text-app">Nearby listing radius</h4>
        </div>
        <p className="text-[11px] text-muted mb-3">
          How far from your neighborhood should we alert you about new free items?
        </p>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPref('nearbyRadiusMiles', opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                preferences.nearbyRadiusMiles === opt.value
                  ? 'bg-accent text-on-accent border-accent'
                  : 'border-app text-muted hover:bg-inset'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-6 pt-4 border-t border-app ${masterDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h4 className="text-sm font-bold text-app mb-1">Follow categories</h4>
        <p className="text-[11px] text-muted mb-3">
          Get alerts when new items are posted in categories you care about (any neighborhood).
        </p>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
          {allCategories.map((category) => {
            const active = preferences.followedCategories.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  const next = active
                    ? preferences.followedCategories.filter((c) => c !== category)
                    : [...preferences.followedCategories, category];
                  setPref('followedCategories', next);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  active ? 'bg-accent/15 text-accent border-accent/40' : 'border-app text-muted hover:bg-inset'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
