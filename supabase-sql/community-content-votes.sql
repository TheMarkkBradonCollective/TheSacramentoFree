-- Community up/down votes on updates, reviews, and staff messages.
-- Update votes are feedback for the director.

CREATE TABLE IF NOT EXISTS public.community_content_votes (
  id TEXT PRIMARY KEY,
  "targetType" TEXT NOT NULL CHECK ("targetType" IN ('update', 'review', 'leader_message', 'announcement')),
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'community_content_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_content_votes;
  END IF;
END $$;
