-- Staff announcements in Help & support (separate from director app_updates changelog).
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.help_announcements (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  detail TEXT,
  "authorName" TEXT NOT NULL,
  "authorTitle" TEXT NOT NULL,
  "postedByUserId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS help_announcements_date_idx
  ON public.help_announcements (date DESC, "updatedAt" DESC);

ALTER TABLE public.help_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read help announcements" ON public.help_announcements;
CREATE POLICY "Allow read help announcements" ON public.help_announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write help announcements" ON public.help_announcements;
CREATE POLICY "Allow write help announcements" ON public.help_announcements FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'help_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.help_announcements;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
