-- =========================================================
-- JUNE 11, 2026 — NOTIFICATIONS INBOX + ALERTS TOGGLES
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE
-- =========================================================
--
-- Notifications tab = activity you receive (comments, votes, claims)
-- Alerts tab (last) = all push toggles including your-post prefs
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-11_notifications-inbox-alerts-toggles',
  '2026-06-11',
  'Notifications vs Alerts — inbox and toggles split',
  'Notifications tab shows what you receive on your posts. Alerts tab (last) has every push toggle, including comments, votes, and claims.',
  $detail$TAB ORDER (left to right)

1. Announcements — staff news
2. Updates — changelog
3. Notifications — YOUR INBOX: comments, upvotes, downvotes, claims, claim requests, listing status on posts you made
4. Alerts (last) — ALL PUSH TOGGLES: turn device on/off, messages, chat, discover, community, AND your-post alerts (comments, votes, claims, gifts, listing status, pickup reminders, account updates)

KEY IDEA
• Notifications = what happened (read it)
• Alerts = what you want pushed to your phone (toggle it)

REFRESH PUSH
Bell → Alerts (last tab) → Turn off → Enable → Save settings.

DEEP LINKS
• /notifications → Notifications inbox
• /notifications/alerts → Alerts settings$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'New bell hub — four tabs, each with its own job',
  'Tap the bell (top right). News, changelog, your notification inbox, then push alert settings last.',
  $detail$TAB 1 — Announcements (mobile: News)
Staff community news.

TAB 2 — Updates
Director changelog.

TAB 3 — Notifications (mobile: Notify)
Inbox of activity on YOUR posts — not settings.

TAB 4 — Alerts (mobile: Alerts) — LAST
All push toggles and device setup.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_bell-tab-order-notifications-before-alerts',
  '2026-06-11',
  'Bell tab order: Notifications, then Alerts last',
  'Announcements → Updates → Notifications (inbox) → Alerts (all toggles, last tab).',
  $detail$See 2026-06-11_notifications-inbox-alerts-toggles for full explanation.$detail$,
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
