-- Per-staff public welcome messages (one row per staff member; hidden until first save).
-- Run in Supabase SQL Editor after part-17-and-community-content.sql.

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'staff_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
  END IF;
END $$;
