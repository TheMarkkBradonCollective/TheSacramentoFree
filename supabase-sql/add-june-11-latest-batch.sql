-- =========================================================
-- JUNE 11, 2026 — LATEST BATCH (run after earlier June 11 SQL)
-- Supabase SQL Editor → paste → Run
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
-- =========================================================
--
-- Covers PRs #73–#75 (merged):
--   • Community reviews — your review vs neighbors list
--   • Block self-votes on your own content
--   • Chat sidebar order + Open new support chat / Start conversation rows
--
-- ANNOUNCEMENT PUSH: bell → News (not SQL).
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-11_chat-reviews-reports',
  '2026-06-11',
  'Reviews and reports moved into Chat',
  'Community reviews, Send a report, and (staff) User reports live in Chat — last in the sidebar.',
  $detail$CHAT SIDEBAR ORDER (top to bottom)
• Direct messages
• Group chats (All neighbors, Staff lounge)
• Support
• Reviews & reports

REVIEWS & REPORTS
• Community reviews — read and post yours
• Send a report — one-way to staff
• User reports — staff only

Group chats replaced the old "Community" label. Public channel is now All neighbors.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_community-reviews-layout',
  '2026-06-11',
  'Community reviews — yours vs neighbors',
  'Chat → Community reviews: post or edit your review up top, then scroll neighbors below.',
  $detail$YOUR REVIEW (top)
Post once, edit anytime, or remove.

FROM NEIGHBORS (below)
Everyone else's reviews — yours is not duplicated in the list.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_block-self-votes',
  '2026-06-11',
  'You cannot vote on your own content',
  'Upvotes and downvotes are disabled on listings, reviews, updates, news, and leader messages you posted.',
  $detail$Applies everywhere neighbors can vote:
• Your listings
• Your review
• Your announcements or changelog entries
• Director and staff messages you authored$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-sidebar-actions',
  '2026-06-11',
  'Chat sidebar — new support & start DM rows',
  'Open new support chat and Start conversation rows match Send a report. Sidebar order: DMs → Groups → Support → Reviews.',
  $detail$QUICK ACTIONS (same row style as Send a report)
• Start conversation — opens Stuff to message from a listing
• Open new support chat — private thread with staff

SIDEBAR ORDER
1. Direct messages
2. Group chats
3. Support
4. Reviews & reports$detail$,
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
