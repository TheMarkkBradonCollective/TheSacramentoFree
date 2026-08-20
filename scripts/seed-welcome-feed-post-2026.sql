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
  'What''s up y''all — Feed is live!

Not just for listing stuff anymore. Drop a photo, say hey, talk about a pickup that went smooth, ask the neighborhood something… whatever.

Comment, react, vote — same as everywhere else in the app. I wanted a spot where we''re not ONLY talking about free couches 😂

Say hi when you get a minute. Let me know what you think.',
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
