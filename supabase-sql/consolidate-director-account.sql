-- ============================================================
-- Consolidate director → marknickwhite@gmail.com
-- Run in Supabase SQL Editor (postgres / service role)
--
-- - Delete markkisstickz96@gmail.com
-- - Clear all community data from director account
-- - joinRank = 1, director role, no leaderboard badges
-- - Title: TheSacramentoFree Director
-- ============================================================

DO $$
DECLARE
  primary_email   text := 'marknickwhite@gmail.com';
  secondary_email text := 'markkisstickz96@gmail.com';
  primary_uid     text;
  secondary_uid   text;
BEGIN
  SELECT uid INTO primary_uid
  FROM public.users
  WHERE lower(email) = lower(primary_email);

  SELECT uid INTO secondary_uid
  FROM public.users
  WHERE lower(email) = lower(secondary_email);

  IF primary_uid IS NULL THEN
    RAISE EXCEPTION 'No profile found for %. Sign in once first.', primary_email;
  END IF;

  -- 1) Clear community data on your director account
  PERFORM public.purge_user_community_data(primary_uid);

  DELETE FROM public.feed_poll_votes WHERE "userId" = primary_uid;
  DELETE FROM public.feed_post_reactions WHERE "userId" = primary_uid;
  DELETE FROM public.feed_post_comments WHERE "userId" = primary_uid;
  DELETE FROM public.feed_posts WHERE "userId" = primary_uid;

  DELETE FROM public.event_comments WHERE "userId" = primary_uid;
  DELETE FROM public.event_rsvps WHERE "userId" = primary_uid;
  DELETE FROM public.community_events WHERE "userId" = primary_uid;

  DELETE FROM public.user_notifications WHERE "userId" = primary_uid;
  DELETE FROM public.push_subscriptions WHERE "userId" = primary_uid;
  DELETE FROM public.saved_items WHERE "userId" = primary_uid;
  DELETE FROM public.staff_applications WHERE "applicantUserId" = primary_uid;
  DELETE FROM public.staff_messages WHERE "userId" = primary_uid;
  DELETE FROM public.user_violations WHERE "userId" = primary_uid;

  -- Remove from leaderboard
  DELETE FROM public.user_awards WHERE "userId" = primary_uid;

  -- 2) Make you neighbor #1
  UPDATE public.users
  SET "joinRank" = "joinRank" + 1
  WHERE uid <> primary_uid
    AND "joinRank" IS NOT NULL
    AND "joinRank" >= 1;

  -- 3) Set director profile (keep account, wipe neighbor activity)
  UPDATE public.users
  SET
    role = 'director',
    "joinRank" = 1,
    "goGetEnabled" = false,
    "staffInteractionMode" = 'staff',
    bio = '',
    "accountStatus" = 'active'
  WHERE uid = primary_uid;

  -- Demote any other director
  UPDATE public.users
  SET role = 'user'
  WHERE role = 'director'
    AND uid <> primary_uid;

  -- 4) Director welcome note title
  UPDATE public.director_message
  SET
    "directorName" = COALESCE((SELECT "displayName" FROM public.users WHERE uid = primary_uid), 'Markeith White'),
    "directorTitle" = 'TheSacramentoFree Director',
    "updatedAt" = NOW(),
    "updatedByUserId" = primary_uid
  WHERE id = 'main';

  -- 5) Delete secondary account completely
  IF secondary_uid IS NOT NULL THEN
    PERFORM public.purge_user_community_data(secondary_uid);
    DELETE FROM public.user_awards WHERE "userId" = secondary_uid;
    DELETE FROM public.users WHERE uid = secondary_uid;
    DELETE FROM auth.users WHERE id = secondary_uid::uuid;
  END IF;

  RAISE NOTICE 'Director UID: %', primary_uid;
  RAISE NOTICE 'Deleted secondary: %', secondary_email;
END $$;

-- Confirm
SELECT uid, email, role, "joinRank", "goGetEnabled"
FROM public.users
WHERE lower(email) IN ('marknickwhite@gmail.com', 'markkisstickz96@gmail.com');

-- If secondary only exists in auth (no public.users row):
-- DELETE FROM auth.users WHERE lower(email) = 'markkisstickz96@gmail.com';
