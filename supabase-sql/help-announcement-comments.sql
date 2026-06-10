-- Comments on help-area staff announcements.
-- Run after help-announcements.sql.

CREATE TABLE IF NOT EXISTS public.help_announcement_comments (
  id TEXT PRIMARY KEY,
  "announcementId" TEXT NOT NULL REFERENCES public.help_announcements(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS help_announcement_comments_announcement_id_idx
  ON public.help_announcement_comments ("announcementId");

ALTER TABLE public.help_announcement_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read help announcement comments" ON public.help_announcement_comments;
CREATE POLICY "Allow read help announcement comments" ON public.help_announcement_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write help announcement comments" ON public.help_announcement_comments;
CREATE POLICY "Allow write help announcement comments" ON public.help_announcement_comments FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'help_announcement_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.help_announcement_comments;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
