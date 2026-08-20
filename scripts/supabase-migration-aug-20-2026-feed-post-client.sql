-- Feed posts: record client install kind + version at post time (Aug 20, 2026)
-- Run in Supabase SQL editor.

ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS "clientInstallKind" TEXT
    CHECK ("clientInstallKind" IN ('browser', 'pwa', 'ios-pwa', 'android-apk')),
  ADD COLUMN IF NOT EXISTS "clientVersion" TEXT;
