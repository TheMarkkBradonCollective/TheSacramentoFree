-- =========================================================
-- Fix director display name: Markk White (not Markeith or Mark)
-- Run once in Supabase SQL Editor.
-- Profile: 204b071f-100c-401d-b76d-40c594e1f132
-- =========================================================

DO $$
DECLARE
  director_uid TEXT := '204b071f-100c-401d-b76d-40c594e1f132';
BEGIN
  -- Profile
  UPDATE public.users
  SET "displayName" = 'Markk White'
  WHERE uid = director_uid;

  -- Director welcome note — sync name from whoever holds the director role
  UPDATE public.director_message dm
  SET "directorName" = u."displayName"
  FROM public.users u
  WHERE u.role = 'director'
    AND dm.id = 'main';

  -- Staff message row if you have one
  UPDATE public.staff_messages
  SET "staffName" = 'Markk White'
  WHERE "userId" = director_uid;

  -- Changelog posts — Markk's uid so votes tie to the right account
  UPDATE public.app_updates au
  SET
    "directorName" = u."displayName",
    "postedByUserId" = director_uid
  FROM public.users u
  WHERE u.uid = director_uid
    AND au."postedByUserId" IN ('director', director_uid);

  -- Listings, comments, reviews
  UPDATE public.items
  SET "userDisplayName" = 'Markk White'
  WHERE "userId" = director_uid;

  UPDATE public.item_comments
  SET "userName" = 'Markk White'
  WHERE "userId" = director_uid;

  UPDATE public.app_reviews
  SET "userName" = 'Markk White'
  WHERE "userId" = director_uid;

  -- Events
  UPDATE public.community_events
  SET "userDisplayName" = 'Markk White'
  WHERE "userId" = director_uid;

  UPDATE public.event_comments
  SET "userName" = 'Markk White'
  WHERE "userId" = director_uid;

  -- Messaging
  UPDATE public.message_requests
  SET "fromUserName" = 'Markk White'
  WHERE "fromUserId" = director_uid;

  UPDATE public.support_tickets
  SET "openerName" = 'Markk White'
  WHERE "openerUserId" = director_uid;

  UPDATE public.support_ticket_messages
  SET "senderName" = 'Markk White'
  WHERE "senderUserId" = director_uid;

  UPDATE public.user_reports
  SET "reporterName" = 'Markk White'
  WHERE "reporterUserId" = director_uid;

  -- Chat participant name map
  UPDATE public.chats
  SET "participantNames" = "participantNames" || jsonb_build_object(director_uid, 'Markk White')
  WHERE "participantIds" @> to_jsonb(ARRAY[director_uid]);

  -- Staff announcements if you authored any
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_announcements') THEN
    EXECUTE format(
      'UPDATE public.help_announcements SET "authorName" = %L WHERE "postedByUserId" = %L',
      'Markk White', director_uid
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_announcement_comments') THEN
    EXECUTE format(
      'UPDATE public.help_announcement_comments SET "userName" = %L WHERE "userId" = %L',
      'Markk White', director_uid
    );
  END IF;
END $$;
