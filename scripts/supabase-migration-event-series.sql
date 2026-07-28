-- Repeat community events — seriesId column
-- Safe to re-run. Paste into Supabase SQL Editor on existing production DBs.
--
-- Event data (Lucid Winery, Fremont Park, etc.) is NOT included here.
-- Use scripts/seed-lucid-fremont-events-2026.sql for one-off event seeds.
-- Full schema: complete-schema.sql at repo root.

ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS "seriesId" TEXT;

CREATE INDEX IF NOT EXISTS community_events_series_idx
  ON public.community_events ("seriesId")
  WHERE "seriesId" IS NOT NULL;
