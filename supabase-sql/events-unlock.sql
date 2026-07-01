-- =========================================================
-- EVENTS TAB UNLOCK — 1,000 neighbors (incremental migration)
-- Sacramento Buy Nothing
-- Run once in Supabase Dashboard → SQL Editor
-- Safe to re-run: CREATE OR REPLACE + DROP POLICY IF EXISTS
--
-- Prerequisites:
--   • public.users table exists
--   • supabase-sql/security-hardening.sql already run (is_staff helpers)
--   • OR run supabase-sql/events-complete.sql instead (includes everything)
--
-- Matches app: Events tab locked until community_member_count() >= 1000
-- Staff bypass in app + database (is_staff()).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Member count + unlock helpers (shared with awards at 500)
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
-- 2. community_events — read/write gated until unlock (staff bypass)
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

-- ---------------------------------------------------------
-- 3. event_rsvps — same unlock gate
-- ---------------------------------------------------------

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

-- ---------------------------------------------------------
-- 4. event_comments — same unlock gate
-- ---------------------------------------------------------

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
-- 5. Optional changelog (safe to re-run)
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
