-- Staff can switch between official staff mode and neighbor mode in Account settings.
-- neighbor mode unlocks regular DM / Go Get / navigate flows; staff mode keeps badges + support threads.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "staffInteractionMode" TEXT NOT NULL DEFAULT 'staff';

ALTER TABLE public.item_comments
  ADD COLUMN IF NOT EXISTS "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.event_comments
  ADD COLUMN IF NOT EXISTS "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users."staffInteractionMode" IS 'staff | neighbor — how staff participate in neighbor-facing surfaces';
COMMENT ON COLUMN public.item_comments."postedAsNeighbor" IS 'true when staff posted while in neighbor mode (hide staff badge)';
COMMENT ON COLUMN public.event_comments."postedAsNeighbor" IS 'true when staff posted while in neighbor mode (hide staff badge)';
