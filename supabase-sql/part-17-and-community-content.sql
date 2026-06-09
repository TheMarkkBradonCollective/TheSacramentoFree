-- =========================================================
-- SACRAMENTO BUY NOTHING — RUN IN SUPABASE SQL EDITOR
-- Part 17: Community events
-- Part 18: Director message (editable by director in-app)
-- Part 19: Neighbor app reviews (0–5 stars, half-star steps)
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- =========================================================

-- ---------------------------------------------------------
-- 17. Community events (free gatherings only)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  "eventStartAt" TIMESTAMPTZ NOT NULL,
  "eventEndAt" TIMESTAMPTZ,
  "userId" TEXT NOT NULL,
  "userDisplayName" TEXT NOT NULL,
  "userPhotoURL" TEXT,
  "isFree" BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.community_events DROP CONSTRAINT IF EXISTS community_events_status_check;
ALTER TABLE public.community_events ADD CONSTRAINT community_events_status_check
  CHECK (status IN ('active', 'cancelled'));

ALTER TABLE public.community_events DROP CONSTRAINT IF EXISTS community_events_free_only;
ALTER TABLE public.community_events ADD CONSTRAINT community_events_free_only
  CHECK ("isFree" = true);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read community events" ON public.community_events;
CREATE POLICY "Allow read community events" ON public.community_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write community events" ON public.community_events;
CREATE POLICY "Allow write community events" ON public.community_events FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS community_events_start_idx ON public.community_events ("eventStartAt" ASC);
CREATE INDEX IF NOT EXISTS community_events_user_idx ON public.community_events ("userId");

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rsvpStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY ("eventId", "userId")
);

ALTER TABLE public.event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_status_check;
ALTER TABLE public.event_rsvps ADD CONSTRAINT event_rsvps_status_check
  CHECK ("rsvpStatus" IN ('going', 'maybe', 'not_going'));

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read event rsvps" ON public.event_rsvps;
CREATE POLICY "Allow read event rsvps" ON public.event_rsvps FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write event rsvps" ON public.event_rsvps;
CREATE POLICY "Allow write event rsvps" ON public.event_rsvps FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON public.event_rsvps ("eventId");

CREATE TABLE IF NOT EXISTS public.event_comments (
  id TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read event comments" ON public.event_comments;
CREATE POLICY "Allow read event comments" ON public.event_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write event comments" ON public.event_comments;
CREATE POLICY "Allow write event comments" ON public.event_comments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS event_comments_event_idx ON public.event_comments ("eventId");

-- ---------------------------------------------------------
-- 18. Director message (single row — director edits in app)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.director_message (
  id TEXT PRIMARY KEY DEFAULT 'main',
  "directorName" TEXT NOT NULL,
  "directorTitle" TEXT NOT NULL,
  headline TEXT NOT NULL,
  goal TEXT NOT NULL,
  promises JSONB NOT NULL DEFAULT '[]'::jsonb,
  closing TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedByUserId" TEXT
);

ALTER TABLE public.director_message ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read director message" ON public.director_message;
CREATE POLICY "Allow read director message" ON public.director_message FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write director message" ON public.director_message;
CREATE POLICY "Allow write director message" ON public.director_message FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.director_message (
  id,
  "directorName",
  "directorTitle",
  headline,
  goal,
  promises,
  closing
)
VALUES (
  'main',
  'Markeith White',
  'Buy Nothing Director',
  'A note from your director',
  'Sacramento Buy Nothing exists so neighbors can give freely, ask kindly, and keep good things out of the landfill — with no money involved. That is the goal, plain and simple.',
  '[
    "This app is 100% free — always.",
    "No ads. Ever.",
    "I keep you in mind with every feature I build.",
    "I do not want your information for anything beyond making the community work, and I will never sell it."
  ]'::jsonb,
  'Thank you for being part of this community.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------
-- 19. App reviews (one per neighbor, 0–5 in half-star steps)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_reviews (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL,
  text TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_reviews DROP CONSTRAINT IF EXISTS app_reviews_rating_range;
ALTER TABLE public.app_reviews ADD CONSTRAINT app_reviews_rating_range
  CHECK (
    rating >= 0
    AND rating <= 5
    AND (rating * 2)::int = (rating * 2)
  );

ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read app reviews" ON public.app_reviews;
CREATE POLICY "Allow read app reviews" ON public.app_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write app reviews" ON public.app_reviews;
CREATE POLICY "Allow write app reviews" ON public.app_reviews FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS app_reviews_created_idx ON public.app_reviews ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS app_reviews_rating_idx ON public.app_reviews (rating);

-- ---------------------------------------------------------
-- Realtime (skip tables already in publication)
-- ---------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'community_events', 'event_rsvps', 'event_comments',
    'director_message', 'app_reviews'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
