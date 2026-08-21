-- =========================================================
-- AUG 21 2026 — Patch indirect titles (already ran main migration)
-- Run in Supabase SQL Editor. Safe to re-run.
-- =========================================================

UPDATE public.app_updates
SET
  title = 'From Mark — something on the home page',
  body = 'Home page notice, a one-time letter when you visit, and a brief pause on big new builds.',
  "updatedAt" = NOW()
WHERE id = '2026-08-21_trademark-rebrand-notice';

UPDATE public.help_announcements
SET
  title = 'From Mark — I almost got you',
  body = 'I opened with bad news on purpose. We are not shutting down — read the letter.',
  "updatedAt" = NOW()
WHERE id = '2026-08-21_rebrand-letter';
