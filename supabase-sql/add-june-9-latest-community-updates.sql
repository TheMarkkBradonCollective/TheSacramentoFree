-- =========================================================
-- JUNE 9, 2026 — LATEST COMMUNITY UPDATES (deep-detail changelog)
-- For ALL 87 changelog rows, prefer: expand-all-community-updates-detail.sql
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
--
-- Format:
--   title  = short headline (unchanged style)
--   body   = 1–2 sentence neighbor-facing summary
--   detail = long full story with files, architecture, and setup steps
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES

-- ─────────────────────────────────────────────────────────
-- NEW: Latest shipped fixes & features
-- ─────────────────────────────────────────────────────────

(
  '2026-06-09_real-notifications-not-just-test',
  '2026-06-09',
  'Real alerts work again — not just test push',
  'Messages, listings, comments, and other alerts deliver again. Only the test button had been working for many neighbors.',
  $detail$WHAT NEIGHBORS SEE
After this deploy, alerts for real activity (new messages, listing changes, comments, votes, support replies, etc.) should reach your device again — not only the “Send test notification” button in Account → Push notifications.

WHAT WAS BROKEN
We had turned off client-side push dispatch to stop duplicate notifications. That left many alert types dependent on Supabase database webhooks alone. If webhooks were missing or a preference row had enabled=false stuck in the database, every real push was filtered out — while the test endpoint (/api/push/test) still worked because it bypasses preference checks and webhooks.

WHAT WE CHANGED (CODE)

1) Re-enabled client dispatch — src/lib/pushConfig.ts
   export const CLIENT_PUSH_DISPATCH_ENABLED = true;
   The app again calls push helpers after Supabase writes (src/supabase.ts → runPushTask). Server webhooks remain the backup when the app is closed.

2) Dedup prevents doubles — api/push/_server/pushDedup.ts
   claimPushDispatch(tag) writes to push_dispatch_log with a 90-second window. Client and webhook both may fire; only the first send with a given tag goes through.

3) Subscribe fixes stuck “all off” prefs — api/push/_server/pushSubscribe.ts
   New ensureNotificationPreferencesOnSubscribe(userId): if a notification_preferences row already exists, we UPDATE enabled=true without wiping other toggles. Previously ignoreDuplicates on subscribe left enabled=false forever, blocking all real pushes.

4) Same subscribe fix on the client — src/lib/pushNotifications.ts
   savePushSubscriptionDirect() now calls ensureNotificationPreferencesOnSubscribe() instead of upsert with ignoreDuplicates.

5) Aligned dedup tags — src/lib/pushEvents.ts + api/push/_server/neighborNotify.ts
   Messages use msg-{messageId}, pickup chat notes use pickup-msg-{messageId}, announcements use announcement-{id} so client and server share tags.

FILES TOUCHED
src/lib/pushConfig.ts, src/supabase.ts, src/lib/pushIntegration.ts, src/lib/pushEvents.ts, api/push/_server/pushSubscribe.ts, api/push/subscribe.ts, server/app.ts

WHAT YOU SHOULD DO
On each device: Help or Account → Push notifications → turn off, then on again once. Tap Save settings if you changed toggles. Confirm test push still works, then trigger a real event (have someone message you).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_stable-after-sign-in',
  '2026-06-09',
  'App stays open after you sign in',
  'Fixed white screens and “Something went wrong” crashes right after login when opening notification settings.',
  $detail$WHAT NEIGHBORS SEE
Signing in should land you on the feed without a blank page or error boundary. Opening Help → notification-related panels should no longer crash the whole app.

ROOT CAUSES

1) Duplicate Supabase Realtime channels
   Two components both called usePushNotifications(userId) with the same channel name live-notification-prefs-{userId}. Supabase throws: “cannot add postgres_changes callbacks after subscribe()”. That uncaught error took down the React tree.

2) Logout race with push cleanup
   clearNotificationDataOnLogout() ran during sign-out while hooks still mounted, causing state updates on unmounted components.

WHAT WE CHANGED (CODE)

1) Unique realtime channel per hook instance — src/hooks/usePushNotifications.ts
   realtimeChannelIdRef uses crypto.randomUUID() so channelName becomes live-notification-prefs-{userId}-{uuid}.

2) Lightweight celebration modal — src/components/PushNotificationCelebration.tsx
   usePushNotifications(userId, { syncPreferences: false }) so the onboarding prompt does not open a second prefs channel.

3) Hook order + guards — src/App.tsx
   useRef/useState order fixed; logout paths guard against races while notification session clears.

4) Error boundary — src/components/AppErrorBoundary.tsx
   Catches render crashes with a recoverable message instead of a white screen.

5) Missing import — src/components/Onboarding.tsx
   Added Heart icon import that had been causing a secondary crash.

FILES TOUCHED
src/hooks/usePushNotifications.ts, src/components/PushNotificationCelebration.tsx, src/components/NotificationSettings.tsx, src/App.tsx, src/components/AppErrorBoundary.tsx, src/lib/pushNotifications.ts (clearNotificationDataOnLogout)

VERIFICATION
Sign in on phone and desktop, open Help, expand notification settings, switch accounts — app should remain interactive.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_staff-announcements-in-help',
  '2026-06-09',
  'Staff announcements in Help',
  'Help now has a separate Announcements board: staff post news, neighbors vote and comment on each post.',
  $detail$WHAT NEIGHBORS SEE
Help & support → Announcements. Tap a post to expand it, upvote/downvote, and join the discussion in comments. This is separate from App updates (director changelog).

WHAT STAFF SEE
Any staff role can tap Post announcement. Authors and the director can edit or delete their posts. Votes help staff see what resonates.

DATABASE (run in Supabase SQL Editor)
1) supabase-sql/help-announcements.sql — table help_announcements
2) supabase-sql/help-announcement-comments.sql — table help_announcement_comments
3) supabase-sql/add-app-updates-notification-pref.sql — appUpdates column + announcement vote type

TABLE: help_announcements
Columns mirror app_updates but use authorName/authorTitle instead of directorName. postedByUserId links to users.uid.

TABLE: help_announcement_comments
announcementId → help_announcements.id ON DELETE CASCADE, plus denormalized userName, userNeighborhood, text.

VOTES
community_content_votes.targetType now includes 'announcement' (see community-content-votes.sql). AnnouncementsList uses useCommunityContentVotes('announcement', ids).

COMMENTS
src/hooks/useHelpAnnouncementComments.ts — loads comments, realtime on help_announcement_comments, optimistic add/delete.
src/components/AnnouncementComments.tsx — discussion UI under expanded posts.

CRUD / API LAYER — src/supabase.ts
getSupabaseHelpAnnouncements, createSupabaseHelpAnnouncement, updateSupabaseHelpAnnouncement, deleteSupabaseHelpAnnouncement, comment helpers.

PERMISSIONS — src/lib/roles.ts
canPostAnnouncements() = any staff role.
canEditAnnouncement(actor, postedByUserId) = author or director.

UI
src/components/AnnouncementsList.tsx — main list (forked from UpdatesList with comments).
src/components/AccountHelpSection.tsx — second Help tile for Announcements vs App updates.

PUSH
help_announcements INSERT → api/push/_server/webhookDispatch.ts → runAnnouncementNotify → eventType 'announcement' → notifications toggle announcements.

Add 15th webhook: help_announcements INSERT → /api/webhooks/supabase-push$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_app-updates-vs-announcements-notifications',
  '2026-06-09',
  'App updates and announcements are separate in notifications',
  'Notification settings now have distinct toggles: App updates (director changelog) vs Announcements (staff Help posts).',
  $detail$WHY WE SPLIT THEM
App updates = director changelog in app_updates (technical “what shipped”). Announcements = staff community news in help_announcements (Help board with votes/comments). They must not share one push preference.

NOTIFICATION TOGGLES — src/components/NotificationSettings.tsx
Community section now has:
• App updates → preference key appUpdates
• Announcements → preference key announcements
• Account updates → accountUpdates (suspensions, bans, role changes — unchanged)

DATABASE
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS "appUpdates" BOOLEAN DEFAULT true;
(see supabase-sql/add-app-updates-notification-pref.sql)

SERVER PREF MAP — api/push/_server/pushDelivery.ts
EVENT_PREF_MAP:
  app_update → appUpdates
  announcement → announcements
  account_update → accountUpdates

PUSH EVENT TYPES — api/push/_server/pushDelivery.ts PushEventType
Added app_update alongside announcement.

WEBHOOK ROUTING — api/push/_server/webhookDispatch.ts
• app_updates INSERT → runAppUpdateNotify (api/push/_server/appUpdateNotify.ts) → url /updates
• help_announcements INSERT → runAnnouncementNotify → url /help/announcements

CLIENT PUSH — src/lib/pushEvents.ts
notifyAppUpdate() sends eventType app_update.
notifyCommunityAnnouncement() sends eventType announcement.

DEEP LINKS — src/lib/pushDeepLink.ts
/updates opens Help → App updates panel.
/help/announcements opens Help → Announcements panel.
App.tsx passes initialHelpPanel through MobileView / TabletView / DesktopView → CommunityMenuView → AccountHelpSection.

WEBHOOK DOC — supabase-sql/supabase-push-webhook.sql
Row 14: push-app-updates on app_updates INSERT.
Row 15: push-announcements on help_announcements INSERT (not app_updates).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_logout-clears-device-push',
  '2026-06-09',
  'Logout clears notification data on this device',
  'Signing out removes this phone’s push subscription and in-memory notification UI so the next account does not inherit your alerts.',
  $detail$WHAT NEIGHBORS SEE
After logout, notification toggles reset in the UI until the next account loads its saved preferences from the database. The device is no longer registered to receive pushes for the signed-out account.

WHAT STAYS IN THE DATABASE
Per-account notification_preferences remain saved (toggles you tapped Save settings for). Only device push subscription rows and local session state are cleared.

CODE PATH — src/lib/pushNotifications.ts
clearNotificationDataOnLogout(userId):
1) detachPushSubscriptionForUser(uid) — removes push_subscriptions row for this endpoint and calls subscription.unsubscribe() in the browser.
2) Clears celebration localStorage key sbn_push_celebration_prompt_dismissed_v1.
3) Broadcasts NOTIFICATION_SESSION_CLEARED_EVENT so usePushNotifications resets to CLEARED_NOTIFICATION_PREFERENCES in memory.

HOOK — src/hooks/usePushNotifications.ts
Listens for sbn-notification-session-cleared and calls resetPreferencesState().

CALLED FROM — src/App.tsx handleLogOut
await clearNotificationDataOnLogout(userProfile.uid) before supabase.auth.signOut().

IMPORTANT
Prefs are per account in notification_preferences (one row per userId). Push delivery is per device in push_subscriptions. Re-enable notifications after switching accounts.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- EXPANDED DETAIL for recent June 9 entries (same titles)
-- ─────────────────────────────────────────────────────────

(
  '2026-06-09_notification-settings-save-button',
  '2026-06-09',
  'Save button for notification toggles',
  'Notification preferences now load from your account in the database and save only when you tap Save settings.',
  $detail$SUMMARY FOR NEIGHBORS
Your notification choices are stored per account in Supabase, not silently in the browser. Flip toggles, review them, then tap Save settings. Discard reverts to last saved state.

UI — src/components/NotificationSettings.tsx
• hasUnsavedChanges banner with Save settings + Discard buttons.
• setDraftPreferences() updates local React state only until save.
• savePreferences() → saveNotificationPreferences() in src/lib/pushNotifications.ts → upsert notification_preferences.

HOOK — src/hooks/usePushNotifications.ts
preferences vs savedPreferences state, preferencesEqual(), hasUnsavedRef prevents realtime reload from overwriting unsaved edits.

DATABASE
Table notification_preferences (see supabase-sql/notifications-complete.sql). Realtime channel syncs across tabs when another device saves.

LOGOUT BEHAVIOR
clearNotificationDataOnLogout clears device push + in-memory UI; DB prefs for the account remain for next login.

WHY NOT AUTOSAVE
Prevents accidental toggles and matches “prefs per account, push per device” model documented in Help copy.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_every-alert-like-new-listings',
  '2026-06-09',
  'Every alert works like new listings',
  'Messages, comments, votes, pickup reminders, account notices, and announcements now deliver through the same server pipeline as new listing alerts.',
  $detail$ARCHITECTURE
New listings were the reference path: Supabase INSERT on items → webhook → api/webhooks/supabase-push → api/push/_server/webhookDispatch.ts → neighborNotify → runPushSend → sendPushToUsers.

WEBHOOK HANDLERS ADDED/COMPLETED — webhookDispatch.ts
• message_requests INSERT/UPDATE (accepted)
• item_claim_requests, item_claims, item_comments, item_votes
• messages INSERT (per-message tags msg-{messageId})
• items UPDATE → status, pickup_scheduled, saved-item alerts
• moderation_audit_log → account_update pushes
• app_updates / help_announcements → changelog vs staff announcements
• support_ticket_messages, user_reports, app_updates

DEDUP — api/push/_server/pushDedup.ts
push_dispatch_log table with UNIQUE(tag). Fail-open on DB errors except duplicate 23505.

CLIENT DISPATCH — src/lib/pushConfig.ts
CLIENT_PUSH_DISPATCH_ENABLED true again with dedup tags matching server.

SQL SETUP
supabase-sql/notifications-complete.sql, supabase-sql/supabase-push-webhook.sql (15 webhooks), push_dispatch_log unique index on tag.

CRON — api/cron/notification-jobs.ts
Listing expiry + pickup reminders when app closed.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_no-more-double-pings',
  '2026-06-09',
  'No more double pings',
  'Stopped the same alert from firing twice when both the app and the server tried to send it.',
  $detail$PROBLEM
Client runPushTask() in src/supabase.ts and Supabase webhooks both fired on the same database event → two notifications.

PHASE 1 FIX
Set CLIENT_PUSH_DISPATCH_ENABLED = false in src/lib/pushConfig.ts — stopped doubles but broke alerts when webhooks absent.

PHASE 2 FIX (current)
Re-enabled client dispatch WITH dedup:
• api/push/_server/pushDedup.ts — claimPushDispatch(tag)
• Matching tags in src/lib/pushEvents.ts and api/push/_server/neighborNotify.ts
• Bad tags fixed: msg-{chatId} → msg-{messageId}, static community-announcement → announcement-{id}

SERVICE WORKER — public/service-worker.js
Removed unauthenticated resubscribe that reassigned endpoints to wrong users.

SUBSCRIBE — api/push/_server/pushSubscribe.ts claimPushSubscriptionForUser deletes endpoint then upserts for signed-in userId.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_notifications-right-account',
  '2026-06-09',
  'Notifications go to the right account',
  'Fixed push sometimes landing on the wrong neighbor on shared phones — your alerts stay tied to whoever is signed in.',
  $detail$PROBLEM
Shared devices: browser push endpoint stayed registered to previous user’s row in push_subscriptions.

FIX — api/push/_server/pushSubscribe.ts claimPushSubscriptionForUser()
1) DELETE FROM push_subscriptions WHERE endpoint = $endpoint
2) UPSERT row with current auth userId, p256dh, auth keys

CLIENT — src/lib/pushNotifications.ts persistPushSubscription() posts to /api/push/subscribe with Bearer token.

RESUBSCRIBE — api/push/resubscribe.ts requires auth (removed service worker silent resubscribe).

LOGOUT — clearNotificationDataOnLogout() detaches subscription for signed-out user.

AFTER DEPLOY
Each neighbor: notifications off → on once while signed in as themselves.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
)

ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "updatedAt" = NOW();
