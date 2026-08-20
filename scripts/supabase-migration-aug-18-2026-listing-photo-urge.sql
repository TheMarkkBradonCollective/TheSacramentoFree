-- =========================================================
-- AUG 18 2026 — urge neighbors to add listing photos + photo fix note
-- Run in Supabase SQL Editor on production. Safe to re-run.
--
-- Shows in Notifications → News (director note) and Updates (product note).
-- Canonical copy: shared/changelogSeed.ts
-- Cron /api/cron/publish-changelog also upserts seeds nightly.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES (
  '2026-08-18_listing-feed-photos',
  '2026-08-18',
  'Listing photos load again on the feed',
  'Older posts that stored camera data inside the listing could show a gray box instead of a photo. That is fixed for most listings. When you post or edit, add a picture so neighbors can see what you are sharing.',
  $detail$WHAT NEIGHBORS SEE
Some Community Stuff cards showed a gray tag instead of a photo — including older giveaways and requests, not just today’s posts.

We fixed how the feed reads photo URLs from legacy listings. Many thumbnails are back without you doing anything.

If a listing of yours still has no photo:
• Open it → Edit → Add photo → Save.

Going forward, please add at least one photo when you post. It helps neighbors decide faster and keeps the feed healthy for everyone.

— Mark

WHERE TO LOOK IN CODE
- scripts/supabase-migration-aug-18-2026-listing-feed-image-urls.sql — item_feed_image_url_map() RPC + imageUrl backfill.
- src/supabase.ts — feed calls the RPC with a short cache.
- src/lib/listingContent.ts — [PHOTOS:] extraction from long descriptions.
- src/components/ListingImage.tsx + ItemCard.tsx — fallback chain and gray placeholder on failure.

HISTORY
2026-08-18 — Feed photo recovery (PR #220) + director note in News.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-18T14:30:00.000Z',
  '2026-08-18T14:30:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES (
  '2026-08-18_add-listing-photos',
  '2026-08-18',
  'Please add a photo when you post',
  'A quick picture helps neighbors know what you are offering or looking for. We also fixed older listings that lost thumbnails — if yours still shows gray, edit the post and upload a photo.',
  $detail$WHAT NEIGHBORS SEE
Neighbors,

When you give something away or post a request, please add at least one photo if you can.

Why it matters:
• Neighbors can see size, color, condition, and whether it is worth the trip before they message you.
• Posts with photos get claimed faster — people scroll past gray boxes.
• A clear photo cuts down on “Is this still available?” and “What does it look like?” back-and-forth.

Some older listings stored camera data inside the post in a way that slowed the whole feed or hid the thumbnail. We recovered photos on many of those posts today. If you still see a gray tag on one of yours, open the listing → Edit → Add photo and save. That is the surest fix.

When you post something new:
1. Tap Give, Trade, or Looking.
2. Add a title and short description.
3. Tap Add photo (you can add up to six).
4. Post.

No shame if you skipped photos before — we are all learning this app together. Thank you for giving freely in Sacramento.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_listing-feed-photos (feed photo RPC + legacy backfill).

HISTORY
2026-08-18 — Director note after listing photo recovery on Supabase.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-18T14:30:00.000Z',
  '2026-08-18T14:30:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "authorName" = EXCLUDED."authorName",
  "authorTitle" = EXCLUDED."authorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "updatedAt" = EXCLUDED."updatedAt";
