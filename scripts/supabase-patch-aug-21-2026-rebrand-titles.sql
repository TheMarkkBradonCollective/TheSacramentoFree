-- =========================================================
-- AUG 21 2026 — Patch indirect titles (no name, not too scary)
-- Run in Supabase SQL Editor. Safe to re-run.
-- =========================================================

UPDATE public.app_updates
SET
  title = 'Something worth reading when you visit',
  body = 'Home page notice, a one-time letter when you visit, and a brief pause on big new builds.',
  "updatedAt" = NOW()
WHERE id = '2026-08-21_trademark-rebrand-notice';

UPDATE public.help_announcements
SET
  title = 'I almost got you — please read',
  body = 'I opened heavy on purpose. We are still here — read the full letter.',
  "updatedAt" = NOW()
WHERE id = '2026-08-21_rebrand-letter';
