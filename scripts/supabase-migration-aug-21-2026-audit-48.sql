-- Audit 48 cascade deletes (Aug 21, 2026)
-- Run in Supabase SQL editor. Do not re-paste complete-schema.sql on production.
-- Lets a listing/event owner delete their post even when neighbors left comments,
-- votes, or RSVPs the client RLS cannot remove.

CREATE OR REPLACE FUNCTION public.delete_own_listing(target_item_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dellisting$
DECLARE
  owner_id text;
BEGIN
  IF target_item_id IS NULL OR target_item_id = '' OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT "userId" INTO owner_id FROM public.items WHERE id = target_item_id;
  IF owner_id IS NULL THEN
    RETURN false;
  END IF;
  IF owner_id <> auth.uid()::text AND NOT public.is_staff() THEN
    RETURN false;
  END IF;

  DELETE FROM public.go_get_live_locations
  WHERE "sessionId" IN (SELECT id FROM public.go_get_sessions WHERE "itemId" = target_item_id);
  DELETE FROM public.go_get_fulfiller_live_locations
  WHERE "sessionId" IN (SELECT id FROM public.go_get_sessions WHERE "itemId" = target_item_id);
  DELETE FROM public.go_get_location_trail
  WHERE "sessionId" IN (SELECT id FROM public.go_get_sessions WHERE "itemId" = target_item_id);
  UPDATE public.go_get_sessions
  SET status = 'cancelled',
      "cancelledAt" = NOW(),
      "cancelReason" = 'Listing deleted',
      "updatedAt" = NOW()
  WHERE "itemId" = target_item_id
    AND status NOT IN ('completed', 'cancelled', 'expired', 'disputed');

  DELETE FROM public.item_claim_requests WHERE "itemId" = target_item_id;
  DELETE FROM public.item_claims WHERE "itemId" = target_item_id;
  DELETE FROM public.listing_subitems WHERE "itemId" = target_item_id;
  DELETE FROM public.item_votes WHERE "itemId" = target_item_id;
  DELETE FROM public.item_comments WHERE "itemId" = target_item_id;
  DELETE FROM public.saved_items WHERE "itemId" = target_item_id;

  DELETE FROM public.messages
  WHERE "chatId" IN (SELECT id FROM public.chats WHERE "itemId" = target_item_id);
  DELETE FROM public.chats WHERE "itemId" = target_item_id;

  DELETE FROM public.items WHERE id = target_item_id;
  RETURN true;
END;
$dellisting$;

REVOKE ALL ON FUNCTION public.delete_own_listing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_listing(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_event(target_event_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $delevent$
DECLARE
  owner_id text;
BEGIN
  IF target_event_id IS NULL OR target_event_id = '' OR auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT "userId" INTO owner_id FROM public.community_events WHERE id = target_event_id;
  IF owner_id IS NULL THEN
    RETURN false;
  END IF;
  IF owner_id <> auth.uid()::text AND NOT public.is_staff() THEN
    RETURN false;
  END IF;

  DELETE FROM public.event_rsvps WHERE "eventId" = target_event_id;
  DELETE FROM public.event_comments WHERE "eventId" = target_event_id;
  DELETE FROM public.community_events WHERE id = target_event_id;
  RETURN true;
END;
$delevent$;

REVOKE ALL ON FUNCTION public.delete_own_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_event(text) TO authenticated;
