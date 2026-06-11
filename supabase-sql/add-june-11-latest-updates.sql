-- =========================================================
-- JUNE 11, 2026 — LATEST APP UPDATES
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
-- =========================================================
--
-- Publishes 6 App update cards for bell → Updates tab.
-- Post the push-refresh ANNOUNCEMENT yourself in the app (bell →
-- Announcements → Post announcement) so neighbors get a push alert.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'New bell hub — your home for news, updates, and alerts',
  'Tap the bell next to the theme button (top right). Announcements, changelog, push setup, and your-post notifications all live here now — not buried in Account or Community hub.',
  $detail$WHAT CHANGED

We moved the community’s notification center to one place: the bell icon in the top navigation bar, right next to the light/dark theme toggle.

Before: announcements, app updates, and push settings were scattered across Community hub and Account.
Now: one bell opens a full-screen panel with four tabs.

THE FOUR TABS

1. Announcements — staff community news. Vote and comment on posts. Directors and staff publish here; posting triggers a push to neighbors who enabled Announcements under Alerts.

2. Updates — director changelog (what shipped, technical detail when you expand an entry).

3. Alerts — everything except your own listings:
   • Enable or turn off push on this device
   • Master “All alerts” switch
   • Messages, message requests, community chat, support tickets
   • Discover: new listings, nearby items, requests, saved items
   • Community: app updates + announcements toggles
   • Nearby radius and follow categories
   • Staff / director moderation toggles (role-based)

4. Notifications — only activity on YOUR posts and profile:
   • Comments, upvotes, downvotes on your listings
   • Claims, gifts, listing status changes
   • Pickup reminders and account updates

WHY ALERTS VS NOTIFICATIONS
Alerts = general push (messages, chat, new items near you). Notifications = neighbors interacting with stuff you posted. Tune them separately.

WHERE TO FIND IT
Any screen → top right → bell icon (id: notifications_hub_btn).

DEEP LINKS
• /help/announcements → Announcements tab
• /updates → Updates tab
• /notifications → Alerts tab (device setup)
• /notifications/listings → Notifications tab (your posts)

AFTER THIS DEPLOY
Open bell → Alerts → Turn off alerts → Enable alerts once per device. Then review Notifications tab and tap Save settings if you changed toggles.

iPhone: open from Home Screen (Add to Home Screen), not a Safari tab.

CODE
src/contexts/NotificationsHubContext.tsx, src/components/NotificationSettings.tsx, src/lib/pushDeepLink.ts, src/App.tsx$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'Push alerts rebuilt — refresh once on each device',
  'We fixed webhooks, duplicate alerts, missing preference columns, and several delivery bugs. Turn alerts off and back on under bell → Alerts after updating.',
  $detail$WHAT WAS BROKEN
Many neighbors only received the test push, not real activity. Causes included duplicate dispatch tags, stuck preference rows, missing webhook triggers, and device subscriptions out of sync after key changes.

WHAT WE FIXED
• Item claims, support tickets, saved-listing status — column and dedup tag mismatches
• All 15 Supabase push webhooks (supabase-sql/install-push-webhooks.sql)
• Community chat — reliable dispatch after send
• Director join/leave push handlers
• Logout clears this device subscription on shared phones
• Explicit Save settings button; prefs sync across tabs

DIRECTOR OPS IF STILL BROKEN
1. supabase-sql/notifications-complete.sql
2. supabase-sql/install-push-webhooks.sql
3. Vercel env: VAPID keys, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET

NEIGHBOR ACTION
Bell → Alerts → Turn off → Enable → Send test alert → Save settings if toggles changed.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_support-inbox-in-messages',
  '2026-06-11',
  'Support inbox moved into Messages',
  'Staff support tickets now live in the Chat tab — same sidebar style as your conversations.',
  $detail$Neighbors: Chat → Support — open tickets, reply, back button to inbox.
Staff: Chat → Support inbox — ticket list with last-message preview. Removed from Community hub moderation panel.
Push: Alerts tab → Support tickets. Deep links /staff/tickets and /support open Messages support.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-message-deletion',
  '2026-06-11',
  'Delete your chat messages',
  'Delete messages you sent in any chat. Directors and city managers can remove messages in the all-neighbors community channel.',
  $detail$Use delete on your own messages in DMs, community chat, staff chat, and support threads. Director and city manager can delete any message in community-global.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_in-app-dialogs',
  '2026-06-11',
  'No more browser pop-up boxes',
  'Confirmations use in-app dialogs that match Sacramento Buy Nothing instead of generic browser OK/Cancel boxes.',
  $detail$Applies to deletes, director broadcast tests, and other sensitive actions — src/contexts/ConfirmContext.tsx, ConfirmDialog.tsx.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_post-announcement-for-push',
  '2026-06-11',
  'Directors: post announcements in the bell to trigger push',
  'Staff announcements must be posted from bell → Announcements (not SQL) so the help_announcements webhook fires and neighbors get a push.',
  $detail$HOW TO NOTIFY EVERYONE ABOUT PUSH REFRESH

1. Deploy this app version
2. Run this SQL file for Updates tab entries
3. Bell → Announcements → Post announcement
4. Use title/summary about refreshing alerts under bell → Alerts tab
5. Save once — push goes to neighbors with Announcements enabled under Alerts

Requires push-announcements webhook on help_announcements INSERT (install-push-webhooks.sql).$detail$,
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
