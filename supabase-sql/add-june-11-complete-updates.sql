-- =========================================================
-- JUNE 11, 2026 — COMPLETE APP UPDATES (run once)
-- Supabase SQL Editor → paste → Run
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
-- =========================================================
--
-- BEFORE OR AFTER THIS FILE (director ops):
--   1. supabase-sql/user-notifications.sql  (required for Notifications inbox)
--   2. supabase-sql/notifications-complete.sql + install-push-webhooks.sql (if push still broken)
--
-- ANNOUNCEMENT PUSH: post in the app (bell → Announcements), NOT SQL.
--   Or run supabase-sql/post-push-refresh-announcement.sql for a one-shot SQL announcement.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'New bell hub — four tabs, each with its own job',
  'Tap the bell (top right, next to theme). News, changelog, your notification inbox, then push alert settings last.',
  $detail$WHERE TO FIND IT
Any screen → top right → bell icon (next to light/dark theme).

TAB ORDER (left to right)

1. ANNOUNCEMENTS (mobile: News)
   Staff community news — vote and comment. Directors post here; neighbors get push if Alerts → Announcements is on.

2. UPDATES (mobile: Updates)
   Director changelog — tap any entry to expand the full story.

3. NOTIFICATIONS (mobile: Notify)
   Your inbox — activity you receive (comments, votes, claims, messages, discover, chat, and more). Not where you change push settings.

4. ALERTS (mobile: Alerts) — LAST TAB
   All push toggles: turn device on/off, master switch, messages, chat, support, discover, community, your-post prefs, radius, categories, staff/director moderation.

KEY IDEA
• Notifications = what happened (read it)
• Alerts = what you want pushed to your phone (toggle it)

DEEP LINKS
• /help/announcements → Announcements
• /updates → Updates
• /notifications → Notifications inbox
• /notifications/alerts → Alerts settings

REFRESH PUSH (after deploy)
Bell → Alerts (last tab) → Turn off alerts → Enable alerts → Save settings.
iPhone: open from Home Screen (Add to Home Screen), not a Safari tab.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_notifications-inbox-alerts-toggles',
  '2026-06-11',
  'Notifications inbox + Alerts toggles',
  'Notifications tab is your inbox of what you receive. Alerts tab (last) has every push toggle, including comments, votes, and claims on your posts.',
  $detail$NOTIFICATIONS TAB (inbox)
Shows rows from your personal notification log — comments, upvotes, downvotes, claims, claim requests, listing status, messages, discover, community chat, support, and other alert types you are eligible for.

Requires user_notifications table on the database (run user-notifications.sql once).

ALERTS TAB (last)
Every push preference in one place — device enable, master switch, messages, chat, support, discover, community, your-post alerts, nearby radius, categories, staff/director toggles.

New pushes also write to your Notifications inbox when we send them.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'Push alerts rebuilt — refresh once on each device',
  'We fixed webhooks, duplicate alerts, missing preference columns, and several delivery bugs. Turn alerts off and back on under bell → Alerts after updating.',
  $detail$WHAT WE FIXED
• Item claims, support tickets, saved-listing status — column and dedup tag mismatches
• All Supabase push webhooks (install-push-webhooks.sql)
• Community chat — reliable dispatch after send
• Logout clears this device subscription on shared phones
• Every eligible push now logs to Notifications inbox

NEIGHBOR ACTION
Bell → Alerts (last tab) → Turn off → Enable → Send test alert → Save settings if toggles changed.

DIRECTOR OPS IF STILL BROKEN
1. notifications-complete.sql
2. install-push-webhooks.sql
3. user-notifications.sql
4. Vercel env: VAPID keys, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET$detail$,
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
Staff: Chat → Support inbox — ticket list with last-message preview.

Push: Alerts tab → Support tickets. Deep links /staff/tickets and /support open Messages support.

DELETE CLOSED TICKETS
Once a ticket is closed, the opener or staff can delete it from the thread (Delete closed ticket).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-sidebar-preview',
  '2026-06-11',
  'Messages sidebar — last 3 chats + View all',
  'Support inbox and direct messages show your three most recent threads in the sidebar, with View all to expand.',
  $detail$SUPPORT
Chat → Support shows up to 3 recent tickets. Tap View all for the full support list.

DIRECT MESSAGES
Up to 3 recent DM threads in the sidebar. View all expands; Show fewer collapses back to three.

Keeps the chat panel tidy on phones while still one tap away from everything.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-empty-states',
  '2026-06-11',
  'Chat empty states match across Support and DMs',
  'When Support or Direct messages are empty, both sections use the same layout in the sidebar and full inbox view.',
  $detail$WHAT CHANGED
• Support and Direct messages always show their section headers
• Empty Support inbox and empty DMs use the same icon + title + description style
• Sidebar preview and full Support inbox panel look consistent when there is nothing yet

STAFF INBOX
"Inbox is clear" with the same card style as neighbor Support — not a tiny one-line hint.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_delete-dm-and-post-chats',
  '2026-06-11',
  'Delete conversations from Messages',
  'Remove profile DMs or post chats from your Messages list. Profile DMs require a new message request to chat again.',
  $detail$PROFILE DMS (no listing attached)
Either neighbor can delete the conversation (trash icon in chat header). You must send a new message request to chat again.

POST / LISTING CHATS
Both neighbors can delete, with one rule for the poster:
• Buyer or claimer (not the poster): delete anytime.
• Poster: only after the listing is read-only — gifted (completed) or withdrawn.

If you posted the item and it is still active, gift or withdraw it first, then you can delete the post chat.

Community channels cannot be deleted.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_welcome-message-staff-tools',
  '2026-06-11',
  'Welcome message editors moved to Staff tools',
  'Director and staff welcome notes are edited from Community → Staff tools, not the top of the menu.',
  $detail$WHERE TO EDIT

Community menu → Staff tools (staff only):

• Director — Public welcome message (home + reviews note)
• Staff — Your team message (your personal note on home + reviews)

The messages still appear on the home carousel and reviews page — only the edit location moved.$detail$,
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
  $detail$Applies to deletes, director broadcast tests, and other sensitive actions — styled confirm dialogs in the app.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_post-announcement-for-push',
  '2026-06-11',
  'Directors: post announcements in the bell to trigger push',
  'Staff announcements must be posted from bell → Announcements (not SQL) so the webhook fires and neighbors get a push.',
  $detail$HOW TO NOTIFY EVERYONE ABOUT THIS RELEASE

1. Deploy the latest app
2. Run user-notifications.sql (once, if not done)
3. Run this SQL for Updates tab entries
4. Bell → Announcements → Post announcement about refreshing push under Alerts

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
