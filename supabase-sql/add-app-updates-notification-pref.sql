-- Separate notification preference for director app changelog vs staff announcements.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS "appUpdates" BOOLEAN NOT NULL DEFAULT true;

-- Extend vote target type for staff announcements.
ALTER TABLE public.community_content_votes
  DROP CONSTRAINT IF EXISTS community_content_votes_targetType_check;

ALTER TABLE public.community_content_votes
  ADD CONSTRAINT community_content_votes_targetType_check
  CHECK ("targetType" IN ('update', 'review', 'leader_message', 'announcement'));
