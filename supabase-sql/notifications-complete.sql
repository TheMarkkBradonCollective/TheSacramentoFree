-- =========================================================
-- NOTIFICATIONS — COMPLETE SETUP (run once in Supabase SQL)
-- Sacramento Buy Nothing
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
--
-- After this script, run supabase-sql/install-push-webhooks.sql
-- (or configure webhooks manually — see supabase-sql/supabase-push-webhook.sql).
--
-- Toggle guide:
--   Comments        → owner when someone comments on your listing
--   Saved items     → bookmarkers when listing edited, commented, claimed, or status changes
--   Upvotes/Downvotes → owner when neighbors vote on your listing
-- =========================================================

-- 1. Push subscriptions (one row per browser/device endpoint)
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

-- 2. Notification preferences (one row per user)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  "userId" TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  "messageRequests" BOOLEAN NOT NULL DEFAULT true,
  support BOOLEAN NOT NULL DEFAULT true,
  claims BOOLEAN NOT NULL DEFAULT true,
  gifts BOOLEAN NOT NULL DEFAULT true,
  comments BOOLEAN NOT NULL DEFAULT true,
  "listingUpvotes" BOOLEAN NOT NULL DEFAULT true,
  "listingDownvotes" BOOLEAN NOT NULL DEFAULT true,
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
  "directorJoins" BOOLEAN NOT NULL DEFAULT true,
  "directorLeaves" BOOLEAN NOT NULL DEFAULT true,
  "directorModeration" BOOLEAN NOT NULL DEFAULT true,
  "directorReports" BOOLEAN NOT NULL DEFAULT true,
  "directorTickets" BOOLEAN NOT NULL DEFAULT true,
  "directorListings" BOOLEAN NOT NULL DEFAULT true,
  "directorMessageRequests" BOOLEAN NOT NULL DEFAULT true,
  "directorClaimRequests" BOOLEAN NOT NULL DEFAULT true,
  "nearbyRadiusMiles" INTEGER NOT NULL DEFAULT 10,
  "followedCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_radius_check
    CHECK ("nearbyRadiusMiles" IN (0, 5, 10, 25, 50))
);

-- Add any columns missing from older installs
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS support BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "messageRequests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingUpvotes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingDownvotes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingStatus" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "savedItems" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "accountUpdates" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "staffSupport" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "staffReports" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorJoins" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorLeaves" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorModeration" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorReports" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorTickets" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorListings" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorMessageRequests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorClaimRequests" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- 3. User notifications inbox (bell → Notifications tab — run user-notifications.sql for full DDL)
--    Rows are inserted by the server when listing activity is dispatched.

-- 4. Push dedup log (prevents duplicate alerts from client + webhook)
CREATE TABLE IF NOT EXISTS public.push_dispatch_log (
  id TEXT PRIMARY KEY,
  tag TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_dispatch_log_tag_created_idx
  ON public.push_dispatch_log (tag, "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS push_dispatch_log_tag_unique
  ON public.push_dispatch_log (tag);

-- 4. Backfill preferences for existing users (all toggles ON by default)
INSERT INTO public.notification_preferences ("userId")
SELECT u.uid FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences p WHERE p."userId" = u.uid
);

-- 5. Ensure directors have role set (optional — app also syncs on login)
UPDATE public.users
SET role = 'director'
WHERE role IS DISTINCT FROM 'director'
  AND (
    uid = '204b071f-100c-401d-b76d-40c594e1f132'
    OR lower(email) = 'sigsecspec@gmail.com'
  );

-- 6. Realtime for preference sync across tabs (optional)
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

-- 7. Saved items (server-side alerts when bookmarked listings change)
CREATE TABLE IF NOT EXISTS public.saved_items (
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "itemId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("userId", "itemId")
);

CREATE INDEX IF NOT EXISTS saved_items_item_id_idx ON public.saved_items ("itemId");

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved items" ON public.saved_items;
CREATE POLICY "Users manage own saved items" ON public.saved_items
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- 8. Purge stale push subscriptions older than 90 days
DELETE FROM public.push_subscriptions
WHERE "updatedAt" < NOW() - INTERVAL '90 days';

-- =========================================================
-- OPTIONAL: Database webhooks → /api/webhooks/supabase-push
-- See supabase-sql/supabase-push-webhook.sql for the full list.
-- Auth header: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
-- =========================================================
