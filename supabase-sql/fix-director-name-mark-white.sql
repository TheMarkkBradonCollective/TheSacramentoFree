-- =========================================================
-- Fix director display name: Mark White (not Markeith)
-- Run once in Supabase SQL Editor.
-- Profile: 204b071f-100c-401d-b76d-40c594e1f132
-- =========================================================

DO $$
DECLARE
  director_uid TEXT := '204b071f-100c-401d-b76d-40c594e1f132';
BEGIN
  -- Profile
  UPDATE public.users
  SET "displayName" = 'Mark White'
  WHERE uid = director_uid;

  -- Director welcome note
  UPDATE public.director_message
  SET "directorName" = 'Mark White'
  WHERE id = 'main';

  -- Staff message row if you have one
  UPDATE public.staff_messages
  SET "staffName" = 'Mark White'
  WHERE "userId" = director_uid;

  -- Changelog posts — sync author from profile, fix legacy postedByUserId
  UPDATE public.app_updates au
  SET
    "directorName" = u."displayName",
    "postedByUserId" = director_uid
  FROM public.users u
  WHERE u.uid = director_uid
    AND au."postedByUserId" IN ('director', director_uid);

  -- Listings, comments, reviews
  UPDATE public.items
  SET "userDisplayName" = 'Mark White'
  WHERE "userId" = director_uid;

  UPDATE public.item_comments
  SET "userName" = 'Mark White'
  WHERE "userId" = director_uid;

  UPDATE public.app_reviews
  SET "userName" = 'Mark White'
  WHERE "userId" = director_uid;

  -- Events
  UPDATE public.community_events
  SET "userDisplayName" = 'Mark White'
  WHERE "userId" = director_uid;

  UPDATE public.event_comments
  SET "userName" = 'Mark White'
  WHERE "userId" = director_uid;

  -- Messaging
  UPDATE public.message_requests
  SET "fromUserName" = 'Mark White'
  WHERE "fromUserId" = director_uid;

  UPDATE public.support_tickets
  SET "openerName" = 'Mark White'
  WHERE "openerUserId" = director_uid;

  UPDATE public.support_ticket_messages
  SET "senderName" = 'Mark White'
  WHERE "senderUserId" = director_uid;

  UPDATE public.user_reports
  SET "reporterName" = 'Mark White'
  WHERE "reporterUserId" = director_uid;

  -- Chat participant name map
  UPDATE public.chats
  SET "participantNames" = "participantNames" || jsonb_build_object(director_uid, 'Mark White')
  WHERE "participantIds" @> to_jsonb(ARRAY[director_uid]);

  -- Staff announcements if you authored any
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_announcements') THEN
    EXECUTE format(
      'UPDATE public.help_announcements SET "authorName" = %L WHERE "postedByUserId" = %L',
      'Mark White', director_uid
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_announcement_comments') THEN
    EXECUTE format(
      'UPDATE public.help_announcement_comments SET "userName" = %L WHERE "userId" = %L',
      'Mark White', director_uid
    );
  END IF;
END $$;
