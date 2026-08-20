-- Cross-device user preferences + single native app session (Aug 20, 2026)
-- Run in Supabase SQL editor.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "navigationSettings" JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "appPreferences" JSONB;

CREATE TABLE IF NOT EXISTS public.native_app_sessions (
  "userId" TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  "sessionId" TEXT NOT NULL,
  "deviceId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS native_app_sessions_updated_at_idx
  ON public.native_app_sessions ("updatedAt" DESC);

ALTER TABLE public.native_app_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "native_app_sessions_select_own" ON public.native_app_sessions;
CREATE POLICY "native_app_sessions_select_own"
  ON public.native_app_sessions FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "native_app_sessions_insert_own" ON public.native_app_sessions;
CREATE POLICY "native_app_sessions_insert_own"
  ON public.native_app_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "native_app_sessions_update_own" ON public.native_app_sessions;
CREATE POLICY "native_app_sessions_update_own"
  ON public.native_app_sessions FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "native_app_sessions_delete_own" ON public.native_app_sessions;
CREATE POLICY "native_app_sessions_delete_own"
  ON public.native_app_sessions FOR DELETE
  USING (auth.uid()::text = "userId");
