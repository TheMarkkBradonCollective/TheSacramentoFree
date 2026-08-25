import { Fragment, useState } from 'react';
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
import { isAndroidApp } from '../lib/nativePlatform';
import { isDirectorRole, isStaffRole } from '../lib/roles';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';

export type NotificationSettingsScope = 'alerts' | 'listings' | 'all';

interface NotificationSettingsProps {
  userId: string;
  userRole?: UserProfile['role'];
  staffInteractionMode?: UserProfile['staffInteractionMode'];
  fullBleed?: boolean;
  /** Inside the navbar bell panel — no outer card chrome. */
  embedded?: boolean;
  /** Bell hub: alerts = all push toggles; listings = legacy your-post toggles only */
  scope?: NotificationSettingsScope;
}

const RADIUS_OPTIONS: { value: NearbyRadiusMiles; label: string }[] = [
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
  { value: 25, label: '25 miles' },
  { value: 50, label: '50 miles' },
  { value: 0, label: 'Entire city only' },
];

const QUIET_HOUR_OPTIONS = [
  '20:00',
  '21:00',
  '22:00',
  '23:00',
  '00:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
] as const;

function formatQuietHourLabel(value: string): string {
  const [hourPart, minutePart = '00'] = value.split(':');
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minutePart} ${suffix}`;
}

type BooleanPrefKey = {
  [K in keyof NotificationPreferences]: NotificationPreferences[K] extends boolean ? K : never;
}[keyof NotificationPreferences];

const PREF_SECTIONS: {
  title: string;
  items: { key: BooleanPrefKey; label: string; description: string }[];
}[] = [
  {
    title: 'Chat & support',
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
      {
        key: 'friendRequests',
        label: 'Friend requests',
        description: 'When someone sends or accepts a friend request',
      },
      { key: 'support', label: 'Support tickets', description: 'Staff replies on your help tickets' },
    ],
  },
  {
    title: 'Discover listings',
    items: [
      { key: 'newListings', label: 'New listings', description: 'New free items in categories you follow' },
      { key: 'nearbyListings', label: 'Nearby listings', description: 'Free items near your neighborhood' },
      {
        key: 'neighborRequests',
        label: 'Neighbor requests (ISO)',
        description: 'When someone posts a looking-for or trade request',
      },
      {
        key: 'nearbyRequests',
        label: 'Nearby requests',
        description: 'ISO posts near your neighborhood',
      },
      {
        key: 'claimRequests',
        label: 'Claim requests',
        description: 'When someone asks to pick up your listing',
      },
      {
        key: 'requestFulfilled',
        label: 'Request fulfilled',
        description: 'When a neighbor fulfills your ISO or request post',
      },
      {
        key: 'savedItems',
        label: 'Saved items',
        description: 'When a bookmarked listing is edited, commented on, claimed, or changes status',
      },
    ],
  },
  {
    title: 'Community feed',
    items: [
      {
        key: 'feedPosts',
        label: 'New feed posts',
        description: 'When neighbors share new community feed posts',
      },
      {
        key: 'feedComments',
        label: 'Feed comments',
        description: 'Comments on your feed posts',
      },
      {
        key: 'feedReplies',
        label: 'Feed comment replies',
        description: 'When someone replies to your comment on a feed post',
      },
      {
        key: 'feedReactions',
        label: 'Feed reactions',
        description: 'Emoji reactions on your feed posts',
      },
      {
        key: 'feedUpvotes',
        label: 'Feed upvotes',
        description: 'When someone upvotes your feed post (anonymous)',
      },
      {
        key: 'feedDownvotes',
        label: 'Feed downvotes',
        description: 'When someone downvotes your feed post (anonymous)',
      },
    ],
  },
  {
    title: 'Community news',
    items: [
      { key: 'appUpdates', label: 'App updates', description: 'Push when new changelog entries ship (bell → Updates)' },
      { key: 'announcements', label: 'Announcements', description: 'Push when staff post news (bell → Announcements)' },
      {
        key: 'discussionComments',
        label: 'News & Updates comments',
        description: 'When someone comments on a news post or update you published',
      },
    ],
  },
  {
    title: 'Events',
    items: [
      {
        key: 'eventRsvps',
        label: 'Event RSVPs',
        description: 'When neighbors RSVP going, maybe, or can’t go to your event',
      },
      {
        key: 'eventComments',
        label: 'Event comments',
        description: 'Comments on community events you host',
      },
    ],
  },
  {
    title: 'Awards',
    items: [
      {
        key: 'awards',
        label: 'Awards unlocked',
        description: 'When you earn a neighbor badge',
      },
    ],
  },
];

const YOUR_POSTS_SECTIONS: {
  title: string;
  items: { key: BooleanPrefKey; label: string; description: string }[];
}[] = [
  {
    title: 'Your listings',
    items: [
      { key: 'claims', label: 'Claims', description: 'When someone claims your item' },
      { key: 'gifts', label: 'Gifts', description: 'When an item is marked gifted' },
      {
        key: 'listingComments',
        label: 'Listing comments',
        description: 'New comments on your giveaways, requests, and trades',
      },
      {
        key: 'listingUpvotes',
        label: 'Listing upvotes',
        description: 'When someone upvotes your listing (anonymous)',
      },
      {
        key: 'listingViews',
        label: 'Listing views',
        description: 'When a neighbor views your listing for the first time',
      },
      {
        key: 'listingDownvotes',
        label: 'Listing downvotes',
        description: 'When someone downvotes your listing (anonymous)',
      },
      {
        key: 'listingModeration',
        label: 'Staff listing review',
        description: 'When staff approve or deny a listing you posted',
      },
      {
        key: 'listingExpiry',
        label: 'Listing expiry & status',
        description: 'Expiring soon, expired, withdrawn, and other status changes',
      },
    ],
  },
  {
    title: 'Pickup & Go Get',
    items: [
      {
        key: 'goGetAlerts',
        label: 'Go Get requests & live trip',
        description:
          'Availability rings, schedule proposals, fulfiller ready, on-the-way, approaching, and arrival (Android app only)',
      },
      {
        key: 'pickupCoordination',
        label: 'Pickup reminders & schedule',
        description:
          'Scheduled pickup, 30-minute and 1-hour reminders, pickup tomorrow, cancellations, and contactless handoff (Android app only)',
      },
    ],
  },
  {
    title: 'Account & safety',
    items: [
      {
        key: 'violations',
        label: 'Violations & appeals',
        description: 'Go Get strikes, account locks, violation decisions, and appeal outcomes',
      },
      {
        key: 'accountUpdates',
        label: 'Account updates',
        description: 'Profile changes and general account notices',
      },
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
  staffInteractionMode,
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

  const actingOfficial = isStaffActingOfficial({ role: userRole, staffInteractionMode });
  const showStaffNotificationPrefs = isStaffRole(userRole) && actingOfficial;
  const showDirectorNotificationPrefs = isDirectorRole(userRole) && actingOfficial;

  const shell = embedded
    ? ''
    : fullBleed
      ? 'border-b border-app px-4 py-6 bg-surface'
      : 'bg-surface border border-app rounded-2xl p-6 shadow-md';

  const masterDisabled = !preferences.enabled || permission === 'denied' || permission === 'unsupported';
  const directorMasterDisabled = masterDisabled || !preferences.directorAlerts;

  const setPref = (key: keyof NotificationPreferences, value: boolean | number | string | string[]) => {
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
    scope === 'listings' ? 'Notifications' : scope === 'alerts' ? 'Push alerts' : 'Push notifications';

  return (
    <section className={shell} id="notification_settings">
      {!embedded ? (
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-bold text-app">{scopeTitle}</h3>
        </div>
      ) : null}
      {showListingsScope && !showAlertsScope && !embedded ? (
        <p className="text-xs text-muted mb-4">
          Choose what you hear about when neighbors interact with <strong className="text-app">your posts</strong>{' '}
          — comments, votes, claims, and profile updates.
        </p>
      ) : null}
      {showAlertsScope ? (
        <>
          {(scope === 'all' || !embedded) && (
            <p className="text-xs text-muted mb-4">
              {scope === 'all'
                ? 'Get real-time alerts for messages, support, discover, community news, and your listings — even when the app is closed.'
                : 'All push toggles live here — messages, discover, community, and alerts for your own posts.'}
            </p>
          )}
          <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2 mb-4">
            <strong className="text-app">iPhone:</strong> add Sacramento Buy Nothing to your Home Screen, then enable
            alerts here. Safari tabs alone cannot receive push while closed.
            {isAndroidApp() ? (
              <>
                {' '}
                <strong className="text-app">Android app:</strong> alerts use Firebase Cloud Messaging for reliable
                delivery in the background.
              </>
            ) : null}
          </p>
        </>
      ) : null}

      {permission === 'unsupported' && (
        <p className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mb-4">
          {isAndroidApp()
            ? 'Push is not configured on this Android build yet. Add google-services.json and redeploy the APK.'
            : 'This browser does not support push notifications.'}
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
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/40 bg-accent/10 text-sm font-bold text-accent/70 hover:bg-accent/20 disabled:opacity-50"
                    >
                      {isBroadcastTesting ? 'Broadcasting…' : 'Broadcast'}
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

          {showAlertsScope ? (
            <div
              className={`mt-5 rounded-xl border border-app bg-inset/30 px-3 py-1 ${
                masterDisabled || prefsLoading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mt-3 mb-1 px-1">
                Quiet hours
              </h4>
              <SwitchRow
                label="Pause alerts overnight"
                description="Silence normal push between your chosen times (inbox still updates)"
                checked={preferences.quietHoursEnabled === true}
                onChange={(value) => setPref('quietHoursEnabled', value)}
              />
              {preferences.quietHoursEnabled ? (
                <>
                  <div className="flex items-center justify-between gap-3 py-3 border-b border-app/60">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-sm font-semibold text-app">Start</div>
                      <div className="text-[11px] text-muted mt-0.5 leading-snug">When quiet hours begin</div>
                    </div>
                    <select
                      value={preferences.quietHoursStart || '22:00'}
                      onChange={(e) => setPref('quietHoursStart', e.target.value)}
                      className="text-sm rounded-lg border border-app bg-surface px-2 py-1.5 text-app"
                      aria-label="Quiet hours start"
                    >
                      {QUIET_HOUR_OPTIONS.map((time) => (
                        <option key={`start-${time}`} value={time}>
                          {formatQuietHourLabel(time)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-3 border-b border-app/60">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-sm font-semibold text-app">End</div>
                      <div className="text-[11px] text-muted mt-0.5 leading-snug">When alerts resume</div>
                    </div>
                    <select
                      value={preferences.quietHoursEnd || '07:00'}
                      onChange={(e) => setPref('quietHoursEnd', e.target.value)}
                      className="text-sm rounded-lg border border-app bg-surface px-2 py-1.5 text-app"
                      aria-label="Quiet hours end"
                    >
                      {QUIET_HOUR_OPTIONS.map((time) => (
                        <option key={`end-${time}`} value={time}>
                          {formatQuietHourLabel(time)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <SwitchRow
                    label="Allow urgent alerts"
                    description="Pickup arrivals, Go Get rings, and safety alerts can still push"
                    checked={preferences.quietHoursAllowUrgent !== false}
                    onChange={(value) => setPref('quietHoursAllowUrgent', value)}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {showListingsScope && !showAlertsScope ? (
            <div className={`space-y-5 ${masterDisabled || prefsLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              {YOUR_POSTS_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">
                    {section.title}
                  </h4>
                  <div className="rounded-xl border border-app bg-inset/30 px-3">
                    {section.items.map((toggle) => (
                      <Fragment key={toggle.key}>
                        <SwitchRow
                          label={toggle.label}
                          description={toggle.description}
                          checked={Boolean(preferences[toggle.key])}
                          onChange={(value) => setPref(toggle.key, value)}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>
              ))}
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
                      <Fragment key={toggle.key}>
                        <SwitchRow
                          label={toggle.label}
                          description={toggle.description}
                          checked={Boolean(preferences[toggle.key])}
                          onChange={(value) => setPref(toggle.key, value)}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>
              ))}

              {YOUR_POSTS_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">
                    {section.title}
                  </h4>
                  <div className="rounded-xl border border-app bg-inset/30 px-3">
                    {section.items.map((toggle) => (
                      <Fragment key={toggle.key}>
                        <SwitchRow
                          label={toggle.label}
                          description={toggle.description}
                          checked={Boolean(preferences[toggle.key])}
                          onChange={(value) => setPref(toggle.key, value)}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>
              ))}

              {showStaffNotificationPrefs && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 px-1">
                    {STAFF_PREF_SECTION.title}
                  </h4>
                  <div className="rounded-xl border border-app bg-inset/30 px-3">
                    {STAFF_PREF_SECTION.items.map((toggle) => (
                      <Fragment key={toggle.key}>
                        <SwitchRow
                          label={toggle.label}
                          description={toggle.description}
                          checked={Boolean(preferences[toggle.key])}
                          onChange={(value) => setPref(toggle.key, value)}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}

              {showDirectorNotificationPrefs && (
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
                      <Fragment key={toggle.key}>
                        <SwitchRow
                          label={toggle.label}
                          description={toggle.description}
                          checked={Boolean(preferences[toggle.key])}
                          onChange={(value) => setPref(toggle.key, value)}
                        />
                      </Fragment>
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
                <div className="flex flex-wrap gap-2 pr-1">
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
              {embedded ? <div className="h-8 shrink-0" aria-hidden /> : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
