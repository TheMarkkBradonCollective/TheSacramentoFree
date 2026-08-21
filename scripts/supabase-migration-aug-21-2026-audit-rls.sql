-- Audit RLS fixes (Aug 21, 2026)
-- Run in Supabase SQL editor. Do not re-paste complete-schema.sql on production.

-- Neighbors can browse live listings; withdrawn/completed stay owner+staff only.
DROP POLICY IF EXISTS "items_select_authenticated" ON public.items;
CREATE POLICY "items_select_authenticated" ON public.items
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      status IN ('active', 'pending_pickup', 'on_hold')
      OR "userId" = auth.uid()::text
      OR public.is_staff()
    )
  );

-- Allow conversation participants (and staff) to delete chats.
DROP POLICY IF EXISTS "chats_delete" ON public.chats;
CREATE POLICY "chats_delete" ON public.chats
  FOR DELETE USING (public.can_write_chat(id) OR public.is_staff());

-- Neighbors can delete their own event comments even before Events unlocks.
DROP POLICY IF EXISTS "event_comments_delete" ON public.event_comments;
CREATE POLICY "event_comments_delete" ON public.event_comments
  FOR DELETE USING (
    auth.uid()::text = "userId"
    OR public.is_staff()
  );
