-- Comments on help-area announcements (app_updates rows).
-- Run in Supabase SQL Editor after app_updates exists.

CREATE TABLE IF NOT EXISTS public.app_update_comments (
  id TEXT PRIMARY KEY,
  "updateId" TEXT NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_update_comments_update_id_idx
  ON public.app_update_comments ("updateId");

ALTER TABLE public.app_update_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read app update comments" ON public.app_update_comments;
CREATE POLICY "Allow read app update comments" ON public.app_update_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write app update comments" ON public.app_update_comments;
CREATE POLICY "Allow write app update comments" ON public.app_update_comments FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_update_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_update_comments;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
