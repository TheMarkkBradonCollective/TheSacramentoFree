-- Clear all Updates and News posts (and related comments/votes).
-- Run once in the Supabase SQL editor on production.
-- Cron /api/cron/publish-changelog also prunes rows not in shared/changelogSeed.ts.

DELETE FROM public.community_content_votes
WHERE "targetType" IN ('update', 'announcement');

DELETE FROM public.app_update_comments;
DELETE FROM public.help_announcement_comments;

DELETE FROM public.app_updates;
DELETE FROM public.help_announcements;
