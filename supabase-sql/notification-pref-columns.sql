-- Add notification preference columns (saved items, listing status, support)
-- Run in Supabase SQL editor if push notifications are already set up.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS support BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingStatus" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "savedItems" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "messageRequests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "staffSupport" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "staffReports" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorAlerts" BOOLEAN NOT NULL DEFAULT true;
