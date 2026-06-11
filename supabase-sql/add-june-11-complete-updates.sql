-- =========================================================
-- JUNE 11, 2026 — COMPLETE APP UPDATES (run once)
-- Supabase SQL Editor → paste → Run
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
-- =========================================================
--
-- BEFORE OR AFTER (director ops):
--   1. user-notifications.sql  (required for Notifications inbox)
--   2. notifications-complete.sql + install-push-webhooks.sql (if push still broken)
--
-- ANNOUNCEMENT PUSH: bell → Announcements in the app (not SQL).
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'New bell hub — four tabs, each with its own job',
  'Tap the bell (top right, next to theme). News, changelog, your notification inbox, then push alert settings last.',
  $detail$TAB ORDER (left to right)

1. NOTIFY — your inbox (alerts you receive)
2. NEWS — staff announcements
3. UPDATES — director changelog (searchable)
4. ALERTS (last) — all push toggles

REFRESH PUSH
Bell → Alerts (last tab) → Turn off → Enable → Save settings.
iPhone: Home Screen app, not Safari.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_notifications-inbox-alerts-toggles',
  '2026-06-11',
  'Notifications inbox + Alerts toggles',
  'Notifications tab is your inbox. Alerts tab (last) has every push toggle.',
  $detail$Requires user_notifications table (run user-notifications.sql once).
Every eligible push also logs to your Notifications inbox.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_searchable-updates',
  '2026-06-11',
  'Search the changelog',
  'Bell → Updates now has a search field — filter by keyword, author, or date.',
  $detail$Use Search updates… to find past releases quickly. Works on the public updates page too.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
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
  '2026-06-11_support-inbox-in-messages',
  '2026-06-11',
  'Support inbox in Chat',
  'Support tickets live in Chat with the same sidebar style as conversations.',
  $detail$Neighbors: Chat → Support. Staff: Support inbox in Chat.
Delete closed tickets from the thread when done.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-sidebar-preview',
  '2026-06-11',
  'Chat sidebar — last 3 + View all',
  'Support and DMs show three recent threads with View all to expand.',
  $detail$Keeps the chat panel tidy on phones while everything stays one tap away.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-empty-states',
  '2026-06-11',
  'Chat empty states match across sections',
  'Support, DMs, and reviews rows use the same empty layout when there is nothing yet.',
  $detail$Consistent icon, title, and description — sidebar and full inbox match.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_delete-dm-and-post-chats',
  '2026-06-11',
  'Delete conversations from Chat',
  'Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn.',
  $detail$Profile DMs: either neighbor; new message request required to chat again.
Post chats: buyer anytime; poster after listing is read-only.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_hub-removed-staff-on-account',
  '2026-06-11',
  'Hub tab removed — staff tools on Account',
  'The Hub tab is gone. Director overview and staff tools now live under Account.',
  $detail$STAFF & DIRECTOR
Account tab → Staff tools (directory, audit log, welcome messages, etc.)
Director → site overview on Account too

NEIGHBORS
Five tabs on mobile: Stuff | Events | Map (center) | Chat | Account
News and announcements: bell (top right)
Reviews and reports: Chat$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_welcome-message-account',
  '2026-06-11',
  'Welcome messages edited from Account',
  'Director and staff public welcome notes are edited from Account → Staff tools.',
  $detail$Director — Public welcome message (home + reviews)
Staff — Your team message (home + reviews)
Still shown on home carousel and reviews page.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_center-map-nav',
  '2026-06-11',
  'Map centered in mobile tab bar',
  'On phones, Map is the round center button in the bottom navigation.',
  $detail$Bottom nav: Stuff | Events | Map (circle) | Chat | Account
Tap the center circle to open the neighborhood map.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'Push alerts rebuilt — refresh once per device',
  'Turn alerts off and back on under bell → Alerts after updating.',
  $detail$Bell → Alerts (last tab) → Turn off → Enable → Save settings.
iPhone: open from Home Screen, not Safari.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_chat-message-deletion',
  '2026-06-11',
  'Delete your chat messages',
  'Delete messages you sent. Directors and city managers can remove community channel messages.',
  $detail$Works in DMs, group chats, staff chat, and support threads.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_in-app-dialogs',
  '2026-06-11',
  'In-app confirm dialogs',
  'No more generic browser OK/Cancel boxes for sensitive actions.',
  $detail$Styled confirmations match the app for deletes and director tools.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-11_post-announcement-for-push',
  '2026-06-11',
  'Directors: post announcements in the bell for push',
  'Post from bell → Announcements so neighbors with that alert enabled get a push.',
  $detail$AFTER THIS DEPLOY
1. Run user-notifications.sql if not done
2. Run this SQL for Updates entries
3. Bell → Announcements → post refresh reminder
4. Tell neighbors: Bell → Alerts → Turn off → Enable$detail$,
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
