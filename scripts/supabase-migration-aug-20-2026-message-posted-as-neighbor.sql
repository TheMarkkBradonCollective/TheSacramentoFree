-- Persist staff/user mode on chat messages at send time (Aug 20, 2026)
-- Run in Supabase SQL editor.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.help_announcement_comments
  ADD COLUMN IF NOT EXISTS "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.app_update_comments
  ADD COLUMN IF NOT EXISTS "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.messages."postedAsNeighbor" IS 'true when staff sent while in user/neighbor mode (hide staff badge)';
COMMENT ON COLUMN public.help_announcement_comments."postedAsNeighbor" IS 'true when staff posted while in neighbor mode (hide staff badge)';
COMMENT ON COLUMN public.app_update_comments."postedAsNeighbor" IS 'true when staff posted while in neighbor mode (hide staff badge)';
