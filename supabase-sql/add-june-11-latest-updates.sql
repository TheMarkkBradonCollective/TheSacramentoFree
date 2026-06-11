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
  'New bell hub — four tabs, each with its own job',
  'Tap the bell (top right, next to theme). News, changelog, push setup, and your-post alerts each have their own tab with matching titles and descriptions.',
  $detail$WHERE TO FIND IT
Any screen → top right → bell icon (next to light/dark theme).

Each tab has its own header title, subtitle, and intro so neighbors always know what they are looking at.

TAB 1 — ANNOUNCEMENTS (mobile tab: News)
Title: Announcements
Subtitle: Staff community news — vote and comment
What it is: Posts from directors and staff. Vote and comment. Staff publish here — posting triggers push for neighbors who enabled Alerts → Announcements.

TAB 2 — UPDATES (mobile tab: Updates)
Title: App updates
Subtitle: Director changelog — what shipped and why
What it is: Technical release notes. Tap any entry to expand the full story.

TAB 3 — ALERTS (mobile tab: Alerts)
Title: Push alerts
Subtitle: Turn push on, then choose messages, chat, discover, and community
What it is: Enable or turn off push on this device, master All alerts switch, messages, community chat, support, discover (new/nearby listings, requests, saved items), app-update and announcement push toggles, nearby radius, follow categories, staff/director moderation toggles.

TAB 4 — NOTIFICATIONS (mobile tab: Notify)
Title: Notifications
Subtitle: Your posts — comments, votes, claims, gifts, and status
What it is: Only activity on listings YOU posted and your profile — comments, upvotes, downvotes, claims, gifts, listing status, pickup reminders, account updates. Not DMs or neighborhood discover.

WHY TWO PUSH TABS?
Alerts = general push. Notifications = neighbors interacting with your posts. Tune separately. Turn push on once under Alerts — it covers every tab.

DEEP LINKS
• /help/announcements → Announcements
• /updates → Updates
• /notifications → Alerts
• /notifications/listings → Notifications

AFTER THIS DEPLOY
Bell → Alerts → Turn off alerts → Enable alerts once per device. Bell → Notifications → review toggles → Save settings.

iPhone: Home Screen app (Add to Home Screen), not a Safari tab.$detail$,
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
