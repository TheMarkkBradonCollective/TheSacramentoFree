-- =========================================================
-- JUNE 11, 2026 — LATEST UPDATES + PUSH REFRESH ANNOUNCEMENT
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
-- =========================================================
--
-- Publishes:
--   • 5 App update cards (bell hub, push overhaul, support in chat, message delete, in-app dialogs)
--   • 1 staff announcement asking neighbors to refresh push alerts
--
-- After running: deploy the latest app build if you have not already.
-- =========================================================

-- ─────────────────────────────────────────────────────────
-- APP UPDATES (Community hub → App updates / bell → Updates)
-- ─────────────────────────────────────────────────────────

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-11_bell-hub-alerts-and-notifications',
  '2026-06-11',
  'Bell icon: Announcements, Updates, Alerts, and Notifications',
  'Tap the bell next to the theme button for everything in one place — staff news, changelog, push setup, and toggles for your own posts.',
  $detail$WHAT NEIGHBORS SEE

Top right of the app (next to light/dark mode) there is a bell icon. Tap it for a full-screen panel with four tabs:

1. Announcements — staff community news (vote and comment)
2. Updates — director changelog (what shipped)
3. Alerts — turn push on/off on this device, master switch, messages, support, community chat, discover, nearby radius, follow categories
4. Notifications — only activity on YOUR posts and profile: comments, upvotes, downvotes, claims, gifts, listing status, pickup reminders, account updates

WHY WE SPLIT ALERTS VS NOTIFICATIONS
General push (messages, new listings near you, community chat) lives under Alerts. Interactions on listings you posted live under Notifications so you can tune them separately.

ACTION FOR EVERYONE
After this deploy, open bell → Alerts (third tab) → Turn off alerts → Enable alerts again once. Then review Notifications (fourth tab) and tap Save settings if you changed anything.

iPhone: use Sacramento Buy Nothing from your Home Screen (Add to Home Screen), not a Safari tab.

CODE
src/contexts/NotificationsHubContext.tsx, src/components/NotificationSettings.tsx (scope: alerts | listings), src/lib/pushDeepLink.ts (/notifications → Alerts, /notifications/listings → Notifications tab)$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'Push alerts rebuilt — please refresh once on each device',
  'We fixed webhooks, duplicate alerts, missing preference columns, and several delivery bugs. Real messages, claims, chat, and votes should reach your phone again after you turn alerts off and back on.',
  $detail$WHAT WAS BROKEN
Many neighbors only received the “test” push, not real activity. Causes included: duplicate dispatch tags blocking sends, stuck preference rows, missing webhook triggers, and subscription rows out of sync after key changes.

WHAT WE FIXED
• Item claims, support tickets, and saved-listing status — column + dedup tag mismatches
• Supabase database webhooks — install script for all 15 push triggers (supabase-sql/install-push-webhooks.sql)
• Community chat — client dispatch after send so alerts fire reliably
• Director join/leave — dedicated handlers and toggles
• Logout clears this device subscription so the next neighbor on a shared phone does not inherit alerts
• Notification settings save explicitly (Save settings button) and sync across tabs

SQL / OPS (director)
If pushes still fail after neighbors refresh:
1. Run supabase-sql/notifications-complete.sql (tables + prefs)
2. Run supabase-sql/install-push-webhooks.sql (all triggers)
3. Confirm Vercel env: VAPID keys, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
4. Webhook URL: https://sacramentobuynothing.com/api/webhooks/supabase-push

ACTION FOR NEIGHBORS
Bell → Alerts → Turn off alerts → Enable alerts → Send test alert. Change toggles → Save settings. Repeat on each phone/tablet you use.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_support-inbox-in-messages',
  '2026-06-11',
  'Support inbox moved into Messages',
  'Staff support tickets now live in the Chat tab — same sidebar style as your conversations. Staff see a support inbox there instead of buried in Community hub.',
  $detail$WHAT NEIGHBORS SEE

Chat tab → Support — open a ticket, reply, and use the back button to return to your inbox. Push alerts for staff replies still work (Alerts tab → Support tickets).

WHAT STAFF SEE
Chat → Support inbox — list of open neighbor tickets with last-message preview. Removed from Community hub staff moderation panel so support is always next to messages.

PUSH DEEP LINK
/staff/tickets and /support open Messages → Support inbox.

CODE
src/components/ChatSupportSection.tsx, src/components/ChatSystem.tsx, src/components/SupportTicketRow.tsx, src/lib/supportChat.ts, src/components/StaffModerationPanel.tsx$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-message-deletion',
  '2026-06-11',
  'Delete your chat messages',
  'You can delete messages you sent in any chat. Directors and city managers can also remove any message in the community-wide channel.',
  $detail$WHAT NEIGHBORS SEE

Long-press or use the delete control on your own messages in direct chats, community chat, staff chat, and support threads.

MODERATION
Director and city manager roles can delete any message in community-global (all-neighbors channel) to keep the lounge tidy.

CODE
src/lib/roles.ts (canDeleteChatMessage), src/supabase.ts (deleteSupabaseMessage), src/components/ChatSystem.tsx$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_in-app-dialogs',
  '2026-06-11',
  'No more browser pop-up boxes',
  'Confirmations and alerts now use the app’s own dialogs instead of the phone’s generic “OK / Cancel” pop-ups.',
  $detail$WHAT NEIGHBORS SEE

Deleting items, broadcasting test pushes, and other sensitive actions show a styled in-app dialog that matches Sacramento Buy Nothing — not the browser’s native confirm/alert boxes.

CODE
src/contexts/ConfirmContext.tsx, src/components/ConfirmDialog.tsx, src/components/DirectorBroadcastTestModal.tsx$detail$,
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


-- ─────────────────────────────────────────────────────────
-- STAFF ANNOUNCEMENT (bell → Announcements + push to neighbors)
-- ─────────────────────────────────────────────────────────

INSERT INTO public.help_announcements (
  id,
  date,
  title,
  body,
  detail,
  "authorName",
  "authorTitle",
  "postedByUserId"
) VALUES (
  '2026-06-11_refresh-push-notifications',
  '2026-06-11',
  'Action needed: refresh your push alerts',
  'We shipped major fixes for messages, claims, chat, votes, and more. Please turn alerts off and back on once on each device so your phone picks up the new setup.',
  $detail$Hi neighbors —

We have been working hard to get push alerts working reliably again. The backend, webhooks, and notification settings were all upgraded. To finish the job on your phone, we need everyone to refresh alerts once.

📱 HOW TO REFRESH (about 30 seconds)

1. Open Sacramento Buy Nothing
2. Tap the bell icon in the top right (next to the theme / light-dark button)
3. Open the Alerts tab (third tab)
4. Tap Turn off alerts
5. Tap Enable alerts
6. Optional: tap Send test alert to confirm it works
7. Open the Notifications tab (fourth tab) and turn on anything you want about your own posts — comments, votes, claims, etc.
8. If you changed any toggles, tap Save settings

🍎 iPHONE NEIGHBORS

Add Sacramento Buy Nothing to your Home Screen (Share → Add to Home Screen) and open the app from that icon — not a Safari tab. Background alerts need the installed app.

✅ AFTER REFRESHING YOU SHOULD GET

• Direct messages and message requests
• Community chat
• Claims and activity on your listings
• Comments and votes on your posts
• Support ticket replies
• Nearby listings and categories you follow

If something still does not arrive after refreshing, open Chat → Support and tell us what you expected — we will keep tuning.

Thank you for your patience while we get this right for the whole community.

— Markeith, Buy Nothing Director$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "authorName" = EXCLUDED."authorName",
  "authorTitle" = EXCLUDED."authorTitle",
  "updatedAt" = NOW();
