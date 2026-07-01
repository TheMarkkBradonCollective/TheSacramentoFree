-- =========================================================
-- EVENTS — COMPLETE SETUP (run once in Supabase SQL)
-- Sacramento Buy Nothing
-- Safe to re-run: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS
--
-- Includes:
--   • community_events, event_rsvps, event_comments tables
--   • 1,000-member unlock (events_unlocked) + staff bypass
--   • RLS policies matching the app Events tab lock
--   • Realtime publication for live event updates
--
-- Prerequisites:
--   • public.users table exists (supabase-setup.sql section 1)
--   • For is_staff() helper: run security-hardening.sql first,
--     OR this script defines minimal staff helpers below.
--
-- Existing production DB:
--   Run supabase-sql/events-unlock.sql if tables already exist.
-- =========================================================

-- ---------------------------------------------------------
-- 0. Minimal security helpers (no-op if security-hardening ran)
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE uid = auth.uid()::text),
    'user'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_role(role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT role IN (
    'city_moderator', 'city_administrator', 'city_manager',
    'director', 'moderator', 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff_role(public.current_user_role());
$$;

-- ---------------------------------------------------------
-- 1. Community events tables (free gatherings only)
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

CREATE INDEX IF NOT EXISTS event_comments_event_idx ON public.event_comments ("eventId");

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 2. Unlock helpers (1,000 neighbors; awards use 500 separately)
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.community_member_count()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.users;
$$;

CREATE OR REPLACE FUNCTION public.events_unlocked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.community_member_count() >= 1000;
$$;

GRANT EXECUTE ON FUNCTION public.community_member_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.events_unlocked() TO authenticated;

-- ---------------------------------------------------------
-- 3. RLS — locked until 1,000 members (staff bypass)
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read community events" ON public.community_events;
DROP POLICY IF EXISTS "Allow write community events" ON public.community_events;
DROP POLICY IF EXISTS "community_events_select" ON public.community_events;
DROP POLICY IF EXISTS "community_events_write_own" ON public.community_events;
DROP POLICY IF EXISTS "community_events_insert" ON public.community_events;
DROP POLICY IF EXISTS "community_events_update" ON public.community_events;
DROP POLICY IF EXISTS "community_events_delete" ON public.community_events;

CREATE POLICY "community_events_select" ON public.community_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "community_events_insert" ON public.community_events
  FOR INSERT WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "community_events_update" ON public.community_events
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "community_events_delete" ON public.community_events
  FOR DELETE USING (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

DROP POLICY IF EXISTS "Allow read event rsvps" ON public.event_rsvps;
DROP POLICY IF EXISTS "Allow write event rsvps" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_select" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_write_own" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_insert" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_update" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_delete" ON public.event_rsvps;

CREATE POLICY "event_rsvps_select" ON public.event_rsvps
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_rsvps_insert" ON public.event_rsvps
  FOR INSERT WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_rsvps_update" ON public.event_rsvps
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_rsvps_delete" ON public.event_rsvps
  FOR DELETE USING (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

DROP POLICY IF EXISTS "Allow read event comments" ON public.event_comments;
DROP POLICY IF EXISTS "Allow write event comments" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_select" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_write_own" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_insert" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_update" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_delete" ON public.event_comments;

CREATE POLICY "event_comments_select" ON public.event_comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_comments_insert" ON public.event_comments
  FOR INSERT WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_comments_update" ON public.event_comments
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_comments_delete" ON public.event_comments
  FOR DELETE USING (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

-- ---------------------------------------------------------
-- 4. Realtime (live event list + RSVPs + comments)
-- ---------------------------------------------------------

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['community_events', 'event_rsvps', 'event_comments']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------
-- 5. Changelog entry (optional; requires app_updates table)
-- ---------------------------------------------------------

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES (
  '2026-07-01_events-unlock-1000',
  '2026-07-01',
  'Events unlock at 1,000 neighbors',
  'The Events tab is locked until we reach 1,000 members — share the invite link to help us get there!',
  'Free neighborhood meetups (potlucks, swaps, park gatherings) unlock for everyone at 1,000 neighbors. Until then you will see a progress bar and sneak peek on the Events tab. Staff can preview and post events early. Awards still unlock at 500 members.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId";
