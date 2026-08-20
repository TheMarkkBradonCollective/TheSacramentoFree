-- 30-day listing expiry: expiresAt from post date; owner edits reset the timer.
-- Run in Supabase SQL editor after deploy.

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "expiryWarnedAt" TIMESTAMPTZ;

-- Backfill active listings from original post date (createdAt + 30 days).
UPDATE public.items
SET "expiresAt" = "createdAt" + INTERVAL '30 days'
WHERE "expiresAt" IS NULL
  AND status = 'active';

CREATE INDEX IF NOT EXISTS items_expires_at_active_idx
  ON public.items ("expiresAt")
  WHERE status = 'active';
