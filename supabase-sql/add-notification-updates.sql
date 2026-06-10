-- =========================================================
-- JUNE 9, 2026 — PUSH & NOTIFICATION SHIP LOG
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO NOTHING
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-09_all-notification-toggles',
  '2026-06-09',
  'All notification toggles work',
  'Every switch in push settings now delivers reliably — messages, claims, discover, staff inbox, pickup reminders, listing status, and more.',
  'Staff support and report inboxes, neighbor discover alerts, pickup and expiry reminders (daily server job), and account notices are all wired. Run the notifications SQL in Supabase, add the thirteen push webhooks, then toggle notifications off and on once per phone.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_push-alerts-in-the-background',
  '2026-06-09',
  'Push alerts in the background',
  'Notifications now reach your phone when the app is closed — not only while Sacramento Buy Nothing is open.',
  'Improved service worker delivery, server webhooks on database events, and higher-priority push for urgent messages. iPhone neighbors: use Add to Home Screen (iOS 16.4+) — Safari tabs alone will not get background alerts.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_director-oversight-alerts',
  '2026-06-09',
  'Director oversight alerts',
  'Directors get optional push for all eight oversight categories — joins, departures, moderation, reports, tickets, listings, message requests, and claim requests.',
  'Each category has its own toggle under Director oversight in push settings. Join and departure alerts fire when neighbors create or delete accounts. Server webhooks back up alerts when the director app is not open.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_fewer-duplicate-notifications',
  '2026-06-09',
  'Fewer duplicate notifications',
  'Fixed double alerts when the same event fired from the app and the server at the same time.',
  'A short dedup window stops the same ping from landing twice. Push subscribe and resubscribe were also hardened so devices keep a valid subscription after updates.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_saved-bookmarks-sync-online',
  '2026-06-09',
  'Saved bookmarks sync online',
  'When you save a listing, the bookmark is stored in the community database so alerts still reach you when the app is closed.',
  'Saved items used to live only on your phone. They now sync to your account so the server can notify you about edits, comments, claims, and status changes on posts you bookmarked.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_listing-vote-alerts',
  '2026-06-09',
  'Upvote & downvote alerts',
  'Optional push when neighbors upvote or downvote your listings — each with its own toggle.',
  'Open Account → Push notifications → Your listings. Turn on Upvotes, Downvotes, or both. Works when the app is closed if you have notifications enabled on your device.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_comment-and-saved-listing-alerts',
  '2026-06-09',
  'Comment & saved-listing alerts',
  'Get notified when someone comments on your listing — or when a bookmarked post is edited, commented on, or changes status.',
  'Listing owners can toggle Comments in push settings. Neighbors who save a post can toggle Saved items for edits, new comments, claims, and status changes. Each comment sends its own alert (not bundled into one).',
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
