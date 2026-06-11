-- =========================================================
-- JUNE 11, 2026 — BELL TAB ORDER (Notifications then Alerts)
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE
-- =========================================================
--
-- Tab order: Announcements | Updates | Notifications | Alerts (last)
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-11_bell-tab-order-notifications-before-alerts',
  '2026-06-11',
  'Bell tab order: Notifications, then Alerts last',
  'The bell now goes Announcements → Updates → Notifications → Alerts. Alerts (push setup) is the last tab on the right.',
  $detail$TAB ORDER (left to right)

1. Announcements (mobile: News) — staff community news
2. Updates — director changelog
3. Notifications (mobile: Notify) — your posts: comments, votes, claims, gifts, status
4. Alerts (mobile: Alerts) — LAST TAB — turn push on/off, messages, chat, discover, community

REFRESH PUSH (after deploy)
Bell → Alerts (last tab) → Turn off alerts → Enable alerts.
Bell → Notifications (third tab) → review toggles → Save settings.

iPhone: open from Home Screen, not a Safari tab.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'New bell hub — four tabs, each with its own job',
  'Tap the bell (top right, next to theme). News, changelog, your-post notifications, then push alerts last.',
  $detail$WHERE TO FIND IT
Any screen → top right → bell icon (next to light/dark theme).

TAB 1 — ANNOUNCEMENTS (mobile: News)
Staff community news — vote and comment. Staff post here; push if Alerts → Announcements is on.

TAB 2 — UPDATES (mobile: Updates)
Director changelog — expand any entry for the full story.

TAB 3 — NOTIFICATIONS (mobile: Notify)
Your posts only — comments, votes, claims, gifts, listing status, pickup reminders, account updates.

TAB 4 — ALERTS (mobile: Alerts) — LAST TAB
Push setup: enable device, master switch, messages, chat, support, discover, community toggles, radius, categories, staff/director prefs.

DEEP LINKS
• /help/announcements → Announcements
• /updates → Updates
• /notifications/listings → Notifications
• /notifications → Alerts$detail$,
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
