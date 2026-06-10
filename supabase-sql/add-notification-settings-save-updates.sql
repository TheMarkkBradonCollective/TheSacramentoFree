-- =========================================================
-- JUNE 9, 2026 — Notification settings save + logout cleanup
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-09_notification-settings-save-button',
  '2026-06-09',
  'Save button for notification toggles',
  'Notification preferences now load from your account in the database and save only when you tap Save settings.',
  'Toggles no longer auto-save on every tap — review your choices, then save. Settings sync in real time across tabs. Logging out clears this device push subscription so the next neighbor who signs in does not inherit your alerts.',
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
