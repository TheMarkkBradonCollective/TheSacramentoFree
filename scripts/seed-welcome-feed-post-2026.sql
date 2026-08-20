-- One-off neighbor feed welcome post from director/founder Markeith White.
-- NOT part of incremental migrations — safe to re-run (upsert by id).
-- Requires feed_posts table — run scripts/supabase-migration-aug-20-2026-neighbor-feed.sql first.

INSERT INTO public.feed_posts (
  id,
  "userId",
  "userDisplayName",
  "userPhotoURL",
  neighborhood,
  text,
  "imageUrls",
  status,
  "postedAsNeighbor",
  "createdAt",
  "updatedAt"
)
VALUES (
  'feed_welcome_director_2026',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE(
    (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
    'Markeith White'
  ),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  COALESCE(
    (SELECT neighborhood FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
    'Midtown'
  ),
  'Hey neighbors — welcome to the Feed!

This is your space to share thoughts, photos, and little moments with the Sacramento Buy Nothing community — not just Stuff listings. Celebrate a great pickup, ask a question, or say hi to the neighborhood.

You can comment, react, and vote here just like anywhere else in the app. I built this so we stay connected beyond giving and getting — and I''d love to hear what you think.

— Markeith',
  '[]'::jsonb,
  'active',
  false,
  '2026-08-20 16:00:00-07'::timestamptz,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  "userDisplayName" = EXCLUDED."userDisplayName",
  "userPhotoURL" = EXCLUDED."userPhotoURL",
  neighborhood = EXCLUDED.neighborhood,
  "updatedAt" = NOW();
