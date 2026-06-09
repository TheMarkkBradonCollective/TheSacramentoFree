-- App changelog entries (director posts and edits in Help & support).
-- Run in Supabase SQL Editor.

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
  id,
  date,
  title,
  body,
  detail,
  "directorName",
  "directorTitle",
  "postedByUserId"
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_updates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates;
  END IF;
END $$;
