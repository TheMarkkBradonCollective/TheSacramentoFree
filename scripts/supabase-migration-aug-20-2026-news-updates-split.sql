-- =========================================================
-- AUG 20 2026 — News vs Updates split (one-time cleanup)
-- Run in Supabase SQL Editor on the EXISTING production database.
-- Safe to re-run: DELETEs are idempotent.
--
-- Rules (mirrors shared/changelogFilters.ts):
--   • Updates tab  = product changes only (no APK / release posts)
--   • News tab     = Android releases + director announcements
--   • Bell alerts  = unchanged (user_notifications — not touched here)
--
-- After this, cron /api/cron/publish-changelog keeps seeds in sync.
-- =========================================================

-- Release/build rows belong in News (help_announcements), not Updates.
DELETE FROM public.community_content_votes
WHERE "targetType" = 'update'
  AND "targetId" IN (
    SELECT id FROM public.app_updates
    WHERE id ~ '_apk-'
       OR id ~* 'apk-[0-9]{4}'
       OR id ~* '(-apk-|android-apk|signed-apk|shell-download)'
       OR title ~* '^New Android download'
       OR title ~* '^Labeled feed switches.*beta v0'
  );

DELETE FROM public.app_update_comments
WHERE "updateId" IN (
  SELECT id FROM public.app_updates
  WHERE id ~ '_apk-'
     OR id ~* 'apk-[0-9]{4}'
     OR id ~* '(-apk-|android-apk|signed-apk|shell-download)'
     OR title ~* '^New Android download'
     OR title ~* '^Labeled feed switches.*beta v0'
);

DELETE FROM public.app_updates
WHERE id ~ '_apk-'
   OR id ~* 'apk-[0-9]{4}'
   OR id ~* '(-apk-|android-apk|signed-apk|shell-download)'
   OR title ~* '^New Android download'
   OR title ~* '^Labeled feed switches.*beta v0';

-- Product-change-only rows belong in Updates, not News.
DELETE FROM public.community_content_votes
WHERE "targetType" = 'announcement'
  AND "targetId" IN (
    '2026-08-20_photo-upload-fix',
    '2026-08-20_event-recurrence',
    '2026-08-20_staff-participation-mode',
    '2026-08-18_feed-hide-given-fulfilled'
  );

DELETE FROM public.help_announcement_comments
WHERE "announcementId" IN (
  '2026-08-20_photo-upload-fix',
  '2026-08-20_event-recurrence',
  '2026-08-20_staff-participation-mode',
  '2026-08-18_feed-hide-given-fulfilled'
);

DELETE FROM public.help_announcements
WHERE id IN (
  '2026-08-20_photo-upload-fix',
  '2026-08-20_event-recurrence',
  '2026-08-20_staff-participation-mode',
  '2026-08-18_feed-hide-given-fulfilled'
);
