-- Push notification toggles for community-wide and staff-only chat channels.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS "communityChat" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS "staffChat" BOOLEAN NOT NULL DEFAULT true;
