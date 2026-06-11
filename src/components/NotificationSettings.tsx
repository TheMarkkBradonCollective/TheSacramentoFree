import { useState } from 'react';
import { Bell, BellOff, MapPin } from 'lucide-react';
import DirectorBroadcastTestModal from './DirectorBroadcastTestModal';
import {
  ITEM_CATEGORIES,
  ISO_CATEGORIES,
  type NotificationPreferences,
  type NearbyRadiusMiles,
  type UserProfile,
} from '../types';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { isDirectorRole, isStaffRole } from '../lib/roles';

export type NotificationSettingsScope = 'alerts' | 'listings' | 'all';

interface NotificationSettingsProps {
  userId: string;
  userRole?: UserProfile['role'];
  fullBleed?: boolean;
  /** Inside the navbar bell panel — no outer card chrome. */
  embedded?: boolean;
  /** Bell hub: alerts = messages & discover; listings = your posts & profile activity */
  scope?: NotificationSettingsScope;
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
      {
        key: 'communityChat',
        label: 'Community chat',
        description: 'New messages in the all-neighbors channel',
      },
      { key: 'support', label: 'Support tickets', description: 'Staff replies on your help tickets' },
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
        description: 'When a bookmarked listing is edited, commented on, claimed, or changes status',
      },
    ],
  },
  {
    title: 'Community',
    items: [
      { key: 'appUpdates', label: 'App updates', description: 'Director changelog — what is new in the app' },
      { key: 'announcements', label: 'Announcements', description: 'Staff news in Community hub' },
    ],
  },
];

const LISTING_PREF_SECTION = {
  title: 'Your posts & profile',
  items: [
    { key: 'claims' as const, label: 'Claims', description: 'When someone claims your item' },
    { key: 'gifts' as const, label: 'Gifts', description: 'When an item is marked gifted' },
    { key: 'comments' as const, label: 'Comments', description: 'New comments on your listings' },
    { key: 'listingUpvotes' as const, label: 'Upvotes', description: 'When a neighbor upvotes your listing' },
    { key: 'listingDownvotes' as const, label: 'Downvotes', description: 'When a neighbor downvotes your listing' },
    {
      key: 'listingStatus' as const,
      label: 'Listing status',
      description: 'Expiring soon, gifted, withdrawn, and other status changes',
    },
    { key: 'pickupReminders' as const, label: 'Pickup reminders', description: 'Scheduled pickups and nudges' },
    { key: 'accountUpdates' as const, label: 'Account updates', description: 'Profile and account notices' },
  ],
};

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
    {
      key: 'staffChat' as const,
      label: 'Staff chat',
      description: 'New messages in the staff-only lounge',
    },
  ],
};

const DIRECTOR_CATEGORY_PREFS = [
  {
    key: 'directorJoins' as const,
    label: 'New neighbors',
    description: 'When someone joins the community',
  },
  {
    key: 'directorLeaves' as const,
    label: 'Account departures',
    description: 'When a neighbor leaves — self-delete or staff removal',
  },
  {
    key: 'directorModeration' as const,
    label: 'Moderation actions',
    description: 'Suspensions, bans, role changes, and staff deletions',
  },
  {
    key: 'directorReports' as const,
    label: 'Neighbor reports',
    description: 'Manual reports and block reports',
  },
  {
    key: 'directorTickets' as const,
    label: 'Support tickets',
    description: 'New tickets and neighbor replies',
  },
  {
    key: 'directorListings' as const,
    label: 'New listings',
    description: 'Giveaways and neighbor requests posted',
  },
  {
    key: 'directorMessageRequests' as const,
    label: 'Message requests',
    description: 'When neighbors ask to start a chat',
  },
  {
    key: 'directorClaimRequests' as const,
    label: 'Claim requests',
    description: 'Pickup requests on listings',
  },
] as const;

export default function NotificationSettings({
  userId,
  userRole,
  fullBleed = false,
  embedded = false,
  scope = 'all',
}: NotificationSettingsProps) {
  const {
    permission,
    isSubscribed,
    isLoading,
    isSaving,
    prefsLoading,
    error,
    saveMessage,
    preferences,
    hasUnsavedChanges,
    enableNotifications,
    disableNotifications,
    setDraftPreferences,
    savePreferences,
    discardPreferenceChanges,
    sendTestNotification,
    runBroadcastTest,
    isTesting,
    isBroadcastTesting,
    testMessage,
  } = usePushNotifications(userId);

  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  const shell = embedded
    ? ''
    : fullBleed
      ? 'border-b border-app px-4 py-6 bg-surface'
      : 'bg-surface border border-app rounded-2xl p-6 shadow-md';

  const masterDisabled = !preferences.enabled || permission === 'denied' || permission === 'unsupported';
  const directorMasterDisabled = masterDisabled || !preferences.directorAlerts;

  const setPref = (key: keyof NotificationPreferences, value: boolean | number | string[]) => {
    setDraftPreferences({ ...preferences, [key]: value });
  };

  const setDirectorMaster = (value: boolean) => {
    if (!value) {
      setDraftPreferences({
        ...preferences,
        directorAlerts: false,
        directorJoins: false,
        directorLeaves: false,
        directorModeration: false,
        directorReports: false,
        directorTickets: false,
        directorListings: false,
        directorMessageRequests: false,
        directorClaimRequests: false,
      });
      return;
    }
    setDraftPreferences({
      ...preferences,
      directorAlerts: true,
      directorJoins: true,
      directorLeaves: true,
      directorModeration: true,
      directorReports: true,
      directorTickets: true,
      directorListings: true,
      directorMessageRequests: true,
      directorClaimRequests: true,
    });
  };

  const allCategories = [...ITEM_CATEGORIES, ...ISO_CATEGORIES];
  const showAlertsScope = scope === 'all' || scope === 'alerts';
  const showListingsScope = scope === 'all' || scope === 'listings';
  const scopeTitle =
    scope === 'listings' ? 'Listing notifications' : scope === 'alerts' ? 'Push alerts' : 'Push notifications';

  return (
    <section className={shell} id="notification_settings">
      {!embedded ? (
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold text-app">{scopeTitle}</h3>
        </div>
      ) : null}
      {showListingsScope && !showAlertsScope ? (
        <p className="text-xs text-muted mb-4">
          Choose what you hear about when neighbors interact with <strong className="text-app">your posts</strong>{' '}
          — comments, votes, claims, and profile updates.
        </p>
      ) : null}
      {showAlertsScope ? (
        <>
          <p className={`text-xs text-muted ${embedded ? 'mb-4' : 'mb-4'}`}>
            {scope === 'all'
              ? 'Get real-time alerts for messages, support, discover, and community news — even when the app is closed.'
              : 'Messages, support, discover, and community push alerts. Turn push on once here for all tabs.'}
          </p>
          <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4">
            <strong className="text-app">iPhone:</strong> add Sacramento Buy Nothing to your Home Screen, then enable
            alerts here. Safari tabs alone cannot receive push while closed.
          </p>
        </>
      ) : null}

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

      {saveMessage && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
          {saveMessage}
        </p>
      )}

      {prefsLoading && (
        <p className="text-sm text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4">
          Loading your notification settings from the community database…
        </p>
      )}

      {hasUnsavedChanges && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-accent/30 bg-accent/5">
          <p className="text-xs text-app flex-1 min-w-[12rem]">You have unsaved changes.</p>
          <button
            type="button"
            onClick={() => void savePreferences()}
            disabled={isSaving || prefsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-on-accent text-sm font-bold disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
          <button
            type="button"
            onClick={discardPreferenceChanges}
            disabled={isSaving || prefsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-app text-sm font-bold text-muted hover:bg-inset disabled:opacity-50"
          >
            Discard
          </button>
        </div>
      )}

      {showListingsScope && !showAlertsScope && masterDisabled && !prefsLoading ? (
        <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4">
          Enable push in the <strong className="text-app">Alerts</strong> tab first, then choose what you want to hear
          about your posts here.
        </p>
      ) : null}

      {(showAlertsScope || showListingsScope) && (
        <>
          {showAlertsScope ? (
            <div className="flex flex-wrap gap-2 mb-5">
              {!isSubscribed ? (
                <button
                  type="button"
                  onClick={() => void enableNotifications()}
                  disabled={isLoading || permission === 'unsupported' || permission === 'denied'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-on-accent text-sm font-bold disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" />
                  {isLoading ? 'Enabling…' : 'Enable alerts'}
                </button>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Subscribed on this device
                  </span>
                  <button
                    type="button"
                    onClick={() => void disableNotifications()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-app text-sm font-bold text-muted hover:bg-inset disabled:opacity-50"
                  >
                    <BellOff className="w-4 h-4" />
                    {isLoading ? 'Turning off…' : 'Turn off alerts'}
                  </button>
                </>
              )}
              {isSubscribed && (
                <>
                  <button
                    type="button"
                    onClick={() => void sendTestNotification()}
                    disabled={isTesting || isBroadcastTesting || isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-app text-sm font-bold text-app hover:bg-inset disabled:opacity-50"
                  >
                    {isTesting ? 'Sending…' : 'Send test alert'}
                  </button>
                  {isDirectorRole(userRole) && (
                    <button
                      type="button"
                      onClick={() => setBroadcastModalOpen(true)}
                      disabled={isTesting || isBroadcastTesting || isLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-sm font-bold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      {isBroadcastTesting ? 'Broadcasting…' : 'Test all users'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : null}

          {broadcastModalOpen && (
            <DirectorBroadcastTestModal
              sending={isBroadcastTesting}
              onClose={() => setBroadcastModalOpen(false)}
              onSend={(payload) => {
                void runBroadcastTest(payload).then((ok) => {
                  if (ok) setBroadcastModalOpen(false);
                });
              }}
            />
          )}

          {testMessage && showAlertsScope ? (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
              {testMessage}
            </p>
          ) : null}

          {showAlertsScope ? (
            <div className="rounded-xl border border-app bg-inset/30 px-3">
              <SwitchRow
                label="All alerts"
                description="Master switch for push on this account"
                checked={preferences.enabled}
                onChange={(value) => setPref('enabled', value)}
              />
            </div>
          ) : null}

          {showListingsScope ? (
            <div className={`${showAlertsScope ? 'mt-5' : ''} space-y-5 ${masterDisabled || prefsLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">
                  {LISTING_PREF_SECTION.title}
                </h4>
                <div className="rounded-xl border border-app bg-inset/30 px-3">
                  {LISTING_PREF_SECTION.items.map((toggle) => (
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
            </div>
          ) : null}

          {showAlertsScope ? (
            <div
              className={`mt-5 space-y-5 ${masterDisabled || prefsLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {PREF_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">
                    {section.title}
                  </h4>
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
                    Director oversight
                  </h4>
                  <div
                    className={`rounded-xl border border-app bg-inset/30 px-3 ${masterDisabled ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <SwitchRow
                      label="All director alerts"
                      description="Master switch for platform-wide director notifications"
                      checked={Boolean(preferences.directorAlerts)}
                      onChange={setDirectorMaster}
                    />
                  </div>
                  <div
                    className={`rounded-xl border border-app bg-inset/30 px-3 mt-2 ${directorMasterDisabled ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {DIRECTOR_CATEGORY_PREFS.map((toggle) => (
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
          ) : null}

          {showAlertsScope ? (
            <>
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
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
