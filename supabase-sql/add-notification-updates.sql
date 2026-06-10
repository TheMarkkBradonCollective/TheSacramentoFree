-- =========================================================
-- ADD NOTIFICATION CHANGELOG ENTRIES (run once in Supabase)
-- For sites that already ran all-community-updates.sql earlier.
-- Safe to re-run: ON CONFLICT DO NOTHING
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-09_all-notification-toggles',
  '2026-06-09',
  'All notification toggles work',
  'Every switch in push settings now delivers reliably — messages, claims, discover, director oversight, staff inbox, pickup reminders, and more.',
  'Alerts work when the app is closed via server webhooks and a daily reminder job for expiring listings and pending pickups. Run the notifications SQL in Supabase, add the push webhooks, then toggle notifications off and on once per phone. iPhone: add the app to your Home Screen for background alerts.',
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
ON CONFLICT (id) DO NOTHING;
