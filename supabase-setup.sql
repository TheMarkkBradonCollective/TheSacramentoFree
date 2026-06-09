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
  role TEXT NOT NULL DEFAULT 'user', -- user | city_moderator | city_administrator | city_manager | director
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
  "itemId" TEXT NOT NULL,
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

-- 8. User blocks (mutual invisibility — either direction hides both users from each other)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  "blockerUserId" TEXT NOT NULL,
  "blockedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY ("blockerUserId", "blockedUserId")
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read user blocks" ON public.user_blocks;
CREATE POLICY "Allow read user blocks" ON public.user_blocks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write user blocks" ON public.user_blocks;
CREATE POLICY "Allow write user blocks" ON public.user_blocks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks ("blockerUserId");
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks ("blockedUserId");

-- 9. Message requests (DM permission before opening a chat)
CREATE TABLE IF NOT EXISTS public.message_requests (
  id TEXT PRIMARY KEY,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "fromUserName" TEXT NOT NULL,
  "fromUserPhoto" TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.message_requests DROP CONSTRAINT IF EXISTS message_requests_status_check;
ALTER TABLE public.message_requests ADD CONSTRAINT message_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined'));

ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read message requests" ON public.message_requests;
CREATE POLICY "Allow read message requests" ON public.message_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write message requests" ON public.message_requests;
CREATE POLICY "Allow write message requests" ON public.message_requests FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS message_requests_to_idx ON public.message_requests ("toUserId", status);
CREATE INDEX IF NOT EXISTS message_requests_from_idx ON public.message_requests ("fromUserId", status);

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
-- 10. Staff account moderation (suspend / platform ban)
-- =========================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "accountStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "moderationNote" TEXT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
  CHECK ("accountStatus" IN ('active', 'suspended', 'banned'));

-- =========================================================
-- 11. Moderation audit log (director + city manager review)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.moderation_audit_log (
  id TEXT PRIMARY KEY,
  "actorUserId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "targetName" TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moderation_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read moderation audit log" ON public.moderation_audit_log;
CREATE POLICY "Allow read moderation audit log" ON public.moderation_audit_log FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write moderation audit log" ON public.moderation_audit_log;
CREATE POLICY "Allow write moderation audit log" ON public.moderation_audit_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS moderation_audit_created_idx ON public.moderation_audit_log ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS moderation_audit_target_idx ON public.moderation_audit_log ("targetUserId");

-- =========================================================
-- 12. User reports (one-way, no follow-up — all neighbors)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_reports (
  id TEXT PRIMARY KEY,
  "reporterUserId" TEXT NOT NULL,
  "reporterName" TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  "reportedUserId" TEXT,
  "reportedUserName" TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_status_check;
ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_status_check
  CHECK (status IN ('new', 'reviewed'));

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read user reports" ON public.user_reports;
CREATE POLICY "Allow read user reports" ON public.user_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write user reports" ON public.user_reports;
CREATE POLICY "Allow write user reports" ON public.user_reports FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS user_reports_created_idx ON public.user_reports ("createdAt" DESC);

-- =========================================================
-- 13. Support tickets (two-way help — mods+ for neighbors; higher tier for staff-opened)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  "openerUserId" TEXT NOT NULL,
  "openerName" TEXT NOT NULL,
  "openerRole" TEXT NOT NULL DEFAULT 'user',
  "minStaffRank" INTEGER NOT NULL DEFAULT 1,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  "closedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'closed'));

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read support tickets" ON public.support_tickets;
CREATE POLICY "Allow read support tickets" ON public.support_tickets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write support tickets" ON public.support_tickets;
CREATE POLICY "Allow write support tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS support_tickets_opener_idx ON public.support_tickets ("openerUserId");
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status, "updatedAt" DESC);

-- =========================================================
-- 14. Support ticket messages
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Allow read ticket messages" ON public.support_ticket_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Allow write ticket messages" ON public.support_ticket_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON public.support_ticket_messages ("ticketId", "createdAt");

ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- =========================================================
-- 15. Multi-item listings + contactless self-claim at pickup
-- =========================================================
ALTER TABLE public.item_claims DROP CONSTRAINT IF EXISTS item_claims_itemId_key;
ALTER TABLE public.item_claims ADD COLUMN IF NOT EXISTS "subItemId" TEXT;
ALTER TABLE public.item_claims ADD COLUMN IF NOT EXISTS "claimRequestId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS item_claims_subitem_unique
  ON public.item_claims ("itemId", "subItemId")
  WHERE "subItemId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS item_claims_single_item_unique
  ON public.item_claims ("itemId")
  WHERE "subItemId" IS NULL;

CREATE TABLE IF NOT EXISTS public.listing_subitems (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  label TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  "claimedAt" TIMESTAMPTZ
);

ALTER TABLE public.listing_subitems DROP CONSTRAINT IF EXISTS listing_subitems_status_check;
ALTER TABLE public.listing_subitems ADD CONSTRAINT listing_subitems_status_check
  CHECK (status IN ('available', 'claimed'));

ALTER TABLE public.listing_subitems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read listing subitems" ON public.listing_subitems;
CREATE POLICY "Allow read listing subitems" ON public.listing_subitems FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write listing subitems" ON public.listing_subitems;
CREATE POLICY "Allow write listing subitems" ON public.listing_subitems FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS listing_subitems_item_idx ON public.listing_subitems ("itemId", "sortOrder");

CREATE TABLE IF NOT EXISTS public.item_claim_requests (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "giverUserId" TEXT NOT NULL,
  "claimerUserId" TEXT NOT NULL,
  "claimerName" TEXT NOT NULL,
  "subItemIds" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "chatId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_claim_requests DROP CONSTRAINT IF EXISTS item_claim_requests_status_check;
ALTER TABLE public.item_claim_requests ADD CONSTRAINT item_claim_requests_status_check
  CHECK (status IN ('pending', 'confirmed', 'rejected'));

ALTER TABLE public.item_claim_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read claim requests" ON public.item_claim_requests;
CREATE POLICY "Allow read claim requests" ON public.item_claim_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write claim requests" ON public.item_claim_requests;
CREATE POLICY "Allow write claim requests" ON public.item_claim_requests FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS item_claim_requests_chat_idx ON public.item_claim_requests ("chatId", status);
CREATE INDEX IF NOT EXISTS item_claim_requests_item_idx ON public.item_claim_requests ("itemId", status);

-- =========================================================
-- 16. Block reason + proof + staff auto-report fields
-- =========================================================
ALTER TABLE public.user_blocks ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.user_blocks ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT;

ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT;
ALTER TABLE public.user_reports ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_source_check;
ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_source_check
  CHECK (source IN ('manual', 'block'));

-- =========================================================
-- 17. Community events (free gatherings only)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.community_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  "eventStartAt" TIMESTAMPTZ NOT NULL,
  "eventEndAt" TIMESTAMPTZ,
  "userId" TEXT NOT NULL,
  "userDisplayName" TEXT NOT NULL,
  "userPhotoURL" TEXT,
  "isFree" BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  "imageUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.community_events DROP CONSTRAINT IF EXISTS community_events_status_check;
ALTER TABLE public.community_events ADD CONSTRAINT community_events_status_check
  CHECK (status IN ('active', 'cancelled'));

ALTER TABLE public.community_events DROP CONSTRAINT IF EXISTS community_events_free_only;
ALTER TABLE public.community_events ADD CONSTRAINT community_events_free_only
  CHECK ("isFree" = true);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read community events" ON public.community_events;
CREATE POLICY "Allow read community events" ON public.community_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write community events" ON public.community_events;
CREATE POLICY "Allow write community events" ON public.community_events FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS community_events_start_idx ON public.community_events ("eventStartAt" ASC);
CREATE INDEX IF NOT EXISTS community_events_user_idx ON public.community_events ("userId");

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rsvpStatus" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY ("eventId", "userId")
);

ALTER TABLE public.event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_status_check;
ALTER TABLE public.event_rsvps ADD CONSTRAINT event_rsvps_status_check
  CHECK ("rsvpStatus" IN ('going', 'maybe', 'not_going'));

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read event rsvps" ON public.event_rsvps;
CREATE POLICY "Allow read event rsvps" ON public.event_rsvps FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write event rsvps" ON public.event_rsvps;
CREATE POLICY "Allow write event rsvps" ON public.event_rsvps FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON public.event_rsvps ("eventId");

CREATE TABLE IF NOT EXISTS public.event_comments (
  id TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read event comments" ON public.event_comments;
CREATE POLICY "Allow read event comments" ON public.event_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write event comments" ON public.event_comments;
CREATE POLICY "Allow write event comments" ON public.event_comments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS event_comments_event_idx ON public.event_comments ("eventId");

-- =========================================================
-- 18. Director message (editable by director in-app)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.director_message (
  id TEXT PRIMARY KEY DEFAULT 'main',
  "directorName" TEXT NOT NULL,
  "directorTitle" TEXT NOT NULL,
  headline TEXT NOT NULL,
  goal TEXT NOT NULL,
  promises JSONB NOT NULL DEFAULT '[]'::jsonb,
  closing TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedByUserId" TEXT
);

ALTER TABLE public.director_message ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read director message" ON public.director_message;
CREATE POLICY "Allow read director message" ON public.director_message FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write director message" ON public.director_message;
CREATE POLICY "Allow write director message" ON public.director_message FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.director_message (
  id, "directorName", "directorTitle", headline, goal, promises, closing
)
VALUES (
  'main',
  'Markeith White',
  'Buy Nothing Director',
  'A note from your director',
  'Sacramento Buy Nothing exists so neighbors can give freely, ask kindly, and keep good things out of the landfill — with no money involved. That is the goal, plain and simple.',
  '["This app is 100% free — always.","No ads. Ever.","I keep you in mind with every feature I build.","I do not want your information for anything beyond making the community work, and I will never sell it."]'::jsonb,
  'Thank you for being part of this community.'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 18b. Staff messages (one published note per staff member)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.staff_messages (
  "userId" TEXT PRIMARY KEY,
  "staffName" TEXT NOT NULL,
  "staffTitle" TEXT NOT NULL,
  headline TEXT NOT NULL,
  goal TEXT NOT NULL,
  promises JSONB NOT NULL DEFAULT '[]'::jsonb,
  closing TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedByUserId" TEXT
);

ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read staff messages" ON public.staff_messages;
CREATE POLICY "Allow read staff messages" ON public.staff_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write staff messages" ON public.staff_messages;
CREATE POLICY "Allow write staff messages" ON public.staff_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS staff_messages_updated_idx ON public.staff_messages ("updatedAt" DESC);

-- =========================================================
-- 18c. App updates (director changelog — editable in app)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_updates (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  detail TEXT,
  "directorName" TEXT NOT NULL,
  "directorTitle" TEXT NOT NULL,
  "postedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read app updates" ON public.app_updates;
CREATE POLICY "Allow read app updates" ON public.app_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write app updates" ON public.app_updates;
CREATE POLICY "Allow write app updates" ON public.app_updates FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS app_updates_date_idx ON public.app_updates (date DESC, "updatedAt" DESC);

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
)
VALUES (
  'update_staff_messages',
  '2026-06-09',
  'Each staff member writes their own message',
  'Team notes are personal now — every staff member publishes their own welcome message on home and reviews.',
  'Instead of one shared city manager note, each moderator, administrator, and city manager can write and save their own message from Help & support. Published messages appear in the home carousel and on the reviews page. The director still has a separate director note.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 19. App reviews (0–5 stars, half-star steps, one per user)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.app_reviews (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL,
  text TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_reviews DROP CONSTRAINT IF EXISTS app_reviews_rating_range;
ALTER TABLE public.app_reviews ADD CONSTRAINT app_reviews_rating_range
  CHECK (rating >= 0 AND rating <= 5 AND (rating * 2)::int = (rating * 2));

ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read app reviews" ON public.app_reviews;
CREATE POLICY "Allow read app reviews" ON public.app_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write app reviews" ON public.app_reviews;
CREATE POLICY "Allow write app reviews" ON public.app_reviews FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS app_reviews_created_idx ON public.app_reviews ("createdAt" DESC);

-- =========================================================
-- 8. REALTIME — live feed, chat, votes without page refresh
-- Run once in SQL Editor. Safe to re-run (skips tables already added).
-- =========================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'items', 'chats', 'messages', 'item_votes', 'item_comments', 'item_claims', 'listing_subitems', 'item_claim_requests', 'users', 'user_blocks', 'message_requests', 'moderation_audit_log', 'user_reports', 'support_tickets', 'support_ticket_messages', 'community_events', 'event_rsvps', 'event_comments', 'director_message', 'staff_messages', 'app_updates', 'app_reviews'
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
-- 18. Account deletion (self-service + staff) — full data purge
-- Prefer running supabase-sql/account-deletion.sql in SQL Editor (single paste).
-- =========================================================
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

-- =========================================================
-- OPTIONAL: set community director role (run after you sign up)
-- UPDATE public.users SET role = 'director' WHERE email = 'you@example.com';
--
-- OPTIONAL: migrate legacy role slugs (moderator → city_administrator, admin → city_manager)
-- UPDATE public.users SET role = 'city_administrator' WHERE role = 'moderator';
-- UPDATE public.users SET role = 'city_manager' WHERE role = 'admin';
-- =========================================================

-- =========================================================
-- 18. Web push subscriptions + notification preferences
-- (also in supabase-sql/push-notifications.sql)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions ("userId");
CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions (endpoint);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  "userId" TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  claims BOOLEAN NOT NULL DEFAULT true,
  gifts BOOLEAN NOT NULL DEFAULT true,
  comments BOOLEAN NOT NULL DEFAULT true,
  "nearbyListings" BOOLEAN NOT NULL DEFAULT true,
  requests BOOLEAN NOT NULL DEFAULT true,
  announcements BOOLEAN NOT NULL DEFAULT true,
  "pickupReminders" BOOLEAN NOT NULL DEFAULT true,
  "newListings" BOOLEAN NOT NULL DEFAULT true,
  "accountUpdates" BOOLEAN NOT NULL DEFAULT true,
  "nearbyRadiusMiles" INTEGER NOT NULL DEFAULT 10,
  "followedCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_radius_check
    CHECK ("nearbyRadiusMiles" IN (0, 5, 10, 25, 50))
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");
