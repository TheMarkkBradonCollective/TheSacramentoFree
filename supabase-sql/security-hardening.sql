-- =========================================================
-- SECURITY HARDENING — Sacramento Buy Nothing
-- Run once in Supabase Dashboard → SQL Editor (safe to re-run)
--
-- Replaces permissive USING(true) RLS policies with real access control.
-- After running, verify the app still works for neighbors, staff, and directors.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Security helper functions
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()::text;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE uid = auth.uid()::text),
    'user'
  );
$$;

CREATE OR REPLACE FUNCTION public.role_rank(role text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE role
    WHEN 'director' THEN 4
    WHEN 'city_manager' THEN 3
    WHEN 'admin' THEN 3
    WHEN 'city_administrator' THEN 2
    WHEN 'moderator' THEN 2
    WHEN 'city_moderator' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_role(role text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT role IN (
    'city_moderator', 'city_administrator', 'city_manager',
    'director', 'moderator', 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff_role(public.current_user_role());
$$;

CREATE OR REPLACE FUNCTION public.community_member_count()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.users;
$$;

CREATE OR REPLACE FUNCTION public.events_unlocked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.community_member_count() >= 1000;
$$;

GRANT EXECUTE ON FUNCTION public.community_member_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.events_unlocked() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('director');
$$;

CREATE OR REPLACE FUNCTION public.is_city_manager_or_director()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('city_manager', 'director', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(chat_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = chat_id
      AND "participantIds"::jsonb @> jsonb_build_array(auth.uid()::text)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_chat(chat_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    chat_id = 'community-global'
    OR (chat_id = 'community-staff' AND public.is_staff())
    OR public.is_chat_participant(chat_id);
$$;

CREATE OR REPLACE FUNCTION public.can_write_chat(chat_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    chat_id = 'community-global'
    OR (chat_id = 'community-staff' AND public.is_staff())
    OR public.is_chat_participant(chat_id);
$$;

-- Public profile view (no email) — use for neighbor lookups
CREATE OR REPLACE VIEW public.users_public
WITH (security_invoker = true) AS
SELECT
  uid,
  "displayName",
  "photoURL",
  neighborhood,
  bio,
  role,
  "accountStatus",
  "createdAt"
FROM public.users;

GRANT SELECT ON public.users_public TO authenticated;

-- ---------------------------------------------------------
-- 2. USERS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow public read users" ON public.users;
DROP POLICY IF EXISTS "Allow insert and update" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_staff" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_staff_moderate" ON public.users;
DROP POLICY IF EXISTS "users_director_role" ON public.users;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid()::text = uid);

CREATE POLICY "users_select_staff" ON public.users
  FOR SELECT USING (public.is_staff());

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid()::text = uid
    AND role = 'user'
    AND "accountStatus" = 'active'
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid()::text = uid)
  WITH CHECK (
    auth.uid()::text = uid
    AND role = (SELECT u.role FROM public.users u WHERE u.uid = auth.uid()::text)
    AND "accountStatus" = (SELECT u."accountStatus" FROM public.users u WHERE u.uid = auth.uid()::text)
    AND "suspendedUntil" IS NOT DISTINCT FROM (SELECT u."suspendedUntil" FROM public.users u WHERE u.uid = auth.uid()::text)
    AND "moderationNote" IS NOT DISTINCT FROM (SELECT u."moderationNote" FROM public.users u WHERE u.uid = auth.uid()::text)
  );

CREATE POLICY "users_staff_moderate" ON public.users
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

CREATE POLICY "users_director_role" ON public.users
  FOR UPDATE
  USING (public.is_director())
  WITH CHECK (public.is_director());

-- ---------------------------------------------------------
-- 3. ITEMS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow public read items" ON public.items;
DROP POLICY IF EXISTS "Allow write operations" ON public.items;
DROP POLICY IF EXISTS "items_select_authenticated" ON public.items;
DROP POLICY IF EXISTS "items_insert_own" ON public.items;
DROP POLICY IF EXISTS "items_update_own" ON public.items;
DROP POLICY IF EXISTS "items_delete_own" ON public.items;

CREATE POLICY "items_select_authenticated" ON public.items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_insert_own" ON public.items
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "items_update_own" ON public.items
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "items_delete_own" ON public.items
  FOR DELETE USING (auth.uid()::text = "userId");

-- ---------------------------------------------------------
-- 4. CHATS & MESSAGES
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow public read chats" ON public.chats;
DROP POLICY IF EXISTS "Allow write chats" ON public.chats;
DROP POLICY IF EXISTS "chats_select" ON public.chats;
DROP POLICY IF EXISTS "chats_insert" ON public.chats;
DROP POLICY IF EXISTS "chats_update" ON public.chats;

CREATE POLICY "chats_select" ON public.chats
  FOR SELECT USING (public.can_read_chat(id));

CREATE POLICY "chats_insert" ON public.chats
  FOR INSERT WITH CHECK (
    "participantIds"::jsonb @> jsonb_build_array(auth.uid()::text)
    OR id IN ('community-global', 'community-staff')
  );

CREATE POLICY "chats_update" ON public.chats
  FOR UPDATE USING (public.can_write_chat(id))
  WITH CHECK (public.can_write_chat(id));

DROP POLICY IF EXISTS "Allow public read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow edit or update" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;

CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (public.can_read_chat("chatId"));

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid()::text = "senderId"
    AND public.can_write_chat("chatId")
  );

CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE USING (auth.uid()::text = "senderId" OR public.is_staff());

-- ---------------------------------------------------------
-- 5. ITEM VOTES & COMMENTS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read item votes" ON public.item_votes;
DROP POLICY IF EXISTS "Allow write item votes" ON public.item_votes;
DROP POLICY IF EXISTS "item_votes_select" ON public.item_votes;
DROP POLICY IF EXISTS "item_votes_write_own" ON public.item_votes;

CREATE POLICY "item_votes_select" ON public.item_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "item_votes_write_own" ON public.item_votes
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Allow read item comments" ON public.item_comments;
DROP POLICY IF EXISTS "Allow write item comments" ON public.item_comments;
DROP POLICY IF EXISTS "item_comments_select" ON public.item_comments;
DROP POLICY IF EXISTS "item_comments_insert" ON public.item_comments;
DROP POLICY IF EXISTS "item_comments_delete_own" ON public.item_comments;

CREATE POLICY "item_comments_select" ON public.item_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "item_comments_insert" ON public.item_comments
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "item_comments_delete_own" ON public.item_comments
  FOR DELETE USING (auth.uid()::text = "userId" OR public.is_staff());

-- ---------------------------------------------------------
-- 6. ITEM CLAIMS & CLAIM REQUESTS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read item claims" ON public.item_claims;
DROP POLICY IF EXISTS "Allow write item claims" ON public.item_claims;
DROP POLICY IF EXISTS "item_claims_select" ON public.item_claims;
DROP POLICY IF EXISTS "item_claims_write" ON public.item_claims;

CREATE POLICY "item_claims_select" ON public.item_claims
  FOR SELECT USING (
    auth.uid()::text IN ("giverUserId", "claimerUserId")
    OR public.is_staff()
  );

CREATE POLICY "item_claims_write" ON public.item_claims
  FOR ALL USING (
    auth.uid()::text IN ("giverUserId", "claimerUserId")
  )
  WITH CHECK (
    auth.uid()::text IN ("giverUserId", "claimerUserId")
  );

DROP POLICY IF EXISTS "Allow read claim requests" ON public.item_claim_requests;
DROP POLICY IF EXISTS "Allow write claim requests" ON public.item_claim_requests;
DROP POLICY IF EXISTS "claim_requests_select" ON public.item_claim_requests;
DROP POLICY IF EXISTS "claim_requests_write" ON public.item_claim_requests;

CREATE POLICY "claim_requests_select" ON public.item_claim_requests
  FOR SELECT USING (
    auth.uid()::text IN ("giverUserId", "claimerUserId")
    OR public.is_staff()
  );

CREATE POLICY "claim_requests_write" ON public.item_claim_requests
  FOR ALL USING (
    auth.uid()::text IN ("giverUserId", "claimerUserId")
  )
  WITH CHECK (
    auth.uid()::text IN ("giverUserId", "claimerUserId")
  );

-- ---------------------------------------------------------
-- 7. USER BLOCKS & MESSAGE REQUESTS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read user blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Allow write user blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_select" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_write" ON public.user_blocks;

CREATE POLICY "user_blocks_select" ON public.user_blocks
  FOR SELECT USING (
    auth.uid()::text IN ("blockerUserId", "blockedUserId")
    OR public.is_staff()
  );

CREATE POLICY "user_blocks_write" ON public.user_blocks
  FOR ALL USING (auth.uid()::text = "blockerUserId")
  WITH CHECK (auth.uid()::text = "blockerUserId");

DROP POLICY IF EXISTS "Allow read message requests" ON public.message_requests;
DROP POLICY IF EXISTS "Allow write message requests" ON public.message_requests;
DROP POLICY IF EXISTS "message_requests_select" ON public.message_requests;
DROP POLICY IF EXISTS "message_requests_write" ON public.message_requests;

CREATE POLICY "message_requests_select" ON public.message_requests
  FOR SELECT USING (
    auth.uid()::text IN ("fromUserId", "toUserId")
    OR public.is_staff()
  );

CREATE POLICY "message_requests_write" ON public.message_requests
  FOR ALL USING (
    auth.uid()::text IN ("fromUserId", "toUserId")
  )
  WITH CHECK (
    auth.uid()::text IN ("fromUserId", "toUserId")
  );

-- ---------------------------------------------------------
-- 8. MODERATION, REPORTS, SUPPORT
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read moderation audit log" ON public.moderation_audit_log;
DROP POLICY IF EXISTS "Allow write moderation audit log" ON public.moderation_audit_log;
DROP POLICY IF EXISTS "moderation_audit_select" ON public.moderation_audit_log;
DROP POLICY IF EXISTS "moderation_audit_insert" ON public.moderation_audit_log;

CREATE POLICY "moderation_audit_select" ON public.moderation_audit_log
  FOR SELECT USING (public.is_staff());

CREATE POLICY "moderation_audit_insert" ON public.moderation_audit_log
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Allow read user reports" ON public.user_reports;
DROP POLICY IF EXISTS "Allow write user reports" ON public.user_reports;
DROP POLICY IF EXISTS "user_reports_select" ON public.user_reports;
DROP POLICY IF EXISTS "user_reports_insert" ON public.user_reports;
DROP POLICY IF EXISTS "user_reports_update_staff" ON public.user_reports;

CREATE POLICY "user_reports_select" ON public.user_reports
  FOR SELECT USING (
    auth.uid()::text = "reporterUserId"
    OR public.is_staff()
  );

CREATE POLICY "user_reports_insert" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid()::text = "reporterUserId");

CREATE POLICY "user_reports_update_staff" ON public.user_reports
  FOR UPDATE USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Allow read support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow write support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_select" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_write" ON public.support_tickets;

CREATE POLICY "support_tickets_select" ON public.support_tickets
  FOR SELECT USING (
    auth.uid()::text = "openerUserId"
    OR (public.is_staff() AND public.role_rank(public.current_user_role()) >= "minStaffRank")
  );

CREATE POLICY "support_tickets_write" ON public.support_tickets
  FOR ALL USING (
    auth.uid()::text = "openerUserId"
    OR public.is_staff()
  )
  WITH CHECK (
    auth.uid()::text = "openerUserId"
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "Allow read ticket messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Allow write ticket messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_select" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_write" ON public.support_ticket_messages;

CREATE POLICY "ticket_messages_select" ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = "ticketId"
        AND (
          t."openerUserId" = auth.uid()::text
          OR (public.is_staff() AND public.role_rank(public.current_user_role()) >= t."minStaffRank")
        )
    )
  );

CREATE POLICY "ticket_messages_write" ON public.support_ticket_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = "ticketId"
        AND (
          t."openerUserId" = auth.uid()::text
          OR public.is_staff()
        )
    )
  )
  WITH CHECK (
    auth.uid()::text = "senderUserId"
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = "ticketId"
        AND (
          t."openerUserId" = auth.uid()::text
          OR public.is_staff()
        )
    )
  );

-- ---------------------------------------------------------
-- 9. LISTING SUBITEMS, EVENTS, REVIEWS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read listing subitems" ON public.listing_subitems;
DROP POLICY IF EXISTS "Allow write listing subitems" ON public.listing_subitems;
DROP POLICY IF EXISTS "listing_subitems_select" ON public.listing_subitems;
DROP POLICY IF EXISTS "listing_subitems_write" ON public.listing_subitems;

CREATE POLICY "listing_subitems_select" ON public.listing_subitems
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "listing_subitems_write" ON public.listing_subitems
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = "itemId" AND i."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = "itemId" AND i."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Allow read community events" ON public.community_events;
DROP POLICY IF EXISTS "Allow write community events" ON public.community_events;
DROP POLICY IF EXISTS "community_events_select" ON public.community_events;
DROP POLICY IF EXISTS "community_events_write_own" ON public.community_events;
DROP POLICY IF EXISTS "community_events_insert" ON public.community_events;
DROP POLICY IF EXISTS "community_events_update" ON public.community_events;
DROP POLICY IF EXISTS "community_events_delete" ON public.community_events;

CREATE POLICY "community_events_select" ON public.community_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "community_events_insert" ON public.community_events
  FOR INSERT WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "community_events_update" ON public.community_events
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "community_events_delete" ON public.community_events
  FOR DELETE USING (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

DROP POLICY IF EXISTS "Allow read event rsvps" ON public.event_rsvps;
DROP POLICY IF EXISTS "Allow write event rsvps" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_select" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_write_own" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_insert" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_update" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_delete" ON public.event_rsvps;

CREATE POLICY "event_rsvps_select" ON public.event_rsvps
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_rsvps_insert" ON public.event_rsvps
  FOR INSERT WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_rsvps_update" ON public.event_rsvps
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_rsvps_delete" ON public.event_rsvps
  FOR DELETE USING (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

DROP POLICY IF EXISTS "Allow read event comments" ON public.event_comments;
DROP POLICY IF EXISTS "Allow write event comments" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_select" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_write_own" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_insert" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_update" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_delete" ON public.event_comments;

CREATE POLICY "event_comments_select" ON public.event_comments
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_comments_insert" ON public.event_comments
  FOR INSERT WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_comments_update" ON public.event_comments
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "event_comments_delete" ON public.event_comments
  FOR DELETE USING (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

DROP POLICY IF EXISTS "Allow read app reviews" ON public.app_reviews;
DROP POLICY IF EXISTS "Allow write app reviews" ON public.app_reviews;
DROP POLICY IF EXISTS "app_reviews_select" ON public.app_reviews;
DROP POLICY IF EXISTS "app_reviews_write_own" ON public.app_reviews;

CREATE POLICY "app_reviews_select" ON public.app_reviews
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "app_reviews_write_own" ON public.app_reviews
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------
-- 10. DIRECTOR / STAFF CONTENT
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read director message" ON public.director_message;
DROP POLICY IF EXISTS "Allow write director message" ON public.director_message;
DROP POLICY IF EXISTS "director_message_select" ON public.director_message;
DROP POLICY IF EXISTS "director_message_write" ON public.director_message;

CREATE POLICY "director_message_select" ON public.director_message
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "director_message_write" ON public.director_message
  FOR ALL USING (public.is_director())
  WITH CHECK (public.is_director());

DROP POLICY IF EXISTS "Allow read staff messages" ON public.staff_messages;
DROP POLICY IF EXISTS "Allow write staff messages" ON public.staff_messages;
DROP POLICY IF EXISTS "staff_messages_select" ON public.staff_messages;
DROP POLICY IF EXISTS "staff_messages_write" ON public.staff_messages;

CREATE POLICY "staff_messages_select" ON public.staff_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "staff_messages_write" ON public.staff_messages
  FOR ALL USING (
    public.is_staff() AND auth.uid()::text = "userId"
  )
  WITH CHECK (
    public.is_staff() AND auth.uid()::text = "userId"
  );

DROP POLICY IF EXISTS "Allow read app updates" ON public.app_updates;
DROP POLICY IF EXISTS "Allow write app updates" ON public.app_updates;
DROP POLICY IF EXISTS "app_updates_select" ON public.app_updates;
DROP POLICY IF EXISTS "app_updates_write" ON public.app_updates;

CREATE POLICY "app_updates_select" ON public.app_updates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "app_updates_write" ON public.app_updates
  FOR ALL USING (public.is_director())
  WITH CHECK (public.is_director());

-- help_announcements (optional table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_announcements') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow read help announcements" ON public.help_announcements';
    EXECUTE 'DROP POLICY IF EXISTS "Allow write help announcements" ON public.help_announcements';
    EXECUTE 'DROP POLICY IF EXISTS "help_announcements_select" ON public.help_announcements';
    EXECUTE 'DROP POLICY IF EXISTS "help_announcements_write" ON public.help_announcements';
    EXECUTE 'CREATE POLICY "help_announcements_select" ON public.help_announcements FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "help_announcements_write" ON public.help_announcements FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())';
  END IF;
END $$;

-- community_content_votes (optional table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_content_votes') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow read community content votes" ON public.community_content_votes';
    EXECUTE 'DROP POLICY IF EXISTS "Allow write community content votes" ON public.community_content_votes';
    EXECUTE 'DROP POLICY IF EXISTS "content_votes_select" ON public.community_content_votes';
    EXECUTE 'DROP POLICY IF EXISTS "content_votes_write" ON public.community_content_votes';
    EXECUTE 'CREATE POLICY "content_votes_select" ON public.community_content_votes FOR SELECT USING (auth.uid() IS NOT NULL)';
    EXECUTE 'CREATE POLICY "content_votes_write" ON public.community_content_votes FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId")';
  END IF;
END $$;

-- push_dispatch_log — service role only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_dispatch_log') THEN
    EXECUTE 'ALTER TABLE public.push_dispatch_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "push_dispatch_log_deny" ON public.push_dispatch_log';
    EXECUTE 'CREATE POLICY "push_dispatch_log_deny" ON public.push_dispatch_log FOR ALL USING (false)';
  END IF;
END $$;

-- ---------------------------------------------------------
-- 11. STORAGE — path-scoped uploads
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Public read items bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public upload items bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public update items bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public delete items bucket" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "items_storage_delete" ON storage.objects;

CREATE POLICY "items_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'items');

CREATE POLICY "items_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'items'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "items_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'items'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "items_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'items'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR public.is_staff()
    )
  );

DROP POLICY IF EXISTS "Public read avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public upload avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public update avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public delete avatars bucket" ON storage.objects;
DROP POLICY IF EXISTS "avatars_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_storage_delete" ON storage.objects;

CREATE POLICY "avatars_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------
-- 12. Lock down dangerous RPCs
-- ---------------------------------------------------------

REVOKE ALL ON FUNCTION public.purge_user_community_data(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_user_community_data(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.purge_user_community_data(text) FROM anon;

-- Director-only role changes via RPC (client cannot PATCH role after hardening)
CREATE OR REPLACE FUNCTION public.set_user_role(target_uid text, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  actor_role text;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO actor_role FROM public.users WHERE uid = actor_uid;
  IF actor_role IS DISTINCT FROM 'director' THEN
    RAISE EXCEPTION 'Director access required';
  END IF;

  IF new_role NOT IN ('user', 'city_moderator', 'city_administrator', 'city_manager', 'director') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF target_uid IS NULL OR target_uid = '' THEN
    RAISE EXCEPTION 'Target user required';
  END IF;

  UPDATE public.users SET role = new_role WHERE uid = target_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role(text, text) TO authenticated;
