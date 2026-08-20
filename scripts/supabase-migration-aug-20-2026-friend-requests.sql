-- Friend requests (mutual connection before "Friends" feed scope) — Aug 20, 2026
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id TEXT PRIMARY KEY,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "fromUserName" TEXT NOT NULL,
  "fromUserPhoto" TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_status_check;
ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined'));

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS friend_requests_to_idx ON public.friend_requests ("toUserId", status);
CREATE INDEX IF NOT EXISTS friend_requests_from_idx ON public.friend_requests ("fromUserId", status);

DROP POLICY IF EXISTS "friend_requests_select" ON public.friend_requests;
CREATE POLICY "friend_requests_select" ON public.friend_requests
  FOR SELECT USING (
    auth.uid()::text IN ("fromUserId", "toUserId")
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "friend_requests_write" ON public.friend_requests;
CREATE POLICY "friend_requests_write" ON public.friend_requests
  FOR ALL USING (
    auth.uid()::text IN ("fromUserId", "toUserId")
  )
  WITH CHECK (
    auth.uid()::text IN ("fromUserId", "toUserId")
  );
