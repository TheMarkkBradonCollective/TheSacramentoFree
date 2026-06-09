-- =========================================================
-- SACRAMENTO BUY NOTHING — ALL COMMUNITY FEATURE UPDATES
-- Paste into Supabase Dashboard → SQL → New query → Run
-- Safe to re-run (IF NOT EXISTS, ON CONFLICT DO NOTHING).
-- =========================================================

-- ---------------------------------------------------------
-- Community events
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
-- Director welcome message
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
  id, "directorName", "directorTitle", headline, goal, promises, closing
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
-- Per-staff welcome messages
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_messages (
  "userId" TEXT PRIMARY KEY,
  "staffName" TEXT NOT NULL,
  "staffTitle" TEXT NOT NULL,
  headline TEXT NOT NULL,
  goal TEXT NOT NULL,
  promises JSONB NOT NULL DEFAULT '[]'::jsonb,
  closing TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedByUserId" TEXT
);

ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read staff messages" ON public.staff_messages;
CREATE POLICY "Allow read staff messages" ON public.staff_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write staff messages" ON public.staff_messages;
CREATE POLICY "Allow write staff messages" ON public.staff_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS staff_messages_updated_idx ON public.staff_messages ("updatedAt" DESC);

-- ---------------------------------------------------------
-- Director-managed app changelog
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_updates (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  detail TEXT,
  "directorName" TEXT NOT NULL,
  "directorTitle" TEXT NOT NULL,
  "postedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read app updates" ON public.app_updates;
CREATE POLICY "Allow read app updates" ON public.app_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write app updates" ON public.app_updates;
CREATE POLICY "Allow write app updates" ON public.app_updates FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS app_updates_date_idx ON public.app_updates (date DESC, "updatedAt" DESC);

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
)
VALUES (
  'update_staff_messages',
  '2026-06-09',
  'Each staff member writes their own message',
  'Team notes are personal now — every staff member publishes their own welcome message on home and reviews.',
  'Instead of one shared city manager note, each moderator, administrator, and city manager can write and save their own message from Help & support. Published messages appear in the home carousel and on the reviews page. The director still has a separate director note.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------
-- Neighbor app reviews
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
  CHECK (rating >= 0 AND rating <= 5 AND (rating * 2)::int = (rating * 2));

ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read app reviews" ON public.app_reviews;
CREATE POLICY "Allow read app reviews" ON public.app_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write app reviews" ON public.app_reviews;
CREATE POLICY "Allow write app reviews" ON public.app_reviews FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS app_reviews_created_idx ON public.app_reviews ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS app_reviews_rating_idx ON public.app_reviews (rating);

-- ---------------------------------------------------------
-- Up/down votes on updates, reviews, and team messages
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_content_votes (
  id TEXT PRIMARY KEY,
  "targetType" TEXT NOT NULL CHECK ("targetType" IN ('update', 'review', 'leader_message')),
  "targetId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "voteType" TEXT NOT NULL CHECK ("voteType" IN ('up', 'down')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("targetType", "targetId", "userId")
);

CREATE INDEX IF NOT EXISTS community_content_votes_target_idx
  ON public.community_content_votes ("targetType", "targetId");

ALTER TABLE public.community_content_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read community content votes" ON public.community_content_votes;
CREATE POLICY "Allow read community content votes" ON public.community_content_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write community content votes" ON public.community_content_votes;
CREATE POLICY "Allow write community content votes" ON public.community_content_votes FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------
-- Push notifications
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions ("userId");
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions (endpoint);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  "userId" TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  claims BOOLEAN NOT NULL DEFAULT true,
  gifts BOOLEAN NOT NULL DEFAULT true,
  comments BOOLEAN NOT NULL DEFAULT true,
  "nearbyListings" BOOLEAN NOT NULL DEFAULT true,
  requests BOOLEAN NOT NULL DEFAULT true,
  announcements BOOLEAN NOT NULL DEFAULT true,
  "pickupReminders" BOOLEAN NOT NULL DEFAULT true,
  "newListings" BOOLEAN NOT NULL DEFAULT true,
  "accountUpdates" BOOLEAN NOT NULL DEFAULT true,
  "nearbyRadiusMiles" INTEGER NOT NULL DEFAULT 10,
  "followedCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_radius_check
    CHECK ("nearbyRadiusMiles" IN (0, 5, 10, 25, 50))
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------
-- Realtime (skip tables already in publication)
-- ---------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'community_events', 'event_rsvps', 'event_comments',
    'director_message', 'staff_messages', 'app_updates', 'app_reviews',
    'community_content_votes', 'notification_preferences'
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
