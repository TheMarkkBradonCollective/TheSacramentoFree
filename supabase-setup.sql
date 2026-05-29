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

-- Add columns that may be missing if the table was created from an older script
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "photoURL" TEXT;

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

-- giveaway = neighbor picked up a giveaway; request_fulfilled = neighbor helped close an ISO request
ALTER TABLE public.item_claims ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'giveaway';
ALTER TABLE public.item_claims DROP CONSTRAINT IF EXISTS item_claims_kind_check;
ALTER TABLE public.item_claims ADD CONSTRAINT item_claims_kind_check
  CHECK (kind IN ('giveaway', 'request_fulfilled'));

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

-- Profile avatars (dedicated bucket — run if profile photos fail to upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read avatars bucket" ON storage.objects;
CREATE POLICY "Public read avatars bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public upload avatars bucket" ON storage.objects;
CREATE POLICY "Public upload avatars bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public update avatars bucket" ON storage.objects;
CREATE POLICY "Public update avatars bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public delete avatars bucket" ON storage.objects;
CREATE POLICY "Public delete avatars bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

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
-- 9. AUTO-PROFILE TRIGGER
-- Whenever a user is created in auth.users, automatically create a matching
-- row in public.users so they are never "auth only" orphans.
-- Safe to re-run — uses CREATE OR REPLACE and IF NOT EXISTS.
-- =========================================================

-- Function called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    uid,
    "displayName",
    "photoURL",
    email,
    neighborhood,
    bio,
    "role",
    "createdAt"
  )
  VALUES (
    NEW.id::text,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'displayName'), ''),
      SPLIT_PART(NEW.email, '@', 1),
      'Neighbor'
    ),
    -- Default pixel-art avatar — the app will update this on first login
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=' || NEW.id::text,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'neighborhood'), ''),
      'Sacramento'
    ),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'bio', '')), ''),
    'user',
    NOW()
  )
  ON CONFLICT (uid) DO NOTHING;   -- never overwrite an existing profile
  RETURN NEW;
END;
$$;

-- Trigger on auth.users — fires after every INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =========================================================
-- 10. ONE-TIME BACKFILL — fixes users already in auth but missing from public.users
-- Run this once after adding the trigger above.
-- =========================================================
INSERT INTO public.users (
  uid,
  "displayName",
  "photoURL",
  email,
  neighborhood,
  "role",
  "createdAt"
)
SELECT
  au.id::text,
  COALESCE(
    NULLIF(TRIM(au.raw_user_meta_data->>'displayName'), ''),
    SPLIT_PART(au.email, '@', 1),
    'Neighbor'
  ),
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=' || au.id::text,
  au.email,
  COALESCE(
    NULLIF(TRIM(au.raw_user_meta_data->>'neighborhood'), ''),
    'Sacramento'
  ),
  'user',
  au.created_at
FROM auth.users au
WHERE au.id::text NOT IN (SELECT uid FROM public.users)
  AND au.email IS NOT NULL;

-- =========================================================
-- OPTIONAL: set community director role (run after you sign up)
-- UPDATE public.users SET role = 'director' WHERE email = 'you@example.com';
-- =========================================================
