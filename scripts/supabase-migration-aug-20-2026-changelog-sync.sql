-- =========================================================
-- AUG 20 2026 — Changelog sync + missing Updates rows
-- Run in Supabase SQL Editor on the EXISTING production database.
-- Safe to re-run: ON CONFLICT updates copy in place.
--
-- Adds product-only Updates that were missing from the Updates tab
-- (release posts live in News; see shared/changelogFilters.ts).
--
-- Canonical copy lives in shared/changelogSeed.ts. Cron
-- /api/cron/publish-changelog upserts filtered seeds every 4 hours
-- (0 */4 * * *). Use this migration for immediate sync after deploy.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES
(
  '2026-08-20_notification-reliability',
  '2026-08-20',
  'Notification reliability — feed comments, signup alerts, new posts',
  'Feed comments and replies notify reliably; false signup alerts fixed; new feed posts broadcast to neighbors.',
  $detail$WHAT NEIGHBORS SEE
• Comments on your feed post push + show in the bell inbox
• Replies to your comment notify you (not just the post author)
• New community feed posts alert neighbors (same area + announcements prefs)
• Directors no longer get false "new neighbor joined" when someone signs into an existing account

Turn categories off anytime in bell → Notification settings if it is too chatty.

— Mark

WHERE TO LOOK IN CODE
- api/push/_server/feedNotify.ts — comment, reply, reaction, vote, new-post alerts
- api/push/_server/directorNotify.ts — fresh-signup-only join alerts
- src/lib/pushFeedIntegration.ts — client-side feed push dispatch

HISTORY
2026-08-20 — Notification audit (PR #298).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-20T19:12:00.000Z',
  '2026-08-20T19:12:00.000Z'
),
(
  '2026-08-20_feed-fullscreen-navigation',
  '2026-08-20',
  'Feed full-screen posts dismiss when you change tabs',
  'Tap Feed, Map, Chats, or any bottom tab to close a full-screen feed post — no more getting stuck behind the overlay.',
  $detail$WHAT NEIGHBORS SEE
• Open a feed post full-screen, then tap any tab — the overlay closes and that tab opens
• Escape / Android back also dismiss stacked overlays in order
• Report-post modal stacks above mobile chrome correctly

— Mark

WHERE TO LOOK IN CODE
- src/App.tsx — closeTransientOverlays clears feed post detail
- src/components/feed/FeedPostDetailView.tsx — full-screen sheet + Escape dismiss

HISTORY
2026-08-20 — Feed overlay navigation fix (PR #297).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-20T19:10:00.000Z',
  '2026-08-20T19:10:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "createdAt" = EXCLUDED."createdAt",
  "updatedAt" = EXCLUDED."updatedAt";
