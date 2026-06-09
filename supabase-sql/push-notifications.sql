-- =========================================================
-- WEB PUSH NOTIFICATIONS — Sacramento Buy Nothing
-- Run in Supabase Dashboard → SQL → New query
-- =========================================================

-- Push subscription storage (one row per browser endpoint)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions ("userId");
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions (endpoint);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  "userId" TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  "messageRequests" BOOLEAN NOT NULL DEFAULT true,
  support BOOLEAN NOT NULL DEFAULT true,
  claims BOOLEAN NOT NULL DEFAULT true,
  gifts BOOLEAN NOT NULL DEFAULT true,
  comments BOOLEAN NOT NULL DEFAULT true,
  "listingStatus" BOOLEAN NOT NULL DEFAULT true,
  "nearbyListings" BOOLEAN NOT NULL DEFAULT true,
  requests BOOLEAN NOT NULL DEFAULT true,
  announcements BOOLEAN NOT NULL DEFAULT true,
  "pickupReminders" BOOLEAN NOT NULL DEFAULT true,
  "newListings" BOOLEAN NOT NULL DEFAULT true,
  "savedItems" BOOLEAN NOT NULL DEFAULT true,
  "accountUpdates" BOOLEAN NOT NULL DEFAULT true,
  "staffSupport" BOOLEAN NOT NULL DEFAULT true,
  "staffReports" BOOLEAN NOT NULL DEFAULT true,
  "directorAlerts" BOOLEAN NOT NULL DEFAULT true,
  "nearbyRadiusMiles" INTEGER NOT NULL DEFAULT 10,
  "followedCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_radius_check
    CHECK ("nearbyRadiusMiles" IN (0, 5, 10, 25, 50))
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- Realtime (optional — for settings sync across tabs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notification_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
