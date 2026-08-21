-- Neighbor feed (Write) post: closed testing + The Sacramento Free.
-- NOT an incremental migration — safe to re-run (upsert by id).
-- Requires feed_posts table.

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
  'feed_closed_testing_sacramento_free_2026',
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
  'Hey — closed testing is open, and the paper has a name.

This is The Sacramento Free. Same app you already use to give and get. Same neighbors. It just reads like a newspaper now — colour photos, classifieds, the whole thing.

We''re still at sacramentobuynothing.com until I move us to the new domain. Download and testers go there for now.

If you''re on the Play closed test, you''re holding Vol. I No. 1. Tell me what feels right and what doesn''t. I''m listening.

— Mark',
  '[]'::jsonb,
  'active',
  false,
  '2026-08-21 00:00:00-07'::timestamptz,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  text = EXCLUDED.text,
  "userDisplayName" = EXCLUDED."userDisplayName",
  "userPhotoURL" = EXCLUDED."userPhotoURL",
  neighborhood = EXCLUDED.neighborhood,
  "updatedAt" = NOW();
