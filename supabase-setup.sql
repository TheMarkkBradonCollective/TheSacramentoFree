-- =========================================================
-- SACRAMENTO BUY NOTHING — FULL SUPABASE SETUP
-- Paste this entire file into: Supabase Dashboard → SQL → New query → Run
-- =========================================================

-- 1. User profiles
CREATE TABLE IF NOT EXISTS public.users (
  uid TEXT PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "photoURL" TEXT,
  email TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert and update" ON public.users;
CREATE POLICY "Allow insert and update" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 2. Item listings
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userDisplayName" TEXT NOT NULL,
  "userPhotoURL" TEXT,
  neighborhood TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read items" ON public.items;
CREATE POLICY "Allow public read items" ON public.items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write operations" ON public.items;
CREATE POLICY "Allow write operations" ON public.items FOR ALL USING (true) WITH CHECK (true);

-- Add imageUrl if the table was created from an older script without it
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE INDEX IF NOT EXISTS items_created_at_idx ON public.items ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS items_user_id_idx ON public.items ("userId");

-- 3. Chat rooms
CREATE TABLE IF NOT EXISTS public.chats (
  id TEXT PRIMARY KEY,
  "participantIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "participantNames" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "participantPhotos" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "lastMessageText" TEXT,
  "lastMessageAt" TIMESTAMPTZ DEFAULT NOW(),
  "lastMessageSenderId" TEXT,
  "itemId" TEXT,
  "itemTitle" TEXT
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read chats" ON public.chats;
CREATE POLICY "Allow public read chats" ON public.chats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write chats" ON public.chats;
CREATE POLICY "Allow write chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS chats_item_id_idx ON public.chats ("itemId");
CREATE INDEX IF NOT EXISTS chats_last_message_at_idx ON public.chats ("lastMessageAt" DESC);

-- 4. Chat messages
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read messages" ON public.messages;
CREATE POLICY "Allow public read messages" ON public.messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert messages" ON public.messages;
CREATE POLICY "Allow insert messages" ON public.messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow edit or update" ON public.messages;
CREATE POLICY "Allow edit or update" ON public.messages FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON public.messages ("chatId");
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages ("createdAt");

-- 5. Item votes (interested / not interested)
CREATE TABLE IF NOT EXISTS public.item_votes (
  "itemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "voteType" TEXT NOT NULL CHECK ("voteType" IN ('up', 'down')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY ("itemId", "userId")
);

ALTER TABLE public.item_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read item votes" ON public.item_votes;
CREATE POLICY "Allow read item votes" ON public.item_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write item votes" ON public.item_votes;
CREATE POLICY "Allow write item votes" ON public.item_votes FOR ALL USING (true);

-- 6. Item comments (public replies on listings)
CREATE TABLE IF NOT EXISTS public.item_comments (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read item comments" ON public.item_comments;
CREATE POLICY "Allow read item comments" ON public.item_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write item comments" ON public.item_comments;
CREATE POLICY "Allow write item comments" ON public.item_comments FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS item_comments_item_id_idx ON public.item_comments ("itemId");

-- 7. Private claim records (claimer identity not on public listings)
CREATE TABLE IF NOT EXISTS public.item_claims (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL UNIQUE,
  "giverUserId" TEXT NOT NULL,
  "claimerUserId" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read item claims" ON public.item_claims;
CREATE POLICY "Allow read item claims" ON public.item_claims FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write item claims" ON public.item_claims;
CREATE POLICY "Allow write item claims" ON public.item_claims FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS item_claims_claimer_idx ON public.item_claims ("claimerUserId");
CREATE INDEX IF NOT EXISTS item_claims_giver_idx ON public.item_claims ("giverUserId");

-- =========================================================
-- STORAGE: public bucket for listing photos
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read items bucket" ON storage.objects;
CREATE POLICY "Public read items bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'items');

DROP POLICY IF EXISTS "Public upload items bucket" ON storage.objects;
CREATE POLICY "Public upload items bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'items');

DROP POLICY IF EXISTS "Public update items bucket" ON storage.objects;
CREATE POLICY "Public update items bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'items');

DROP POLICY IF EXISTS "Public delete items bucket" ON storage.objects;
CREATE POLICY "Public delete items bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'items');

-- =========================================================
-- 8. REALTIME — live feed, chat, votes without page refresh
-- Run once in SQL Editor. Safe to re-run (skips tables already added).
-- =========================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'items', 'chats', 'messages', 'item_votes', 'item_comments', 'item_claims', 'users'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- =========================================================
-- OPTIONAL: set community director role (run after you sign up)
-- UPDATE public.users SET role = 'director' WHERE email = 'you@example.com';
-- =========================================================
