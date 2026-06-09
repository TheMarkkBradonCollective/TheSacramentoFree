import { Bell, BellOff, MapPin } from 'lucide-react';
import {
  ITEM_CATEGORIES,
  ISO_CATEGORIES,
  type NotificationPreferences,
  type NearbyRadiusMiles,
  type UserProfile,
} from '../types';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { isDirectorRole, isStaffRole } from '../lib/roles';

interface NotificationSettingsProps {
  userId: string;
  userRole?: UserProfile['role'];
  fullBleed?: boolean;
}

const RADIUS_OPTIONS: { value: NearbyRadiusMiles; label: string }[] = [
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 0, label: 'Entire city only' },
];

type BooleanPrefKey = {
  [K in keyof NotificationPreferences]: NotificationPreferences[K] extends boolean ? K : never;
}[keyof NotificationPreferences];

const PREF_SECTIONS: {
  title: string;
  items: { key: BooleanPrefKey; label: string; description: string }[];
}[] = [
  {
    title: 'Messages & support',
    items: [
      { key: 'messages', label: 'Direct messages', description: 'Chat messages from neighbors' },
      {
        key: 'messageRequests',
        label: 'Message requests',
        description: 'When a neighbor asks to chat or accepts your request',
      },
      { key: 'support', label: 'Support tickets', description: 'Staff replies on your help tickets' },
    ],
  },
  {
    title: 'Your listings',
    items: [
      { key: 'claims', label: 'Claims', description: 'When someone claims your item' },
      { key: 'gifts', label: 'Gifts', description: 'When an item is marked gifted' },
      { key: 'comments', label: 'Comments', description: 'New comments on your listings' },
      {
        key: 'listingStatus',
        label: 'Listing status',
        description: 'Approved, denied, expiring, and other status changes',
      },
      { key: 'pickupReminders', label: 'Pickup reminders', description: 'Scheduled pickups and nudges' },
    ],
  },
  {
    title: 'Discover',
    items: [
      { key: 'newListings', label: 'New listings', description: 'New free items in areas you follow' },
      { key: 'nearbyListings', label: 'Nearby listings', description: 'Free items near your neighborhood' },
      {
        key: 'requests',
        label: 'Requests',
        description: 'Neighbors seeking items, nearby ISO posts, and claim requests on your listings',
      },
      {
        key: 'savedItems',
        label: 'Saved items',
        description: 'When a bookmarked listing is claimed or changes status',
      },
    ],
  },
  {
    title: 'Community',
    items: [
      { key: 'announcements', label: 'Announcements', description: 'News from community leaders' },
      { key: 'accountUpdates', label: 'Account updates', description: 'Account notices and important alerts' },
    ],
  },
];

function SwitchRow({
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
    <div className="flex items-center justify-between gap-3 py-3 border-b border-app/60 last:border-0">
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-sm font-semibold text-app">{label}</div>
        <div className="text-[11px] text-muted mt-0.5 leading-snug">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`sbn-switch shrink-0 ${checked ? 'sbn-switch-on' : ''}`}
      >
        <span className="sbn-switch-thumb" aria-hidden />
      </button>
    </div>
  );
}

const STAFF_PREF_SECTION = {
  title: 'Staff moderation',
  items: [
    {
      key: 'staffSupport' as const,
      label: 'Support inbox',
      description: 'New help tickets and neighbor replies on open tickets',
    },
    {
      key: 'staffReports' as const,
      label: 'Neighbor reports',
      description: 'New reports submitted for staff review',
    },
  ],
};

const DIRECTOR_PREF_SECTION = {
  title: 'Director oversight',
  items: [
    {
      key: 'directorAlerts' as const,
      label: 'Platform activity',
      description: 'Joins, leaves, bans, suspensions, reports, tickets, listings, and more',
    },
  ],
};

export default function NotificationSettings({
  userId,
  userRole,
  fullBleed = false,
}: NotificationSettingsProps) {
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
        Get real-time alerts for listings, messages, support, saved items, and community news — even when the app
        is closed.
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

      <div className="rounded-xl border border-app bg-inset/30 px-3">
        <SwitchRow
          label="All notifications"
          description="Master switch for push alerts"
          checked={preferences.enabled}
          onChange={(value) => setPref('enabled', value)}
        />
      </div>

      <div className={`mt-5 space-y-5 ${masterDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {PREF_SECTIONS.map((section) => (
          <div key={section.title}>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">{section.title}</h4>
            <div className="rounded-xl border border-app bg-inset/30 px-3">
              {section.items.map((toggle) => (
                <SwitchRow
                  key={toggle.key}
                  label={toggle.label}
                  description={toggle.description}
                  checked={Boolean(preferences[toggle.key])}
                  onChange={(value) => setPref(toggle.key, value)}
                />
              ))}
            </div>
          </div>
        ))}

        {isStaffRole(userRole) && (
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">
              {STAFF_PREF_SECTION.title}
            </h4>
            <div className="rounded-xl border border-app bg-inset/30 px-3">
              {STAFF_PREF_SECTION.items.map((toggle) => (
                <SwitchRow
                  key={toggle.key}
                  label={toggle.label}
                  description={toggle.description}
                  checked={Boolean(preferences[toggle.key])}
                  onChange={(value) => setPref(toggle.key, value)}
                />
              ))}
            </div>
          </div>
        )}

        {isDirectorRole(userRole) && (
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">
              {DIRECTOR_PREF_SECTION.title}
            </h4>
            <div className="rounded-xl border border-app bg-inset/30 px-3">
              {DIRECTOR_PREF_SECTION.items.map((toggle) => (
                <SwitchRow
                  key={toggle.key}
                  label={toggle.label}
                  description={toggle.description}
                  checked={Boolean(preferences[toggle.key])}
                  onChange={(value) => setPref(toggle.key, value)}
                />
              ))}
            </div>
          </div>
        )}
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
