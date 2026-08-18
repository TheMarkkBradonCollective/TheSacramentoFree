-- Unique device download + install tracking for the Director overview.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.app_device_downloads (
  "deviceId" TEXT PRIMARY KEY,
  "apkDownloadedAt" TIMESTAMPTZ,
  "aabDownloadedAt" TIMESTAMPTZ,
  "firstSeenAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_device_downloads_apk_idx
  ON public.app_device_downloads ("apkDownloadedAt")
  WHERE "apkDownloadedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_device_downloads_aab_idx
  ON public.app_device_downloads ("aabDownloadedAt")
  WHERE "aabDownloadedAt" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.app_device_installs (
  "deviceId" TEXT NOT NULL,
  "installKind" TEXT NOT NULL CHECK ("installKind" IN ('pwa', 'ios-pwa', 'android-apk')),
  "apkVersionCode" INTEGER,
  "apkVersionName" TEXT,
  "userId" TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
  "firstInstalledAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("deviceId", "installKind")
);

CREATE INDEX IF NOT EXISTS app_device_installs_kind_idx
  ON public.app_device_installs ("installKind");

ALTER TABLE public.app_device_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_device_installs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_app_device_downloads" ON public.app_device_downloads;
CREATE POLICY "staff_read_app_device_downloads" ON public.app_device_downloads
  FOR SELECT USING (
    public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  );

DROP POLICY IF EXISTS "staff_read_app_device_installs" ON public.app_device_installs;
CREATE POLICY "staff_read_app_device_installs" ON public.app_device_installs
  FOR SELECT USING (
    public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'app_device_downloads'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.app_device_downloads;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'app_device_installs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.app_device_installs;
    END IF;
  END IF;
END $$;
