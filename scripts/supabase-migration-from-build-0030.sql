-- =========================================================
-- SUPABASE MIGRATION — from beta 0030 → 0040
-- Run ONCE in Supabase Dashboard → SQL Editor if your production
-- database was last synced at Android beta v0.1.0.0030 (versionCode 30).
--
-- Beta 0030 had NO schema changes (launcher icon only). This file
-- concatenates every incremental migration shipped in builds 0031–0040.
--
-- Safe to re-run: all sections use IF NOT EXISTS / idempotent DELETEs.
--
-- Assumes already applied (through beta 0030):
--   • scripts/supabase-migration-july-2026.sql
--   • scripts/supabase-migration-event-series.sql
--   • scripts/supabase-migration-aug-18-2026-*.sql (all Aug 18 files)
--   • scripts/supabase-migration-aug-20-2026-staff-interaction-mode.sql (beta 0023)
--   • scripts/supabase-migration-aug-20-2026-go-get-ring-availability.sql (beta 0026+)
--
-- After running section 4 (Neighbor Feed), configure push webhooks for:
--   feed_post_comments, feed_post_reactions, community_content_votes
--
-- Do NOT paste complete-schema.sql on an existing production database.
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- 1. Chat event context (beta 0031)
-- Source: scripts/supabase-migration-aug-20-2026-chat-event-context.sql
-- Builds: 0031
-- ─────────────────────────────────────────────────────────

-- Neighbor coordination chats can be about a community event (not only listings).
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS "eventId" TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS "eventTitle" TEXT;
CREATE INDEX IF NOT EXISTS chats_event_id_idx ON public.chats ("eventId");


-- ─────────────────────────────────────────────────────────
-- 2. 30-day listing expiry (beta 0034)
-- Source: scripts/supabase-migration-aug-20-2026-listing-expiry.sql
-- Builds: 0034
-- ─────────────────────────────────────────────────────────

-- 30-day listing expiry: expiresAt from post date; owner edits reset the timer.
-- Run in Supabase SQL editor after deploy.

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "expiryWarnedAt" TIMESTAMPTZ;

-- Backfill active listings from original post date (createdAt + 30 days).
UPDATE public.items
SET "expiresAt" = "createdAt" + INTERVAL '30 days'
WHERE "expiresAt" IS NULL
  AND status = 'active';

CREATE INDEX IF NOT EXISTS items_expires_at_active_idx
  ON public.items ("expiresAt")
  WHERE status = 'active';


-- ─────────────────────────────────────────────────────────
-- 3. News vs Updates split (beta 0035)
-- Source: scripts/supabase-migration-aug-20-2026-news-updates-split.sql
-- Builds: 0035
-- ─────────────────────────────────────────────────────────

-- =========================================================
-- AUG 20 2026 — News vs Updates split (one-time cleanup)
-- Run in Supabase SQL Editor on the EXISTING production database.
-- Safe to re-run: DELETEs are idempotent.
--
-- Rules (mirrors shared/changelogFilters.ts):
--   • Updates tab  = product changes only (no APK / release posts)
--   • News tab     = Android releases + director announcements
--   • Bell alerts  = unchanged (user_notifications — not touched here)
--
-- After this, cron /api/cron/publish-changelog keeps seeds in sync.
-- =========================================================

-- Release/build rows belong in News (help_announcements), not Updates.
DELETE FROM public.community_content_votes
WHERE "targetType" = 'update'
  AND "targetId" IN (
    SELECT id FROM public.app_updates
    WHERE id ~ '_apk-'
       OR id ~* 'apk-[0-9]{4}'
       OR id ~* '(-apk-|android-apk|signed-apk|shell-download)'
       OR title ~* '^New Android download'
       OR title ~* '^Labeled feed switches.*beta v0'
  );

DELETE FROM public.app_update_comments
WHERE "updateId" IN (
  SELECT id FROM public.app_updates
  WHERE id ~ '_apk-'
     OR id ~* 'apk-[0-9]{4}'
     OR id ~* '(-apk-|android-apk|signed-apk|shell-download)'
     OR title ~* '^New Android download'
     OR title ~* '^Labeled feed switches.*beta v0'
);

DELETE FROM public.app_updates
WHERE id ~ '_apk-'
   OR id ~* 'apk-[0-9]{4}'
   OR id ~* '(-apk-|android-apk|signed-apk|shell-download)'
   OR title ~* '^New Android download'
   OR title ~* '^Labeled feed switches.*beta v0';

-- Product-change-only rows belong in Updates, not News.
DELETE FROM public.community_content_votes
WHERE "targetType" = 'announcement'
  AND "targetId" IN (
    '2026-08-20_photo-upload-fix',
    '2026-08-20_event-recurrence',
    '2026-08-20_staff-participation-mode',
    '2026-08-18_feed-hide-given-fulfilled'
  );

DELETE FROM public.help_announcement_comments
WHERE "announcementId" IN (
  '2026-08-20_photo-upload-fix',
  '2026-08-20_event-recurrence',
  '2026-08-20_staff-participation-mode',
  '2026-08-18_feed-hide-given-fulfilled'
);

DELETE FROM public.help_announcements
WHERE id IN (
  '2026-08-20_photo-upload-fix',
  '2026-08-20_event-recurrence',
  '2026-08-20_staff-participation-mode',
  '2026-08-18_feed-hide-given-fulfilled'
);


-- ─────────────────────────────────────────────────────────
-- 4. Neighbor Feed tables (beta 0037–0040)
-- Source: scripts/supabase-migration-aug-20-2026-neighbor-feed.sql
-- Builds: 0037+
-- ─────────────────────────────────────────────────────────

-- Neighbor Feed: posts, nested comments, emoji reactions, votes (Aug 20, 2026)
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "userDisplayName" TEXT NOT NULL,
  "userPhotoURL" TEXT,
  neighborhood TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  "imageUrls" JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'removed')),
  "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_posts_created_idx ON public.feed_posts ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS feed_posts_user_idx ON public.feed_posts ("userId");

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_posts_select" ON public.feed_posts;
CREATE POLICY "feed_posts_select" ON public.feed_posts
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');

DROP POLICY IF EXISTS "feed_posts_insert" ON public.feed_posts;
CREATE POLICY "feed_posts_insert" ON public.feed_posts
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "feed_posts_update_own" ON public.feed_posts;
CREATE POLICY "feed_posts_update_own" ON public.feed_posts
  FOR UPDATE USING (auth.uid()::text = "userId" OR public.is_staff())
  WITH CHECK (auth.uid()::text = "userId" OR public.is_staff());

DROP POLICY IF EXISTS "feed_posts_delete" ON public.feed_posts;
CREATE POLICY "feed_posts_delete" ON public.feed_posts
  FOR DELETE USING (auth.uid()::text = "userId" OR public.is_staff());

-- Nested comments (parentCommentId null = top-level on post)
CREATE TABLE IF NOT EXISTS public.feed_post_comments (
  id TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  "parentCommentId" TEXT REFERENCES public.feed_post_comments(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feed_post_comments_post_idx ON public.feed_post_comments ("postId", "createdAt");
CREATE INDEX IF NOT EXISTS feed_post_comments_parent_idx ON public.feed_post_comments ("parentCommentId");

ALTER TABLE public.feed_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_post_comments_select" ON public.feed_post_comments;
CREATE POLICY "feed_post_comments_select" ON public.feed_post_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "feed_post_comments_insert" ON public.feed_post_comments;
CREATE POLICY "feed_post_comments_insert" ON public.feed_post_comments
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "feed_post_comments_delete" ON public.feed_post_comments;
CREATE POLICY "feed_post_comments_delete" ON public.feed_post_comments
  FOR DELETE USING (auth.uid()::text = "userId" OR public.is_staff());

-- Emoji reactions (toggle per user per emoji)
CREATE TABLE IF NOT EXISTS public.feed_post_reactions (
  "postId" TEXT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  emoji TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("postId", "userId", emoji)
);

CREATE INDEX IF NOT EXISTS feed_post_reactions_post_idx ON public.feed_post_reactions ("postId");

ALTER TABLE public.feed_post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_post_reactions_select" ON public.feed_post_reactions;
CREATE POLICY "feed_post_reactions_select" ON public.feed_post_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "feed_post_reactions_write" ON public.feed_post_reactions;
CREATE POLICY "feed_post_reactions_write" ON public.feed_post_reactions
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Extend community_content_votes for feed post up/down
ALTER TABLE public.community_content_votes DROP CONSTRAINT IF EXISTS community_content_votes_targetType_check;
ALTER TABLE public.community_content_votes ADD CONSTRAINT community_content_votes_targetType_check
  CHECK ("targetType" IN ('update', 'review', 'leader_message', 'announcement', 'feed_post'));

-- Optional context on user reports
ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS "feedPostId" TEXT;
ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS "feedCommentId" TEXT;


-- ─────────────────────────────────────────────────────────
-- 5. OPTIONAL — Welcome feed post seed (beta 0039)
-- Source: scripts/seed-welcome-feed-post-2026.sql
-- Skip if you already have the welcome post or prefer to add it later.
-- ─────────────────────────────────────────────────────────

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
  'Hey guys — glad to have y''all here!

I was thinking… what''s an app like this without somewhere to chit-chat? So Feed is live.

Not just listing stuff. Drop a photo, say hey, talk about a pickup that went smooth, ask the neighborhood something — whatever.

Comment, react, vote — same as everywhere else. I wanted a spot where we''re not ONLY talking about free couches 😂

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
