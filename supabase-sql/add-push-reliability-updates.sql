-- =========================================================
-- JUNE 9, 2026 — PUSH RELIABILITY FIX (doubles, wrong user, silent misses)
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-09_notifications-right-account',
  '2026-06-09',
  'Notifications go to the right account',
  'Fixed push sometimes landing on the wrong neighbor on shared phones — your alerts stay tied to whoever is signed in.',
  'When you enable notifications, the server now claims your browser subscription for your account only. After this update, open the app signed in as you and toggle notifications off, then on once per device. iPhone: Add to Home Screen for background alerts.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_no-more-double-pings',
  '2026-06-09',
  'No more double pings',
  'Stopped the same alert from firing twice when both the app and the server tried to send it.',
  'New listings already used one server path — we turned off duplicate client-side dispatch and tightened dedup so one database event equals one notification. Messages, comments, votes, and support tickets each get their own dedup tag so back-to-back alerts are not swallowed.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_every-alert-like-new-listings',
  '2026-06-09',
  'Every alert works like new listings',
  'Messages, comments, votes, pickup reminders, account notices, and community announcements now deliver the same reliable way as new listing alerts.',
  'All neighbor and staff pushes run through Supabase webhooks on database events — no browser required. Add the push-announcements webhook on app_updates INSERT (fourteenth webhook). Confirm all fourteen webhooks in supabase-push-webhook.sql. Run notifications-complete.sql if push tables are missing.',
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
