-- Enable realtime on native_app_sessions so live single-session eviction works.
-- Run in Supabase SQL editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'native_app_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.native_app_sessions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
