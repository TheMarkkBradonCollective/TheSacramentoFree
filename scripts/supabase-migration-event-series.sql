-- Repeat community events (seriesId) + Lucid Winery 2026 schedule
-- Safe to re-run. Paste into Supabase SQL Editor.

-- ---------------------------------------------------------
-- 1. seriesId column for repeat events at the same location
-- ---------------------------------------------------------
ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS "seriesId" TEXT;

CREATE INDEX IF NOT EXISTS community_events_series_idx
  ON public.community_events ("seriesId")
  WHERE "seriesId" IS NOT NULL;

-- ---------------------------------------------------------
-- 2. Lucid Winery Buy Nothing series (2026 flyer dates)
-- ---------------------------------------------------------
INSERT INTO public.community_events (
  id,
  title,
  description,
  location,
  neighborhood,
  "eventStartAt",
  "eventEndAt",
  "userId",
  "userDisplayName",
  "userPhotoURL",
  "hostedBy",
  "locationLat",
  "locationLng",
  "isFree",
  status,
  "seriesId",
  "createdAt",
  "updatedAt"
)
VALUES
(
  'event_2026-03-01_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-03-01 13:00:00-07',
  '2026-03-01 17:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'past',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-04-12_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-04-12 16:00:00-07',
  '2026-04-12 20:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'past',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-05-24_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-05-24 16:00:00-07',
  '2026-05-24 20:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'past',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-06-07_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-06-07 13:00:00-07',
  '2026-06-07 17:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'past',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-07-05_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-07-05 13:00:00-07',
  '2026-07-05 17:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'past',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-08-02_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-08-02 13:00:00-07',
  '2026-08-02 17:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'upcoming',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-09-06_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-09-06 13:00:00-07',
  '2026-09-06 17:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'upcoming',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-10-04_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-10-04 13:00:00-07',
  '2026-10-04 17:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'upcoming',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-11-08_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-11-08 16:00:00-07',
  '2026-11-08 20:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'upcoming',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
),
(
  'event_2026-12-20_lucid-winery-bn',
  'Buy Nothing — Lucid Winery',
  'Buy Nothing community swap at Lucid Winery! Bring stuff, find stuff — don''t buy stuff. Shared tables provided; place items wherever there''s room. Setup starts at the start of the event. Before you leave, take back anything of yours that''s left.

100% free — clothes, toys, shoes, household goods, books, beauty products, and more. If you can, support Lucid Winery — they''re hosting and appreciate neighbors who visit.',
  'Lucid Winery, 1015 R St',
  'Downtown',
  '2026-12-20 16:00:00-07',
  '2026-12-20 20:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Lucid Winery',
  38.5684,
  -121.4939,
  true,
  'upcoming',
  'series_lucid-winery-2026',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  location = EXCLUDED.location,
  neighborhood = EXCLUDED.neighborhood,
  "eventStartAt" = EXCLUDED."eventStartAt",
  "eventEndAt" = EXCLUDED."eventEndAt",
  "userDisplayName" = EXCLUDED."userDisplayName",
  "userPhotoURL" = EXCLUDED."userPhotoURL",
  "hostedBy" = EXCLUDED."hostedBy",
  "locationLat" = EXCLUDED."locationLat",
  "locationLng" = EXCLUDED."locationLng",
  "isFree" = EXCLUDED."isFree",
  status = EXCLUDED.status,
  "seriesId" = EXCLUDED."seriesId",
  "updatedAt" = NOW();

-- Remove wrong-date Lucid row if present
DELETE FROM public.community_events
WHERE id = 'event_2026-08-01_lucid-winery-bn';

-- ---------------------------------------------------------
-- 3. Fremont Park — Saturday Aug 1, 2026, 10 AM–2 PM (single event)
-- ---------------------------------------------------------
INSERT INTO public.community_events (
  id,
  title,
  description,
  location,
  neighborhood,
  "eventStartAt",
  "eventEndAt",
  "userId",
  "userDisplayName",
  "userPhotoURL",
  "hostedBy",
  "locationLat",
  "locationLng",
  "isFree",
  status,
  "seriesId",
  "createdAt",
  "updatedAt"
)
VALUES (
  'event_2026-08-01_fremont-park-bn',
  'Buy Nothing — Fremont Park (Midtown)',
  'Free Buy Nothing gathering this Saturday, 10 AM–2 PM! Everything is 100% free — clothes, toys, shoes, household goods, books, beauty products, and much more. Come pick up what you can use and pass along stuff you don''t need anymore. Collect any leftover items when you leave.

Great for neighbors saving money or decluttering. Share with friends, family, Nextdoor, Instagram, and local Buy Nothing Facebook groups — spread the word!',
  'Fremont Park, 1515 Q St — Midtown',
  'Midtown',
  '2026-08-01 10:00:00-07',
  '2026-08-01 14:00:00-07',
  '204b071f-100c-401d-b76d-40c594e1f132',
  COALESCE((SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'), 'Markeith White'),
  (SELECT "photoURL" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  NULL,
  38.571017,
  -121.489122,
  true,
  'upcoming',
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  location = EXCLUDED.location,
  neighborhood = EXCLUDED.neighborhood,
  "eventStartAt" = EXCLUDED."eventStartAt",
  "eventEndAt" = EXCLUDED."eventEndAt",
  "userDisplayName" = EXCLUDED."userDisplayName",
  "userPhotoURL" = EXCLUDED."userPhotoURL",
  "hostedBy" = EXCLUDED."hostedBy",
  "locationLat" = EXCLUDED."locationLat",
  "locationLng" = EXCLUDED."locationLng",
  "isFree" = EXCLUDED."isFree",
  status = EXCLUDED.status,
  "seriesId" = EXCLUDED."seriesId",
  "updatedAt" = NOW();
