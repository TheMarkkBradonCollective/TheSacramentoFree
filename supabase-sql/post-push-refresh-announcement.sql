-- =========================================================
-- JUNE 11, 2026 — PUSH REFRESH ANNOUNCEMENT
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO NOTHING
-- =========================================================

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
  'Refresh your push notifications',
  'We upgraded push alerts across the app. Please turn notifications off and back on once so your phone picks up the new setup.',
  'Open the bell icon in the top right (next to the theme button) → Notifications → Turn off notifications, then enable them again.

iPhone neighbors: use Sacramento Buy Nothing from your Home Screen (Add to Home Screen), not a Safari tab — background alerts need the installed app.

After refreshing, you should receive messages, claims, community chat, saved listings, and other alerts reliably. Thank you for your patience!',
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
