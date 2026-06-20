-- Account deletion RPCs (run once in Supabase → SQL Editor)
-- Removes profile, auth login, listings, comments, votes, chats, claims, and related data.

DROP FUNCTION IF EXISTS public.delete_own_account();
DROP FUNCTION IF EXISTS public.staff_delete_user_account(text);
DROP FUNCTION IF EXISTS public.purge_user_community_data(text);

CREATE OR REPLACE FUNCTION public.purge_user_community_data(target_uid text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $purge$
BEGIN
  IF target_uid IS NULL OR target_uid = '' THEN
    RETURN;
  END IF;

  DELETE FROM public.item_claim_requests
  WHERE "giverUserId" = target_uid OR "claimerUserId" = target_uid;

  DELETE FROM public.item_claims
  WHERE "giverUserId" = target_uid OR "claimerUserId" = target_uid;

  DELETE FROM public.listing_subitems
  WHERE "itemId" IN (SELECT id FROM public.items WHERE "userId" = target_uid);

  DELETE FROM public.item_votes
  WHERE "itemId" IN (SELECT id FROM public.items WHERE "userId" = target_uid);

  DELETE FROM public.item_comments
  WHERE "itemId" IN (SELECT id FROM public.items WHERE "userId" = target_uid);

  DELETE FROM public.messages
  WHERE "chatId" IN (
    SELECT id FROM public.chats
    WHERE "itemId" IN (SELECT id FROM public.items WHERE "userId" = target_uid)
  );

  DELETE FROM public.chats
  WHERE "itemId" IN (SELECT id FROM public.items WHERE "userId" = target_uid);

  DELETE FROM public.items WHERE "userId" = target_uid;

  DELETE FROM public.item_votes WHERE "userId" = target_uid;
  DELETE FROM public.item_comments WHERE "userId" = target_uid;

  DELETE FROM public.messages
  WHERE "senderId" = target_uid
     OR "chatId" IN (
       SELECT id FROM public.chats
       WHERE "participantIds"::jsonb @> jsonb_build_array(target_uid)
     );

  DELETE FROM public.chats
  WHERE "participantIds"::jsonb @> jsonb_build_array(target_uid);

  DELETE FROM public.user_blocks
  WHERE "blockerUserId" = target_uid OR "blockedUserId" = target_uid;

  DELETE FROM public.message_requests
  WHERE "fromUserId" = target_uid OR "toUserId" = target_uid;

  DELETE FROM public.user_reports
  WHERE "reporterUserId" = target_uid OR "reportedUserId" = target_uid;

  DELETE FROM public.support_ticket_messages
  WHERE "senderUserId" = target_uid
     OR "ticketId" IN (
       SELECT id FROM public.support_tickets WHERE "openerUserId" = target_uid
     );

  DELETE FROM public.support_tickets WHERE "openerUserId" = target_uid;

  DELETE FROM public.moderation_audit_log
  WHERE "actorUserId" = target_uid OR "targetUserId" = target_uid;
END;
$purge$;

REVOKE ALL ON FUNCTION public.purge_user_community_data(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_user_community_data(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.purge_user_community_data(text) FROM anon;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $acctdel$
DECLARE
  user_uid text := auth.uid()::text;
BEGIN
  IF user_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.purge_user_community_data(user_uid);

  DELETE FROM public.users WHERE uid = user_uid;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$acctdel$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_delete_user_account(target_uid text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $acctdel$
DECLARE
  actor_uid text := auth.uid()::text;
  actor_role text;
  target_role text;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF target_uid IS NULL OR target_uid = '' THEN
    RAISE EXCEPTION 'Target user required';
  END IF;
  IF target_uid = actor_uid THEN
    RAISE EXCEPTION 'Use account settings to delete your own account';
  END IF;

  SELECT role INTO actor_role FROM public.users WHERE uid = actor_uid;
  IF actor_role IS NULL OR actor_role NOT IN ('city_manager', 'director') THEN
    RAISE EXCEPTION 'Not authorized to delete accounts';
  END IF;

  SELECT role INTO target_role FROM public.users WHERE uid = target_uid;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF actor_role = 'city_manager' AND target_role IN ('city_manager', 'director') THEN
    RAISE EXCEPTION 'Only a director can delete leadership accounts';
  END IF;

  PERFORM public.purge_user_community_data(target_uid);

  DELETE FROM public.users WHERE uid = target_uid;

  DELETE FROM auth.users WHERE id = target_uid::uuid;
END;
$acctdel$;

REVOKE ALL ON FUNCTION public.staff_delete_user_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_delete_user_account(text) TO authenticated;
