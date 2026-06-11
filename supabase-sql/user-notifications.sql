-- =========================================================
-- USER NOTIFICATIONS INBOX (bell → Notifications tab)
-- Run once in Supabase SQL Editor after notifications-complete.sql
-- Safe to re-run
-- =========================================================
--
-- Stores what neighbors see under bell → Notifications (comments,
-- votes, claims, listing status, etc.). Push toggles stay under Alerts.
-- Rows are written by the server when activity is dispatched.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  "itemId" TEXT,
  "itemTitle" TEXT,
  "actorUserId" TEXT,
  "actorName" TEXT,
  "eventType" TEXT,
  tag TEXT,
  url TEXT,
  "readAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON public.user_notifications ("userId", "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_user_tag_unique
  ON public.user_notifications ("userId", tag)
  WHERE tag IS NOT NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
CREATE POLICY "Users read own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.user_notifications;
CREATE POLICY "Users mark own notifications read" ON public.user_notifications
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- Inserts use service role from /api/push (same as push_subscriptions).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
END $$;

-- Optional: changelog entry (bell → Updates)
INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES (
  '2026-06-11_user-notifications-inbox-table',
  '2026-06-11',
  'Notifications inbox is now logged in the database',
  'Bell → Notifications reads from user_notifications. Run supabase-sql/user-notifications.sql once, then new activity on your posts is stored automatically.',
  $detail$TABLE: user_notifications
• One row per neighbor per activity (comment, vote, claim, gift, status, etc.)
• Written by the server when push is dispatched (service role)
• Neighbors read their own rows under bell → Notifications
• Push toggles for these events remain under Alerts (last tab)

SQL TO RUN ONCE
supabase-sql/user-notifications.sql

After deploy, trigger a test comment or claim on your listing to see the first inbox row.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "updatedAt" = NOW();
