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
