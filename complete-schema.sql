-- =========================================================
-- SACRAMENTO BUY NOTHING — COMPLETE DATABASE SETUP
-- Paste this entire file into: Supabase Dashboard → SQL → New query → Run
--
-- Safe to re-run: IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS
-- Run this whenever the app schema changes — keeps the whole site intact.
--
-- Milestones enforced in DB:
--   Awards unlock at 500 neighbors  (awards_unlocked)
--   Events unlock at 500 neighbors  (events_unlocked)
--
-- Go Get / pickup coordination:
--   users.goGetEnabled (default true) — neighbors may opt out in Account
--   settings to list + chat without app-supported handoff. Live Go Get /
--   Drop off / Meet up / claim-at-pin still require the installed app
--   (PWA or APK) with notifications on (enforced in app code).
--
-- Incremental migrations (existing production DBs — run these, do not
-- replace this file):
--   scripts/supabase-migration-july-2026.sql
--   scripts/supabase-migration-event-series.sql
--   scripts/supabase-migration-aug-18-2026-outage.sql
-- Neighbor Updates/News copy: shared/changelogSeed.ts
--   (cron /api/cron/publish-changelog upserts seeds daily at 40 23 * * *)
-- =========================================================

-- =========================================================
-- TABLES, STORAGE, TRIGGERS
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
  "goGetEnabled" BOOLEAN NOT NULL DEFAULT true, -- false = opt out of Go Get / pickup coordination
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns that may be missing if the table was created from an older script
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "photoURL" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMPTZ;
-- Opt-out of Go Get / Drop off / Meet up / claim-at-pin (listing + chat still work).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "goGetEnabled" BOOLEAN NOT NULL DEFAULT true;
-- Staff: official staff mode vs neighbor mode for community participation.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "staffInteractionMode" TEXT NOT NULL DEFAULT 'staff';
-- Go Get ring timeout, scheduling, and pickup coordination preferences (Aug 20, 2026)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "pickupAvailability" JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "goGetRingDurationSeconds" INTEGER NOT NULL DEFAULT 140;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "goGetRingPattern" TEXT NOT NULL DEFAULT 'ring';
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_go_get_ring_duration_check;
ALTER TABLE public.users ADD CONSTRAINT users_go_get_ring_duration_check
  CHECK ("goGetRingDurationSeconds" >= 10 AND "goGetRingDurationSeconds" <= 140);
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_go_get_ring_pattern_check;
ALTER TABLE public.users ADD CONSTRAINT users_go_get_ring_pattern_check
  CHECK ("goGetRingPattern" IN ('single_beep', 'double_beep', 'triple_beep', 'ring', 'vibrate', 'vibrate_only'));

CREATE INDEX IF NOT EXISTS users_last_active_at_idx ON public.users ("lastActiveAt" DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
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
-- 6. Item comments (public replies on listings)
CREATE TABLE IF NOT EXISTS public.item_comments (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;
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
  CHECK (kind IN ('giveaway', 'request_fulfilled', 'trade_completed'));

ALTER TABLE public.item_claims ENABLE ROW LEVEL SECURITY;
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
  CHECK ("accountStatus" IN ('active', 'suspended', 'banned', 'locked'));
-- 'locked' = automatic at 6 counted "Go Get" violation strikes. Unlike 'suspended'
-- (time-based, auto-lifts) this always requires a city_administrator+ to review and
-- lift manually — see staffUnlockUser() and the Violations section below.

-- =========================================================
-- 11. Moderation audit log (director + city manager review)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.moderation_audit_log (
  id TEXT PRIMARY KEY,
  "actorUserId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT,
  "targetUserId" TEXT NOT NULL,
  "targetName" TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.moderation_audit_log ADD COLUMN IF NOT EXISTS "actorRole" TEXT;

ALTER TABLE public.moderation_audit_log ENABLE ROW LEVEL SECURITY;
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
  CHECK (status IN ('available', 'pending_pickup', 'claimed'));

ALTER TABLE public.listing_subitems ENABLE ROW LEVEL SECURITY;
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
CREATE INDEX IF NOT EXISTS item_claim_requests_chat_idx ON public.item_claim_requests ("chatId", status);
CREATE INDEX IF NOT EXISTS item_claim_requests_item_idx ON public.item_claim_requests ("itemId", status);

-- Pickup attribution for quick-claim (off-app channels + optional neighbor credit)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "pickupAttributionType" TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "pickupAttributionUserId" TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS "pickupAttributionLabel" TEXT;
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_pickup_attribution_type_check;
ALTER TABLE public.items ADD CONSTRAINT items_pickup_attribution_type_check
  CHECK (
    "pickupAttributionType" IS NULL
    OR "pickupAttributionType" IN ('app_user', 'reddit', 'buynothing_project', 'facebook_group', 'other')
  );

CREATE TABLE IF NOT EXISTS public.facebook_pickup_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  "useCount" INTEGER NOT NULL DEFAULT 1,
  "lastUsedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.facebook_pickup_groups ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS facebook_pickup_groups_use_idx
  ON public.facebook_pickup_groups ("useCount" DESC, "lastUsedAt" DESC);

-- Backfill quick-completed listings with no app claim record
UPDATE public.items i
SET
  "pickupAttributionType" = 'other',
  "pickupAttributionLabel" = 'Other',
  "updatedAt" = NOW()
WHERE i.status = 'completed'
  AND i."pickupAttributionType" IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.item_claims c WHERE c."itemId" = i.id);

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
-- 500-member events unlock RLS (included in complete-schema.sql).
--
-- Repeat events: multiple rows can share seriesId (same venue/details,
-- different eventStartAt/eventEndAt). RSVPs and comments stay per row.
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
  "hostedBy" TEXT,
  "locationLat" DOUBLE PRECISION,
  "locationLng" DOUBLE PRECISION,
  "isFree" BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'upcoming',
  "imageUrl" TEXT,
  "seriesId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "hostedBy" TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS "seriesId" TEXT;

ALTER TABLE public.community_events DROP CONSTRAINT IF EXISTS community_events_status_check;
UPDATE public.community_events SET status = 'upcoming' WHERE status = 'active';
UPDATE public.community_events
  SET status = 'past'
  WHERE status IN ('active', 'upcoming')
    AND "eventStartAt" < NOW() - INTERVAL '3 hours';
ALTER TABLE public.community_events ADD CONSTRAINT community_events_status_check
  CHECK (status IN ('upcoming', 'past', 'cancelled'));

ALTER TABLE public.community_events DROP CONSTRAINT IF EXISTS community_events_free_only;
ALTER TABLE public.community_events ADD CONSTRAINT community_events_free_only
  CHECK ("isFree" = true);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS community_events_start_idx ON public.community_events ("eventStartAt" ASC);
CREATE INDEX IF NOT EXISTS community_events_user_idx ON public.community_events ("userId");
CREATE INDEX IF NOT EXISTS community_events_series_idx ON public.community_events ("seriesId")
  WHERE "seriesId" IS NOT NULL;

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
  CHECK ("rsvpStatus" IN ('going', 'maybe', 'not_going', 'gone', 'missed'));

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON public.event_rsvps ("eventId");

CREATE TABLE IF NOT EXISTS public.event_comments (
  id TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "postedAsNeighbor" BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS event_comments_event_idx ON public.event_comments ("eventId");

-- =========================================================
-- 17b. Events unlock (500 neighbors)
-- =========================================================

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
CREATE INDEX IF NOT EXISTS staff_messages_updated_idx ON public.staff_messages ("updatedAt" DESC);

-- 18b2. Staff applications (table + RPCs live after set_user_role so role_rank exists).

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

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
)
VALUES
(
  '2026-07-08_go-get-pickup',
  '2026-07-08',
  'Go Get — live pickup coordination',
  'Navigate is now Go Get: confirm pickup intent, share live location, chat along the way, and report no-shows.',
  'Tap Go Get on a giveaway, Looking, or Trade listing to start a pickup session. The poster gets notified and can share when they are available. Once you are both ready, live GPS tracking shows the route and ETA. Posters can optionally share their live location during active pickup so you see both the listed pin and where they actually are. A safety confirmation explains location sharing before any trip starts. Six confirmed violations can lock an account — staff review appeals in the moderation panel.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-08_navigation-polish',
  '2026-07-08',
  'Smoother turn-by-turn navigation',
  'Routes stop flashing, GPS twitches less, and voice reads your neighbor and item when a Go Get trip starts.',
  'Navigation got a stability pass: the route line no longer flickers on each GPS update, map invalidation is debounced, and the overview fits the visible map area above the bottom sheet. When you start Go Get navigation, voice says who you are meeting and what you are picking up, then reads pickup instructions when available. Instant curb or porch pickups skip the poster notification step.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-08_map-listings-without-location',
  '2026-07-08',
  'Listings without GPS stay in the list only',
  'Items and events with no set location no longer appear as map pins — they remain in the feed and list views.',
  'The map header now shows how many listings are in the area versus how many have an exact pin. Posts without coordinates still show up everywhere else; they just will not clutter the map with guessed positions.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-08_pickup-attribution',
  '2026-07-08',
  'Who picked it up? — quick-claim credit',
  'When you mark something claimed outside chat, we ask who picked it up: Reddit, Buy Nothing Project, Facebook group, a neighbor, or Other.',
  'If you complete a listing without going through the in-app claim flow, a short prompt lets you credit Reddit, the Buy Nothing Project, a saved Facebook group, a neighbor on the app, or Other. You can skip and edit later on the completed post. Older completed listings were backfilled as Other.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-08_messages-polish',
  '2026-07-08',
  'Messages UI matches the rest of the app',
  'Chat inbox, thread headers, and action chips got softer styling to line up with the app design language.',
  'The Messages tab uses the same rounded cards, chip-style action buttons, and compose tray as the rest of Sacramento Buy Nothing. Go Get actions live in the chip row when a Looking or Trade chat is active.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-08_notifications-audit',
  '2026-07-08',
  'Notification delivery audit',
  'Fewer duplicate pushes, clearer listing-status copy, and inbox icons for Go Get and trade events.',
  'We audited every notification path: moderation actions no longer double-fire from client and webhook, trade completion copy matches giveaway wording, redundant listing_status alerts on pending pickup were removed, and vote notifications respect a short cooldown. The bell inbox shows clearer icons for new notification types.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-08_map-route-fit',
  '2026-07-08',
  'Map route fits above the bottom card',
  'When you select a listing on the map, the route zooms to the space above the detail card until you pan or zoom yourself.',
  'Selecting a pin on the map auto-fits the route in the visible area above the bottom sheet. Resize the card or rotate your phone and the fit recalculates. Pan or zoom the map yourself to take over.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-08_interactive-exchange',
  '2026-07-08',
  'Major interactive upgrades — the app comes on the exchange with you',
  'I shipped major interactive changes so Sacramento Buy Nothing can walk with you through every neighborly exchange — map, pickup, and curb alerts included.',
  'What is new:

• **Homepage taps work again** — buttons and links on the public site respond reliably.
• **More on the map** — exact GPS pins plus neighborhood markers when only an area is set, so more posts show up where you are browsing.
• **The right action for each post type** — **Go to** for curb alerts, **Drop off** for Looking requests, **Meet up** for trades, and **Go Get** for other giveaways.
• **Curb alert pickup at the pin** — when you are at the location, you can optionally notify the poster you picked up.
• **One item per trip on multi-item posts** — pick the item you took; the poster confirms or taps **Not them** to put that item back up for others.

The app and website are meant to stay with you from browsing to handoff. Try the map and let me know how it feels.

— Mark',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
)
VALUES
(
  '2026-07-26_android-apk-1-1-0',
  '2026-07-26',
  'Android APK v1.1.0 — download works from the site',
  'The Android download was broken (private GitHub link 404). APK v1.1.0 now lives on the site — open Download and grab it straight from sacramentobuynothing.com.',
  $detail$What you will notice:
• Home and Download show APK + home-screen install options side by side.
• The Download page compares your installed version with the latest APK.
• Sideload file: https://sacramentobuynothing.com/downloads/sac-buy-nothing.apk

How to install:
• Open sacramentobuynothing.com/download (or Home → Download).
• Tap Download APK and allow install from your browser or Files if Android asks.
• Already on an older APK? Install 1.1.0 over it to get the latest build.

This build includes the latest feed, map, Go Get, and staff tools from today.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_feed-loading-fix',
  '2026-07-26',
  'Feed no longer sticks on Loading community listings',
  'A few neighbors hit a hang where the feed never finished loading. That path is fixed — listings show even when the network is slow.',
  $detail$What changed:
• Slow Supabase responses no longer leave the feed on a forever spinner.
• Empty vs still-loading states are clearer on mobile and desktop.
• The mobile footer stays pinned while the feed settles.

If you still see a blank feed, pull to refresh once — you should get listings or a clear empty state.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_events-unlock-500',
  '2026-07-26',
  'Community events unlock at 500 neighbors',
  'Events open for the whole community at 500 members now (was 1,000). Staff can still post and browse early.',
  $detail$When we hit 500 neighbors, everyone can post and RSVP to free community gatherings. Until then, staff can still create events so we are ready for launch day.

Find Events in the sidebar / tabs, or filter the map to Events once unlocked.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_staff-listings-events',
  '2026-07-26',
  'Staff Listings Management shows events + every listing type',
  'Staff Listings Management now loads giveaways, Looking, Trade, and community events together — with filters, cancel/delete for events, and open-event from the panel.',
  $detail$For staff:
• Open Staff → Listings.
• Filter by type (giveaway, looking, trade, event) or status.
• Cancel or delete community events in the same place you moderate posts.
• View an event or listing without leaving the panel.

Neighbors are not affected — this is a moderation tooling update.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_staff-goget-escalation',
  '2026-07-26',
  'Staff can manage live Go Get sessions and escalate violations',
  'Meet Records lets staff cancel, expire, dispute, or complete live pickups — and escalate to a violation in one step. The Violations queue defaults to open reports with accused names and review notes.',
  $detail$For staff:
• Staff → Meet Records → open a live session.
• Cancel, expire, dispute, or mark complete when neighbors need help closing a pickup.
• Escalate to violation closes the session and files the report together.
• Linked violations jump into Go Get Violations; the open queue shows pending reports first.

Neighbors:
• Six confirmed strikes can still lock an account; appeals stay under staff review.
• Meet in well-lit public spots and use in-app chat when you can.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_shell-download-home',
  '2026-07-26',
  'New shell layout + Download on the home page',
  'Desktop got a real sidebar workspace, tablet an icon rail, and mobile a cleaner staff/community shell. Home now has clear APK and home-screen download buttons.',
  $detail$What you will notice:
• Desktop: sidebar + dashboard rail instead of the old top-only chrome.
• Tablet: permanent icon rail that is not just a skinny desktop.
• Mobile: role-accent header and a clearer path into staff tools when you have them.
• Home hero: Download APK and Add to home screen without hunting through Account.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_goget-app-only',
  '2026-07-26',
  'Go Get & pickup coordination — installed app + notifications required',
  'Go Get, Drop off, Meet up, and claim-at-pin now only work in the installed app (APK or Add to Home Screen) with notifications on. Prefer chat-only? Opt out in Account settings.',
  $detail$What changed:
• Pickup coordination needs the installed app — not a regular browser tab.
• Notifications must be enabled so both neighbors get handoff alerts.
• Account → Go Get & pickup coordination lets you opt out anytime.
• Opted out? You still list and message as usual — just without live tracking and handoff prompts.

Install from sacramentobuynothing.com/download, turn on alerts in the bell, and you are set.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
)
VALUES (
  '2026-08-18_login-crash-fix',
  '2026-08-18',
  'Sign-in is fixed — website and app are back',
  'After login, the website and Android app crashed on “Something went wrong.” That bug is fixed. Sign in again and you should land on the map. A new APK is on the Download page.',
  $detail$WHAT NEIGHBORS SEE
If you signed in this morning and saw “Something went wrong,” that was on us. Sign-in is working again on the website and in the Android app.

You can keep using the same app you already have. Open it again, or refresh the website, then sign in as usual. If the error is still sitting on the screen, tap Sign out, then sign back in. New APK: https://www.sacramentobuynothing.com/download

Sorry for the scare. Thank you for staying with Sacramento Buy Nothing.

— Mark

WHERE TO LOOK IN CODE
- src/components/ChatSystem.tsx — restore the React hooks import (useState, useEffect, useRef, useCallback, useMemo). ChatSystem still mounts after login even when you are on Map or Stuff, so a missing hook name crashes the whole signed-in app.
- src/components/AppErrorBoundary.tsx — Sign out clears the cached session, calls supabase.auth.signOut(), then sends people home. Without that, a crash after login loops because the session is still saved.
- src/App.tsx — /updates, /news, and /announcements keep the Notifications hub instead of being overwritten by the last Map/Events tab.
- src/lib/pushDeepLink.ts — /news, /announcements, and /notifications/updates aliases for the in-app tabs.
- android/app/build.gradle + public/android-version.json — beta 0.1.0.0010 (versionCode 10). Existing Capacitor APKs still load the live site, so reopening the old app also picks up the web fix.
- shared/changelogSeed.ts + complete-schema.sql — this neighbor note and the matching News post. Cron /api/cron/publish-changelog upserts seeds (schedule 40 23 * * *).
- scripts/supabase-migration-aug-18-2026-outage.sql — paste into the Supabase SQL editor if you need the rows immediately instead of waiting for cron.

HISTORY
2026-08-18 — After login, both the website and Android app showed the error screen. Public pages still worked. Login itself succeeded; the crash happened on the first signed-in render. Production JS was index-BHuwUyoa.js after the fix (PR #189, merge 9bedf63). Play review account used to reproduce: playstore-review@sacramentobuynothing.com.

Root cause: PR #187 (commit 7c0e3d0, “Hide Give and Chat for browse-only guests”) replaced the ChatSystem React hooks import with useBrowseOnly and never put the hooks back. Render threw ReferenceError: useState is not defined.

Fix: restore the hooks import, keep useBrowseOnly, add Sign out on the error screen, bump the Android beta to 0010, and post this Update plus News so neighbors see we are back.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
)
VALUES
(
  '2026-08-13_android-www-api',
  '2026-08-13',
  'Android app can reach the site again',
  'Some Android installs showed “Failed to fetch” because the app called the apex domain while the WebView is on www. That origin mismatch is fixed — reopen the app and it should load.',
  $detail$WHAT NEIGHBORS SEE
If the Android app could open but listings, sign-in, or buttons failed with “Failed to fetch,” that was a www vs non-www mismatch. Reopen the app. You do not need a new install for the web fix.

Download page: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- src/lib/appOrigin.ts — native WebView uses window.location.origin so /api/* stays on the same host (www).
- src/lib/apkDownload.ts + capacitor.config.ts — canonical origin is https://www.sacramentobuynothing.com (VITE_APP_URL / CAPACITOR_SERVER_URL).
- docs/android-apk.md — build env must use the www origin, not the apex domain.

HISTORY
2026-08-13 — PR #182 (fabb421). Apex redirects to www, but Capacitor server.url is www, so API calls to the apex host were blocked by CSP connect-src 'self'.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-29_repeat-event-series',
  '2026-07-29',
  'Repeat events show as one series',
  'Recurring community events now group into one card on the feed and map. Posters can add upcoming dates to a series they already posted.',
  $detail$WHAT NEIGHBORS SEE
A weekly or monthly gathering is one event series instead of a pile of duplicate cards. Open it to see upcoming dates. Posters can add more dates from the event screen.

— Mark

WHERE TO LOOK IN CODE
- Event series merge in feed/map (repeat event series work from 2026-07-28 / 2026-07-29).
- Posters: EventDetailView → Add dates for an existing series.
- scripts/seed-lucid-fremont-events-2026.sql — Lucid Winery 2026 schedule seed.

HISTORY
2026-07-28 — Add repeat event series + ability to add upcoming dates (PR #171).
2026-07-29 — Merge series into one card in feed and map (cf359a5).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-29_signed-apk-auto-update',
  '2026-07-29',
  'Android download is a signed app — no unsafe warning',
  'The Download page now serves a signed release APK, so Android should stop calling it an unsafe debug build. The installed app can also pick up website fixes without a new install.',
  $detail$WHAT NEIGHBORS SEE
Install from https://www.sacramentobuynothing.com/download. Use the signed release APK (not an old debug file). After install, many website fixes arrive the next time you open the app because the APK loads the live site.

— Mark

WHERE TO LOOK IN CODE
- npm run android:apk — signed release via android/keystore.properties.
- public/android-version.json + public/downloads/ — versioned sideload files.
- PWA/APK auto-update splash (86b3732, 2026-07-28).
- Status bar overlap + push-permission reload, build 6 (41f23cc, 2026-07-29).

HISTORY
2026-07-28 — Instant PWA/APK auto-updates and beta version on boot splash.
2026-07-29 — Signed release instead of debug (unsafe Play Protect warning); versioned APK filenames; status bar fix.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId"
)
VALUES (
  '2026-07-08_go-get-safety',
  '2026-07-08',
  'Go Get is here — how live pickup works',
  'Go Get replaces Navigate for coordinating pickups. You will be asked to confirm before sharing live location with the other person.',
  'What to expect:
• Before a trip starts, the app explains that the poster is notified and live location is shared during the pickup.
• Posters can offer availability windows or use instant curb/porch pickup when that fits.
• During an active pickup, the poster may optionally turn on live location so you see both the listed pin and where they are standing.
• Use in-app chat to coordinate. Report no-shows or unsafe behavior from the Go Get screen — staff review every report.
• Six confirmed violations can lock an account until an administrator reviews appeals.

Meet in well-lit public spots when you can, and trust your instincts. Thank you for keeping Sacramento Buy Nothing kind and safe.',
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId"
)
VALUES
(
  '2026-07-26_apk-download-fixed',
  '2026-07-26',
  'Android app download is fixed — get APK v1.1.0',
  'If the Download button failed before, it is fixed. Grab the Android APK from sacramentobuynothing.com/download — no private GitHub link required.',
  $detail$Steps:
1. Open https://sacramentobuynothing.com/download
2. Tap Download APK
3. Allow install from your browser or Files if Android asks
4. Sign in and turn on notifications if you want pickup alerts

Home-screen install still works for a lighter option. The APK is best if you want stronger background alerts.

Questions? Message staff from Help & support.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_goget-staff-watch',
  '2026-07-26',
  'Go Get pickups — staff can step in when a handoff stalls',
  'If a live pickup gets stuck, city moderators can help close the session or escalate a problem into the violation review queue. Same 6-strike safety model as before.',
  $detail$What this means for neighbors:
• Keep using Go Get as usual — confirm, share location when you choose, and finish in-app when you can.
• If something goes wrong (no-show, unsafe behavior, false claim), report it from the Go Get screen.
• Staff may cancel or close a stalled session and file a review when needed.
• Confirmed violations still count toward the six-strike lock; you can appeal.

Stay kind, meet in public when you can, and thank you for keeping Sacramento Buy Nothing safe.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),
(
  '2026-07-26_goget-requires-app',
  '2026-07-26',
  'Go Get needs the installed app + notifications',
  'Live pickup coordination only runs in the Android APK or home-screen app with notifications on. You can opt out in Account settings and keep listing + chatting without it.',
  $detail$To use Go Get / Drop off / Meet up:
1. Install from https://sacramentobuynothing.com/download
2. Enable notifications (bell → Notification settings)
3. Keep “Go Get & pickup coordination” on in Account

Prefer to arrange pickups yourself? Turn coordination off in Account — your listings stay up and neighbors can still message you.

— Mark$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId"
)
VALUES (
  '2026-08-18_we-are-back',
  '2026-08-18',
  'We are back — sorry we were down after login',
  'If you signed in today and only saw “Something went wrong,” that was us, not you. The website and app are fixed. Sign in again — you should get the map, feed, and messages.',
  $detail$WHAT NEIGHBORS SEE
Neighbors,

We were down after login on both the website and the Android app. You could reach the public pages and sign in, then the community froze on an error screen. Refreshing did not help because you were still signed in.

That is fixed. Sign in again. If the error screen is still up, tap Sign out first, then sign back in. You do not need a new app install. New APK: https://www.sacramentobuynothing.com/download

I am sorry we were down. Thank you for hanging in — and for giving freely in Sacramento.

— Mark

WHERE TO LOOK IN CODE
Same notes as Update 2026-08-18_login-crash-fix: ChatSystem.tsx hooks import, AppErrorBoundary Sign out, /updates routing, Android 0010, changelog seeds, and scripts/supabase-migration-aug-18-2026-outage.sql.

HISTORY
2026-08-18 — Same outage as the Update post. News is the director announcement in Notifications → News. Update is the product note in Notifications → Updates. Both stay published so neighbors who only check one tab still see we are back.

Root cause: PR #187 removed ChatSystem React hooks. Fix: PR #189.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId"
)
VALUES (
  '2026-08-13_android-can-load',
  '2026-08-13',
  'Android app talking to the site again',
  'If the Android app opened but nothing would load (“Failed to fetch”), that is fixed. Reopen the app — it should reach the community on www.sacramentobuynothing.com.',
  $detail$WHAT NEIGHBORS SEE
A few Android neighbors could open the app but not load listings or sign in. The app was calling the wrong hostname. That is fixed. Close the app fully and reopen.

Download: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-13_android-www-api (src/lib/appOrigin.ts, www vs apex).

HISTORY
2026-08-13 — PR #182.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
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
CREATE INDEX IF NOT EXISTS app_reviews_created_idx ON public.app_reviews ("createdAt" DESC);

-- =========================================================
-- 20. "Go Get" pickup sessions — Uber/DoorDash-style pickup coordination
--
-- Generic roles so the same session works for every post type:
--   fulfillerUserId = has the item / is the destination (giveaway: the poster;
--                     looking: whoever offered to fulfill the request;
--                     trade: whoever the other party is meeting to swap with)
--   requesterUserId = travels to get it (giveaway: the claimer; looking: the
--                     original poster who wanted the item; trade: whoever
--                     initiated the "Go Get")
--
-- Lifecycle: awaiting_availability -> (window_offered -> scheduled ->) active
--   -> arrived -> completed
--   (or cancelled / expired / disputed at various points)
-- "Ready" isn't its own DB status — once scheduledAt passes, the UI shows the
-- fulfiller a Ready button while status stays 'scheduled'; tapping Ready sets
-- fulfillerReadyAt and only then can the requester start (-> 'active').
-- =========================================================
CREATE TABLE IF NOT EXISTS public.go_get_sessions (
  id TEXT PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "itemType" TEXT NOT NULL,
  "fulfillerUserId" TEXT NOT NULL,
  "fulfillerName" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "requesterName" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "handshakeMode" TEXT NOT NULL DEFAULT 'availability',
  status TEXT NOT NULL DEFAULT 'awaiting_availability',
  "destinationLat" DOUBLE PRECISION NOT NULL,
  "destinationLng" DOUBLE PRECISION NOT NULL,
  "destinationLabel" TEXT NOT NULL,
  "availableFrom" TIMESTAMPTZ,
  "availableUntil" TIMESTAMPTZ,
  "scheduledAt" TIMESTAMPTZ,
  "fulfillerReadyAt" TIMESTAMPTZ,
  "startedAt" TIMESTAMPTZ,
  "arrivedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "cancelledByUserId" TEXT,
  "cancelReason" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Poster may opt in to share their live device location during active/arrived pickup
-- so the picker can see both the listed pickup pin and where they actually are.
ALTER TABLE public.go_get_sessions ADD COLUMN IF NOT EXISTS "fulfillerSharingLocation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.go_get_sessions ADD COLUMN IF NOT EXISTS "ringExpiresAt" TIMESTAMPTZ;
ALTER TABLE public.go_get_sessions ADD COLUMN IF NOT EXISTS "ringDurationSeconds" INTEGER;

ALTER TABLE public.go_get_sessions DROP CONSTRAINT IF EXISTS go_get_sessions_item_type_check;
ALTER TABLE public.go_get_sessions ADD CONSTRAINT go_get_sessions_item_type_check
  CHECK ("itemType" IN ('giveaway', 'looking', 'trade'));

ALTER TABLE public.go_get_sessions DROP CONSTRAINT IF EXISTS go_get_sessions_handshake_check;
ALTER TABLE public.go_get_sessions ADD CONSTRAINT go_get_sessions_handshake_check
  CHECK ("handshakeMode" IN ('instant', 'availability'));

ALTER TABLE public.go_get_sessions DROP CONSTRAINT IF EXISTS go_get_sessions_status_check;
ALTER TABLE public.go_get_sessions ADD CONSTRAINT go_get_sessions_status_check
  CHECK (status IN (
    'awaiting_availability', 'awaiting_schedule', 'window_offered', 'scheduled', 'active', 'arrived',
    'completed', 'cancelled', 'expired', 'disputed'
  ));

ALTER TABLE public.go_get_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS go_get_sessions_item_idx ON public.go_get_sessions ("itemId", status);
CREATE INDEX IF NOT EXISTS go_get_sessions_fulfiller_idx ON public.go_get_sessions ("fulfillerUserId", status);
CREATE INDEX IF NOT EXISTS go_get_sessions_requester_idx ON public.go_get_sessions ("requesterUserId", status);
CREATE INDEX IF NOT EXISTS go_get_sessions_chat_idx ON public.go_get_sessions ("chatId");

-- One row per session holding only the LATEST position (overwritten repeatedly,
-- not a history log) — nothing about a picker's live location is kept once a
-- trip ends; see cleanup in cancel/complete session functions below.
CREATE TABLE IF NOT EXISTS public.go_get_live_locations (
  "sessionId" TEXT PRIMARY KEY REFERENCES public.go_get_sessions(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  "speedMph" DOUBLE PRECISION,
  "etaSeconds" INTEGER,
  "distanceMeters" DOUBLE PRECISION,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.go_get_live_locations ENABLE ROW LEVEL SECURITY;

-- Latest fulfiller/poster device position when they opt in to share during pickup.
CREATE TABLE IF NOT EXISTS public.go_get_fulfiller_live_locations (
  "sessionId" TEXT PRIMARY KEY REFERENCES public.go_get_sessions(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.go_get_fulfiller_live_locations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- GPS location trail — one row per recorded point for staff meet oversight
-- Points are appended (throttled, ~30s intervals) while a session is active.
-- Staff can query the full route history; participants only see their own sessions.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.go_get_location_trail (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES public.go_get_sessions(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  "speedMph" DOUBLE PRECISION,
  "etaSeconds" INTEGER,
  "distanceMeters" DOUBLE PRECISION,
  "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.go_get_location_trail ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS location_trail_session_idx ON public.go_get_location_trail ("sessionId", "recordedAt" ASC);

CREATE POLICY "location_trail_select" ON public.go_get_location_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId"
        AND auth.uid()::text IN (s."fulfillerUserId", s."requesterUserId")
    )
    OR public.is_staff()
  );

CREATE POLICY "location_trail_insert" ON public.go_get_location_trail
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId"
        AND auth.uid()::text = s."requesterUserId"
    )
  );

-- =========================================================
-- 21. "Go Get" violations — DoorDash-style two-tier moderation
--
-- Strike counting (see countsTowardStrikes):
--   pending_review    -> false (not yet confirmed by a moderator)
--   confirmed          -> true  (moderator confirmed, no appeal filed)
--   dismissed          -> false (moderator dismissed the report — terminal)
--   appealed           -> false (accused appealed a confirmed violation —
--                                 paused while an administrator+ reviews it)
--   appeal_upheld      -> false (administrator overturned it — stays visible
--                                 on the record permanently, never counts)
--   appeal_denied      -> true  (administrator denied the appeal — the
--                                 original violation counts again)
--
-- Accounts auto-lock at 6 counted strikes (see staffLockUserForViolations());
-- only a city_administrator+ can unlock (staffUnlockViolationLockedUser()).
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_violations (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT,
  "reportedByUserId" TEXT NOT NULL,
  "reportedByName" TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  "countsTowardStrikes" BOOLEAN NOT NULL DEFAULT false,
  "reviewedByUserId" TEXT,
  "reviewedByName" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "reviewNote" TEXT,
  "appealText" TEXT,
  "appealedAt" TIMESTAMPTZ,
  "appealDecisionByUserId" TEXT,
  "appealDecisionByName" TEXT,
  "appealDecisionAt" TIMESTAMPTZ,
  "appealDecisionNote" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_violations DROP CONSTRAINT IF EXISTS user_violations_category_check;
ALTER TABLE public.user_violations ADD CONSTRAINT user_violations_category_check
  CHECK (category IN ('no_show', 'false_claim', 'unsafe_behavior', 'other'));

ALTER TABLE public.user_violations DROP CONSTRAINT IF EXISTS user_violations_status_check;
ALTER TABLE public.user_violations ADD CONSTRAINT user_violations_status_check
  CHECK (status IN (
    'pending_review', 'confirmed', 'dismissed', 'appealed', 'appeal_upheld', 'appeal_denied'
  ));

ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS user_violations_user_idx ON public.user_violations ("userId", status);
CREATE INDEX IF NOT EXISTS user_violations_status_idx ON public.user_violations (status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS user_violations_session_idx ON public.user_violations ("sessionId");


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

-- =========================================================
-- OPTIONAL: set community director role (run after you sign up)
-- UPDATE public.users SET role = 'director' WHERE email = 'you@example.com';
--
-- OPTIONAL: migrate legacy role slugs (moderator → city_administrator, admin → city_manager)
-- UPDATE public.users SET role = 'city_administrator' WHERE role = 'moderator';
-- UPDATE public.users SET role = 'city_manager' WHERE role = 'admin';
-- =========================================================

-- (Push tables in NOTIFICATIONS section below)



ALTER TABLE public.item_claims DROP CONSTRAINT IF EXISTS item_claims_kind_check;
ALTER TABLE public.item_claims ADD CONSTRAINT item_claims_kind_check
  CHECK (kind IN ('giveaway', 'request_fulfilled', 'trade_completed'));


-- =========================================================
-- NOTIFICATIONS & SAVED ITEMS
-- =========================================================

-- 1. Push subscriptions (one row per browser/device endpoint)
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

-- 2. Notification preferences (one row per user)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  "userId" TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  messages BOOLEAN NOT NULL DEFAULT true,
  "messageRequests" BOOLEAN NOT NULL DEFAULT true,
  support BOOLEAN NOT NULL DEFAULT true,
  claims BOOLEAN NOT NULL DEFAULT true,
  gifts BOOLEAN NOT NULL DEFAULT true,
  comments BOOLEAN NOT NULL DEFAULT true,
  "listingUpvotes" BOOLEAN NOT NULL DEFAULT true,
  "listingDownvotes" BOOLEAN NOT NULL DEFAULT true,
  "listingStatus" BOOLEAN NOT NULL DEFAULT true,
  "nearbyListings" BOOLEAN NOT NULL DEFAULT true,
  requests BOOLEAN NOT NULL DEFAULT true,
  announcements BOOLEAN NOT NULL DEFAULT true,
  "pickupReminders" BOOLEAN NOT NULL DEFAULT true,
  "newListings" BOOLEAN NOT NULL DEFAULT true,
  "savedItems" BOOLEAN NOT NULL DEFAULT true,
  "accountUpdates" BOOLEAN NOT NULL DEFAULT true,
  "staffSupport" BOOLEAN NOT NULL DEFAULT true,
  "staffReports" BOOLEAN NOT NULL DEFAULT true,
  "directorAlerts" BOOLEAN NOT NULL DEFAULT true,
  "directorJoins" BOOLEAN NOT NULL DEFAULT true,
  "directorLeaves" BOOLEAN NOT NULL DEFAULT true,
  "directorModeration" BOOLEAN NOT NULL DEFAULT true,
  "directorReports" BOOLEAN NOT NULL DEFAULT true,
  "directorTickets" BOOLEAN NOT NULL DEFAULT true,
  "directorListings" BOOLEAN NOT NULL DEFAULT true,
  "directorMessageRequests" BOOLEAN NOT NULL DEFAULT true,
  "directorClaimRequests" BOOLEAN NOT NULL DEFAULT true,
  "nearbyRadiusMiles" INTEGER NOT NULL DEFAULT 10,
  "followedCategories" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_radius_check
    CHECK ("nearbyRadiusMiles" IN (0, 5, 10, 25, 50))
);

-- Add any columns missing from older installs
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS support BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "messageRequests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingUpvotes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingDownvotes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingStatus" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "savedItems" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "accountUpdates" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "staffSupport" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "staffReports" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorAlerts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorJoins" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorLeaves" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorModeration" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorReports" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorTickets" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorListings" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorMessageRequests" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "directorClaimRequests" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- 3. User notifications inbox (bell → Notifications tab — run user-notifications.sql for full DDL)
--    Rows are inserted by the server when listing activity is dispatched.

-- 4. Push dedup log (prevents duplicate alerts from client + webhook)
CREATE TABLE IF NOT EXISTS public.push_dispatch_log (
  id TEXT PRIMARY KEY,
  tag TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_dispatch_log_tag_created_idx
  ON public.push_dispatch_log (tag, "createdAt" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS push_dispatch_log_tag_unique
  ON public.push_dispatch_log (tag);

-- 4. Backfill preferences for existing users (all toggles ON by default)
INSERT INTO public.notification_preferences ("userId")
SELECT u.uid FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences p WHERE p."userId" = u.uid
);

-- 5. Ensure directors have role set (optional — app also syncs on login)
UPDATE public.users
SET role = 'director'
WHERE role IS DISTINCT FROM 'director'
  AND (
    uid = '204b071f-100c-401d-b76d-40c594e1f132'
    OR lower(email) = 'sigsecspec@gmail.com'
  );

-- 6. Realtime for preference sync across tabs (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notification_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 7. Saved items (server-side alerts when bookmarked listings change)
CREATE TABLE IF NOT EXISTS public.saved_items (
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "itemId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("userId", "itemId")
);

CREATE INDEX IF NOT EXISTS saved_items_item_id_idx ON public.saved_items ("itemId");

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved items" ON public.saved_items;
CREATE POLICY "Users manage own saved items" ON public.saved_items
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

-- 8. Purge stale push subscriptions older than 90 days
DELETE FROM public.push_subscriptions
WHERE "updatedAt" < NOW() - INTERVAL '90 days';

-- =========================================================

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS "communityChat" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "staffChat" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "appUpdates" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingUpvotes" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "listingDownvotes" BOOLEAN NOT NULL DEFAULT true;

INSERT INTO public.notification_preferences ("userId")
SELECT u.uid FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.notification_preferences p WHERE p."userId" = u.uid);

UPDATE public.users SET role = 'director'
WHERE role IS DISTINCT FROM 'director'
  AND (uid = '204b071f-100c-401d-b76d-40c594e1f132' OR lower(email) = 'sigsecspec@gmail.com');

DELETE FROM public.push_subscriptions WHERE "updatedAt" < NOW() - INTERVAL '90 days';


-- =========================================================
-- USER NOTIFICATIONS INBOX
-- =========================================================

-- =========================================================
-- USER NOTIFICATIONS INBOX (bell → Notifications tab)
-- Run once in Supabase SQL Editor after notifications-complete.sql
-- Safe to re-run
-- =========================================================
--
-- Stores what neighbors see under bell → Notifications — every alert
-- they receive (messages, discover, comments, claims, chat, etc.).
-- Push toggles stay under Alerts. Rows are written by the server on dispatch.
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



-- =========================================================
-- HELP, VOTES, COMMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.help_announcements (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  detail TEXT,
  "authorName" TEXT NOT NULL,
  "authorTitle" TEXT NOT NULL,
  "postedByUserId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS help_announcements_date_idx
  ON public.help_announcements (date DESC, "updatedAt" DESC);

ALTER TABLE public.help_announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.community_content_votes (
  id TEXT PRIMARY KEY,
  "targetType" TEXT NOT NULL CHECK ("targetType" IN ('update', 'review', 'leader_message', 'announcement')),
  "targetId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "voteType" TEXT NOT NULL CHECK ("voteType" IN ('up', 'down')),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE ("targetType", "targetId", "userId")
);

CREATE INDEX IF NOT EXISTS community_content_votes_target_idx
  ON public.community_content_votes ("targetType", "targetId");

ALTER TABLE public.community_content_votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_update_comments (
  id TEXT PRIMARY KEY,
  "updateId" TEXT NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_update_comments_update_id_idx
  ON public.app_update_comments ("updateId");

ALTER TABLE public.app_update_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.help_announcement_comments (
  id TEXT PRIMARY KEY,
  "announcementId" TEXT NOT NULL REFERENCES public.help_announcements(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "userName" TEXT NOT NULL,
  "userPhoto" TEXT,
  "userNeighborhood" TEXT NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS help_announcement_comments_announcement_id_idx
  ON public.help_announcement_comments ("announcementId");

ALTER TABLE public.help_announcement_comments ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- AWARDS
-- =========================================================

-- Awards tables

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "joinRank" INT;

CREATE INDEX IF NOT EXISTS users_join_rank_idx ON public.users ("joinRank");

CREATE TABLE IF NOT EXISTS public.award_definitions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  category TEXT NOT NULL DEFAULT 'community',
  "triggerType" TEXT NOT NULL DEFAULT 'manual',
  "autoRule" JSONB,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "requiresUnlock" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdByUserId" TEXT REFERENCES public.users(uid) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.user_awards (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "awardId" TEXT NOT NULL REFERENCES public.award_definitions(id) ON DELETE CASCADE,
  "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "grantedByUserId" TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
  "revokedAt" TIMESTAMPTZ,
  "revokedByUserId" TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'auto',
  metadata JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS user_awards_active_unique
  ON public.user_awards ("userId", "awardId")
  WHERE "revokedAt" IS NULL;

CREATE INDEX IF NOT EXISTS user_awards_user_idx ON public.user_awards ("userId") WHERE "revokedAt" IS NULL;
CREATE INDEX IF NOT EXISTS user_awards_award_idx ON public.user_awards ("awardId") WHERE "revokedAt" IS NULL;
CREATE INDEX IF NOT EXISTS award_definitions_sort_idx ON public.award_definitions ("sortOrder", title);


-- Awards functions, triggers, RLS

-- =========================================================
-- 2. HELPERS
-- =========================================================

CREATE OR REPLACE FUNCTION public.community_member_count()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.users;
$$;

CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
  SET "lastActiveAt" = NOW()
  WHERE uid = auth.uid()::text;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;

CREATE OR REPLACE FUNCTION public.active_neighbor_count(within_minutes int DEFAULT 5)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.users
  WHERE COALESCE("accountStatus", 'active') = 'active'
    AND "lastActiveAt" IS NOT NULL
    AND "lastActiveAt" >= NOW() - (GREATEST(within_minutes, 1) || ' minutes')::interval;
$$;

GRANT EXECUTE ON FUNCTION public.active_neighbor_count(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.awards_unlocked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.community_member_count() >= 500;
$$;

CREATE OR REPLACE FUNCTION public.assign_user_join_rank(target_uid TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rank_val INT;
BEGIN
  SELECT "joinRank" INTO rank_val FROM public.users WHERE uid = target_uid;
  IF rank_val IS NOT NULL THEN
    RETURN rank_val;
  END IF;

  rank_val := public.community_member_count();

  UPDATE public.users
  SET "joinRank" = rank_val
  WHERE uid = target_uid;

  RETURN rank_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_award_by_slug(
  target_uid TEXT,
  award_slug TEXT,
  award_source TEXT DEFAULT 'auto',
  granted_by TEXT DEFAULT NULL,
  award_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  def_id TEXT;
  grant_id TEXT;
BEGIN
  IF target_uid IS NULL OR target_uid = '' OR award_slug IS NULL OR award_slug = '' THEN
    RETURN false;
  END IF;

  SELECT id INTO def_id
  FROM public.award_definitions
  WHERE slug = award_slug AND "isActive" = true
  LIMIT 1;

  IF def_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_awards
    WHERE "userId" = target_uid AND "awardId" = def_id AND "revokedAt" IS NULL
  ) THEN
    RETURN false;
  END IF;

  grant_id := gen_random_uuid()::text;

  INSERT INTO public.user_awards (
    id, "userId", "awardId", "grantedAt", "grantedByUserId", source, metadata
  ) VALUES (
    grant_id, target_uid, def_id, NOW(), granted_by, award_source, award_metadata
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_award_by_slug(
  target_uid TEXT,
  award_slug TEXT,
  revoked_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  def_id TEXT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can revoke awards';
  END IF;

  SELECT id INTO def_id
  FROM public.award_definitions
  WHERE slug = award_slug
  LIMIT 1;

  IF def_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_awards
  SET "revokedAt" = NOW(), "revokedByUserId" = revoked_by
  WHERE "userId" = target_uid AND "awardId" = def_id AND "revokedAt" IS NULL;

  RETURN FOUND;
END;
$$;

-- =========================================================
-- 3. MILESTONE + AUTO EVALUATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.grant_join_milestone_awards(target_uid TEXT, join_rank INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF join_rank <= 100 THEN
    PERFORM public.grant_award_by_slug(target_uid, 'first-hundred', 'milestone', NULL, jsonb_build_object('joinRank', join_rank));
  END IF;
  IF join_rank <= 200 THEN
    PERFORM public.grant_award_by_slug(target_uid, 'first-two-hundred', 'milestone', NULL, jsonb_build_object('joinRank', join_rank));
  END IF;
  IF join_rank <= 300 THEN
    PERFORM public.grant_award_by_slug(target_uid, 'first-three-hundred', 'milestone', NULL, jsonb_build_object('joinRank', join_rank));
  END IF;
  IF join_rank <= 400 THEN
    PERFORM public.grant_award_by_slug(target_uid, 'first-four-hundred', 'milestone', NULL, jsonb_build_object('joinRank', join_rank));
  END IF;
  IF join_rank <= 500 THEN
    PERFORM public.grant_award_by_slug(target_uid, 'first-five-hundred', 'milestone', NULL, jsonb_build_object('joinRank', join_rank));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_auto_awards_for_user(target_uid TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  items_posted INT;
  items_given INT;
  items_claimed INT;
  requests_fulfilled INT;
  trades_completed INT;
  upvotes_received INT;
  event_rsvps INT;
  community_messages INT;
  has_bio BOOLEAN;
  has_review BOOLEAN;
  join_rank INT;
  def RECORD;
  rule_type TEXT;
  threshold INT;
  current_val INT;
BEGIN
  IF target_uid IS NULL OR target_uid = '' THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INT INTO items_posted FROM public.items WHERE "userId" = target_uid;
  SELECT COUNT(*)::INT INTO items_given
    FROM public.items WHERE "userId" = target_uid AND type = 'giveaway' AND status = 'completed';
  SELECT COUNT(*)::INT INTO items_claimed
    FROM public.item_claims WHERE "claimerUserId" = target_uid;
  SELECT COUNT(*)::INT INTO requests_fulfilled
    FROM public.items WHERE "userId" = target_uid AND type = 'looking' AND status = 'completed';
  SELECT COUNT(*)::INT INTO trades_completed
    FROM public.items WHERE "userId" = target_uid AND type = 'trade' AND status = 'completed';
  SELECT COALESCE(SUM(CASE WHEN iv."voteType" = 'up' THEN 1 ELSE 0 END), 0)::INT INTO upvotes_received
    FROM public.item_votes iv
    JOIN public.items i ON i.id = iv."itemId"
    WHERE i."userId" = target_uid;
  SELECT COUNT(*)::INT INTO event_rsvps FROM public.event_rsvps WHERE "userId" = target_uid;
  SELECT COUNT(*)::INT INTO community_messages
    FROM public.messages WHERE "senderId" = target_uid AND "chatId" = 'community-global';
  SELECT (bio IS NOT NULL AND TRIM(bio) <> '') INTO has_bio FROM public.users WHERE uid = target_uid;
  SELECT EXISTS(SELECT 1 FROM public.app_reviews WHERE "userId" = target_uid) INTO has_review;
  SELECT "joinRank" INTO join_rank FROM public.users WHERE uid = target_uid;

  FOR def IN
    SELECT id, slug, "autoRule"
    FROM public.award_definitions
    WHERE "triggerType" = 'auto' AND "isActive" = true AND "autoRule" IS NOT NULL
  LOOP
    rule_type := def."autoRule"->>'type';
    threshold := COALESCE((def."autoRule"->>'threshold')::INT, 1);
    current_val := 0;

    CASE rule_type
      WHEN 'items_posted' THEN current_val := items_posted;
      WHEN 'items_given' THEN current_val := items_given;
      WHEN 'items_claimed' THEN current_val := items_claimed;
      WHEN 'requests_fulfilled' THEN current_val := requests_fulfilled;
      WHEN 'trades_completed' THEN current_val := trades_completed;
      WHEN 'upvotes_received' THEN current_val := upvotes_received;
      WHEN 'event_rsvps' THEN current_val := event_rsvps;
      WHEN 'community_messages' THEN current_val := community_messages;
      WHEN 'has_bio' THEN current_val := CASE WHEN has_bio THEN 1 ELSE 0 END;
      WHEN 'has_app_review' THEN current_val := CASE WHEN has_review THEN 1 ELSE 0 END;
      WHEN 'join_rank_max' THEN current_val := CASE WHEN join_rank IS NOT NULL AND join_rank <= threshold THEN 1 ELSE 0 END;
      WHEN 'combined_giving' THEN
        current_val := items_given + items_claimed;
        threshold := COALESCE((def."autoRule"->>'threshold')::INT, 10);
      ELSE
        CONTINUE;
    END CASE;

    IF rule_type IN ('has_bio', 'has_app_review', 'join_rank_max') THEN
      IF current_val >= 1 THEN
        PERFORM public.grant_award_by_slug(target_uid, def.slug, 'auto');
      END IF;
    ELSIF current_val >= threshold THEN
      PERFORM public.grant_award_by_slug(target_uid, def.slug, 'auto');
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_user_created_awards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rank_val INT;
BEGIN
  rank_val := public.assign_user_join_rank(NEW.uid);
  PERFORM public.grant_join_milestone_awards(NEW.uid, rank_val);
  PERFORM public.evaluate_auto_awards_for_user(NEW.uid);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created_awards ON public.users;
CREATE TRIGGER on_user_created_awards
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.on_user_created_awards();

CREATE OR REPLACE FUNCTION public.on_award_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid TEXT;
BEGIN
  uid := NULL;
  IF TG_TABLE_NAME = 'items' THEN
    uid := COALESCE(NEW."userId", OLD."userId");
  ELSIF TG_TABLE_NAME = 'item_claims' THEN
    uid := COALESCE(NEW."claimerUserId", OLD."claimerUserId");
    IF NEW."giverUserId" IS NOT NULL THEN
      PERFORM public.evaluate_auto_awards_for_user(NEW."giverUserId");
    END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    uid := COALESCE(NEW."senderId", OLD."senderId");
  ELSIF TG_TABLE_NAME = 'event_rsvps' THEN
    uid := COALESCE(NEW."userId", OLD."userId");
  ELSIF TG_TABLE_NAME = 'app_reviews' THEN
    uid := COALESCE(NEW."userId", OLD."userId");
  ELSIF TG_TABLE_NAME = 'users' THEN
    uid := COALESCE(NEW.uid, OLD.uid);
  END IF;

  IF uid IS NOT NULL THEN
    PERFORM public.evaluate_auto_awards_for_user(uid);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_items_award_activity ON public.items;
CREATE TRIGGER on_items_award_activity
  AFTER INSERT OR UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.on_award_activity();

DROP TRIGGER IF EXISTS on_item_claims_award_activity ON public.item_claims;
CREATE TRIGGER on_item_claims_award_activity
  AFTER INSERT ON public.item_claims
  FOR EACH ROW EXECUTE FUNCTION public.on_award_activity();

DROP TRIGGER IF EXISTS on_messages_award_activity ON public.messages;
CREATE TRIGGER on_messages_award_activity
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_award_activity();

DROP TRIGGER IF EXISTS on_event_rsvps_award_activity ON public.event_rsvps;
CREATE TRIGGER on_event_rsvps_award_activity
  AFTER INSERT ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.on_award_activity();

DROP TRIGGER IF EXISTS on_app_reviews_award_activity ON public.app_reviews;
CREATE TRIGGER on_app_reviews_award_activity
  AFTER INSERT OR UPDATE ON public.app_reviews
  FOR EACH ROW EXECUTE FUNCTION public.on_award_activity();

DROP TRIGGER IF EXISTS on_users_bio_award_activity ON public.users;
CREATE TRIGGER on_users_bio_award_activity
  AFTER UPDATE OF bio ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.on_award_activity();

-- =========================================================
-- 4. STAFF RPCS
-- =========================================================

CREATE OR REPLACE FUNCTION public.staff_grant_award(
  target_uid TEXT,
  award_slug TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can grant awards';
  END IF;
  RETURN public.grant_award_by_slug(target_uid, award_slug, 'staff', auth.uid()::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_revoke_award(
  target_uid TEXT,
  award_slug TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.revoke_award_by_slug(target_uid, award_slug, auth.uid()::text);
END;
$$;

REVOKE ALL ON FUNCTION public.staff_grant_award(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_grant_award(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.staff_revoke_award(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_revoke_award(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.evaluate_auto_awards_for_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_auto_awards_for_user(text) TO authenticated;



-- STEP 3 of 3 — Awards seed data + backfill
-- Run AFTER awards-01-tables.sql AND awards-02-functions.sql

INSERT INTO public.award_definitions (id, slug, title, description, icon, category, "triggerType", "autoRule", "sortOrder", "requiresUnlock")
VALUES
  ('awd-first-hundred', 'first-hundred', 'First Hundred', 'One of the first 100 neighbors to join Sacramento Buy Nothing.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":100}', 10, true),
  ('awd-first-two-hundred', 'first-two-hundred', 'First Two Hundred', 'Among the first 200 neighbors in our sharing circle.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":200}', 20, true),
  ('awd-first-three-hundred', 'first-three-hundred', 'First Three Hundred', 'Helped build momentum as one of the first 300 neighbors.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":300}', 30, true),
  ('awd-first-four-hundred', 'first-four-hundred', 'First Four Hundred', 'A founding neighbor from the first 400 members.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":400}', 40, true),
  ('awd-first-five-hundred', 'first-five-hundred', 'First Five Hundred', 'A true founding neighbor - one of the first 500 members.', 'crown', 'milestone', 'auto', '{"type":"join_rank_max","threshold":500}', 50, true),
  ('awd-first-listing', 'first-listing', 'First Post', 'Posted your first listing on the feed.', 'plus-circle', 'giving', 'auto', '{"type":"items_posted","threshold":1}', 100, true),
  ('awd-listings-5', 'listings-5', 'Regular Poster', 'Posted 5 listings for neighbors.', 'layers', 'giving', 'auto', '{"type":"items_posted","threshold":5}', 110, true),
  ('awd-listings-10', 'listings-10', 'Feed Contributor', 'Posted 10 listings for the community.', 'layers', 'giving', 'auto', '{"type":"items_posted","threshold":10}', 120, true),
  ('awd-listings-25', 'listings-25', 'Community Voice', 'Posted 25 listings - you keep the feed alive.', 'megaphone', 'giving', 'auto', '{"type":"items_posted","threshold":25}', 130, true),
  ('awd-listings-50', 'listings-50', 'Listing Legend', 'Posted 50 listings for Sacramento neighbors.', 'star', 'giving', 'auto', '{"type":"items_posted","threshold":50}', 140, true),
  ('awd-first-gift', 'first-gift', 'First Gift', 'Completed your first giveaway - thank you for giving!', 'gift', 'giving', 'auto', '{"type":"items_given","threshold":1}', 200, true),
  ('awd-gifts-5', 'gifts-5', 'Generous Neighbor', 'Gave away 5 items to neighbors.', 'gift', 'giving', 'auto', '{"type":"items_given","threshold":5}', 210, true),
  ('awd-gifts-10', 'gifts-10', 'Gift Champion', 'Gave away 10 items - incredible generosity.', 'gift', 'giving', 'auto', '{"type":"items_given","threshold":10}', 220, true),
  ('awd-gifts-25', 'gifts-25', 'Sharing Superstar', 'Gave away 25 items to the community.', 'sparkles', 'giving', 'auto', '{"type":"items_given","threshold":25}', 230, true),
  ('awd-gifts-50', 'gifts-50', 'Giving Hero', 'Gave away 50 items - you embody Buy Nothing spirit.', 'heart', 'giving', 'auto', '{"type":"items_given","threshold":50}', 240, true),
  ('awd-gifts-100', 'gifts-100', 'Sacramento Saint', 'Gave away 100 items. Legendary generosity.', 'crown', 'giving', 'auto', '{"type":"items_given","threshold":100}', 250, true),
  ('awd-first-claim', 'first-claim', 'First Claim', 'Claimed your first item from a neighbor.', 'package', 'community', 'auto', '{"type":"items_claimed","threshold":1}', 300, true),
  ('awd-claims-5', 'claims-5', 'Savvy Saver', 'Claimed 5 items from generous neighbors.', 'package', 'community', 'auto', '{"type":"items_claimed","threshold":5}', 310, true),
  ('awd-claims-10', 'claims-10', 'Treasure Hunter', 'Claimed 10 items through the community.', 'package', 'community', 'auto', '{"type":"items_claimed","threshold":10}', 320, true),
  ('awd-claims-25', 'claims-25', 'Community Connector', 'Claimed 25 items - active participant.', 'link', 'community', 'auto', '{"type":"items_claimed","threshold":25}', 330, true),
  ('awd-claims-50', 'claims-50', 'Neighborhood Navigator', 'Claimed 50 items from the sharing circle.', 'compass', 'community', 'auto', '{"type":"items_claimed","threshold":50}', 340, true),
  ('awd-first-fulfilled', 'first-fulfilled', 'Wish Granted', 'Fulfilled your first neighbor request.', 'check-circle', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":1}', 400, true),
  ('awd-fulfilled-5', 'fulfilled-5', 'Helper', 'Fulfilled 5 neighbor requests.', 'hand-heart', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":5}', 410, true),
  ('awd-fulfilled-10', 'fulfilled-10', 'Problem Solver', 'Fulfilled 10 neighbor requests.', 'hand-heart', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":10}', 420, true),
  ('awd-fulfilled-25', 'fulfilled-25', 'Community Angel', 'Fulfilled 25 neighbor requests.', 'sparkles', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":25}', 430, true),
  ('awd-first-trade', 'first-trade', 'First Trade', 'Completed your first barter trade.', 'repeat', 'community', 'auto', '{"type":"trades_completed","threshold":1}', 500, true),
  ('awd-trades-5', 'trades-5', 'Barter Pro', 'Completed 5 fair trades with neighbors.', 'repeat', 'community', 'auto', '{"type":"trades_completed","threshold":5}', 510, true),
  ('awd-trades-10', 'trades-10', 'Trade Master', 'Completed 10 barter trades.', 'repeat', 'community', 'auto', '{"type":"trades_completed","threshold":10}', 520, true),
  ('awd-first-upvote', 'first-upvote', 'First Cheer', 'Received your first upvote from a neighbor.', 'thumbs-up', 'recognition', 'auto', '{"type":"upvotes_received","threshold":1}', 600, true),
  ('awd-upvotes-10', 'upvotes-10', 'Appreciated', 'Received 10 upvotes on your listings.', 'thumbs-up', 'recognition', 'auto', '{"type":"upvotes_received","threshold":10}', 610, true),
  ('awd-upvotes-25', 'upvotes-25', 'Beloved Neighbor', 'Received 25 upvotes from the community.', 'heart', 'recognition', 'auto', '{"type":"upvotes_received","threshold":25}', 620, true),
  ('awd-upvotes-50', 'upvotes-50', 'Community Favorite', 'Received 50 upvotes - neighbors love what you share.', 'star', 'recognition', 'auto', '{"type":"upvotes_received","threshold":50}', 630, true),
  ('awd-upvotes-100', 'upvotes-100', 'Neighborhood Icon', 'Received 100 upvotes. A true favorite.', 'crown', 'recognition', 'auto', '{"type":"upvotes_received","threshold":100}', 640, true),
  ('awd-first-rsvp', 'first-rsvp', 'Event Goer', 'RSVPed to your first community event.', 'calendar', 'events', 'auto', '{"type":"event_rsvps","threshold":1}', 700, true),
  ('awd-events-5', 'events-5', 'Community Regular', 'RSVPed to 5 community events.', 'calendar', 'events', 'auto', '{"type":"event_rsvps","threshold":5}', 710, true),
  ('awd-events-10', 'events-10', 'Event Enthusiast', 'RSVPed to 10 community events.', 'party-popper', 'events', 'auto', '{"type":"event_rsvps","threshold":10}', 720, true),
  ('awd-first-chat', 'first-chat', 'Community Voice', 'Sent your first message in community chat.', 'message-circle', 'community', 'auto', '{"type":"community_messages","threshold":1}', 800, true),
  ('awd-chat-50', 'chat-50', 'Chat Regular', 'Sent 50 messages in community chat.', 'messages-square', 'community', 'auto', '{"type":"community_messages","threshold":50}', 810, true),
  ('awd-chat-100', 'chat-100', 'Conversation Starter', 'Sent 100 messages in community chat.', 'messages-square', 'community', 'auto', '{"type":"community_messages","threshold":100}', 820, true),
  ('awd-chat-500', 'chat-500', 'Community Pillar', 'Sent 500 messages - you keep us connected.', 'radio', 'community', 'auto', '{"type":"community_messages","threshold":500}', 830, true),
  ('awd-profile-complete', 'profile-complete', 'Profile Pro', 'Filled out your neighbor bio.', 'user-check', 'profile', 'auto', '{"type":"has_bio","threshold":1}', 900, true),
  ('awd-app-reviewer', 'app-reviewer', 'Voice Heard', 'Left a review of the app for the community.', 'pen-line', 'profile', 'auto', '{"type":"has_app_review","threshold":1}', 910, true),
  ('awd-combined-10', 'combined-giving-10', 'Circle Keeper', 'Gave and received 10+ items combined.', 'circle', 'giving', 'auto', '{"type":"combined_giving","threshold":10}', 950, true),
  ('awd-combined-25', 'combined-giving-25', 'Full Circle', 'Gave and received 25+ items combined.', 'circle', 'giving', 'auto', '{"type":"combined_giving","threshold":25}', 960, true),
  ('awd-combined-50', 'combined-giving-50', 'Sharing Legend', 'Gave and received 50+ items combined.', 'infinity', 'giving', 'auto', '{"type":"combined_giving","threshold":50}', 970, true),
  ('awd-staff-star', 'staff-star', 'Staff Star', 'Recognized by staff for outstanding community spirit.', 'shield', 'staff', 'manual', NULL, 1000, false),
  ('awd-community-hero', 'community-hero', 'Community Hero', 'Hand-picked by staff for going above and beyond.', 'medal', 'staff', 'manual', NULL, 1010, false),
  ('awd-kindness-champion', 'kindness-champion', 'Kindness Champion', 'Awarded by staff for exceptional kindness.', 'heart-handshake', 'staff', 'manual', NULL, 1020, false)
ON CONFLICT (slug) DO NOTHING;

-- Backfill join ranks for existing users
WITH ranked AS (
  SELECT uid, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, uid ASC) AS rn
  FROM public.users
  WHERE "joinRank" IS NULL
)
UPDATE public.users u
SET "joinRank" = ranked.rn
FROM ranked
WHERE u.uid = ranked.uid;

-- Backfill milestone + auto awards for existing users
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT uid, "joinRank" FROM public.users WHERE "joinRank" IS NOT NULL LOOP
    PERFORM public.grant_join_milestone_awards(u.uid, u."joinRank");
    PERFORM public.evaluate_auto_awards_for_user(u.uid);
  END LOOP;
END $$;


-- =========================================================
-- SECURITY HELPERS & RLS
-- =========================================================

-- Sacramento Buy Nothing — security helpers & RLS
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
  SELECT public.community_member_count() >= 500;
$$;

GRANT EXECUTE ON FUNCTION public.community_member_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.events_unlocked() TO authenticated;
GRANT EXECUTE ON FUNCTION public.awards_unlocked() TO authenticated;

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
    OR public.is_staff()
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

-- Public profile view (no email) — use for neighbor lookups.
-- Includes goGetEnabled so neighbors can see whether the other party
-- accepts app-supported pickup coordination before starting Go Get.
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
  "goGetEnabled",
  "createdAt",
  "lastActiveAt"
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
DROP POLICY IF EXISTS "items_select_public_active" ON public.items;
DROP POLICY IF EXISTS "items_select_authenticated" ON public.items;
DROP POLICY IF EXISTS "items_insert_own" ON public.items;
DROP POLICY IF EXISTS "items_update_own" ON public.items;
DROP POLICY IF EXISTS "items_delete_own" ON public.items;

CREATE POLICY "items_select_authenticated" ON public.items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "items_select_public_active" ON public.items
  FOR SELECT USING (status = 'active');

CREATE POLICY "items_insert_own" ON public.items
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "items_update_own" ON public.items
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "items_delete_own" ON public.items
  FOR DELETE USING (auth.uid()::text = "userId");

-- Prefix-only listing body so the feed never downloads multi-MB data:image photos.
CREATE OR REPLACE FUNCTION public.item_feed_description(item_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE
    WHEN i.description IS NULL THEN ''
    WHEN position('data:image' in i.description) = 0 THEN i.description
    ELSE trim(split_part(i.description, '[PHOTOS:', 1))
  END
  FROM public.items i
  WHERE i.id = item_id;
$$;

GRANT EXECUTE ON FUNCTION public.item_feed_description(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.item_feed_image_url_map()
RETURNS TABLE(id text, image_urls text[])
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    i.id,
    COALESCE(
      (
        SELECT array_agg(DISTINCT u ORDER BY u)
        FROM (
          SELECT trim(part) AS u
          FROM regexp_split_to_table(
            COALESCE(substring(i.description FROM '\[PHOTOS:\s*([^\]]+)\]'), ''),
            '\|'
          ) AS part
          WHERE trim(part) LIKE 'http%'
          UNION ALL
          SELECT i."imageUrl"
          WHERE i."imageUrl" LIKE 'http%'
          UNION ALL
          SELECT (regexp_match(i.description, '\[Photo\]:\s*(\S+)', 'i'))[1]
          WHERE (regexp_match(i.description, '\[Photo\]:\s*(\S+)', 'i'))[1] LIKE 'http%'
        ) AS urls(u)
        WHERE u IS NOT NULL AND u <> ''
      ),
      ARRAY[]::text[]
    ) AS image_urls
  FROM public.items i;
$$;

GRANT EXECUTE ON FUNCTION public.item_feed_image_url_map() TO anon, authenticated, service_role;

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

DROP POLICY IF EXISTS "facebook_pickup_groups_select" ON public.facebook_pickup_groups;
DROP POLICY IF EXISTS "facebook_pickup_groups_write" ON public.facebook_pickup_groups;

CREATE POLICY "facebook_pickup_groups_select" ON public.facebook_pickup_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "facebook_pickup_groups_write" ON public.facebook_pickup_groups
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

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
-- 8b. GO GET SESSIONS, LIVE LOCATION & VIOLATIONS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "go_get_sessions_select" ON public.go_get_sessions;
DROP POLICY IF EXISTS "go_get_sessions_write" ON public.go_get_sessions;

CREATE POLICY "go_get_sessions_select" ON public.go_get_sessions
  FOR SELECT USING (
    auth.uid()::text IN ("fulfillerUserId", "requesterUserId")
    OR public.is_staff()
  );

-- Both sides can advance their own session (accept/decline availability, mark
-- ready, start the trip, cancel); the app enforces exactly which transitions
-- each role may make, matching how item_claim_requests/claim writes work above.
CREATE POLICY "go_get_sessions_write" ON public.go_get_sessions
  FOR ALL USING (
    auth.uid()::text IN ("fulfillerUserId", "requesterUserId")
    OR public.is_staff()
  )
  WITH CHECK (
    auth.uid()::text IN ("fulfillerUserId", "requesterUserId")
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "go_get_live_locations_select" ON public.go_get_live_locations;
DROP POLICY IF EXISTS "go_get_live_locations_write" ON public.go_get_live_locations;

CREATE POLICY "go_get_live_locations_select" ON public.go_get_live_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId"
        AND (auth.uid()::text IN (s."fulfillerUserId", s."requesterUserId") OR public.is_staff())
    )
  );

-- Only the traveling requester's device ever writes its own live position.
CREATE POLICY "go_get_live_locations_write" ON public.go_get_live_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId" AND s."requesterUserId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId" AND s."requesterUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "go_get_fulfiller_live_locations_select" ON public.go_get_fulfiller_live_locations;
DROP POLICY IF EXISTS "go_get_fulfiller_live_locations_write" ON public.go_get_fulfiller_live_locations;

CREATE POLICY "go_get_fulfiller_live_locations_select" ON public.go_get_fulfiller_live_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId"
        AND (auth.uid()::text IN (s."fulfillerUserId", s."requesterUserId") OR public.is_staff())
    )
  );

-- Only the fulfiller/poster may write their own live position.
CREATE POLICY "go_get_fulfiller_live_locations_write" ON public.go_get_fulfiller_live_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId" AND s."fulfillerUserId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.go_get_sessions s
      WHERE s.id = "sessionId" AND s."fulfillerUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "user_violations_select" ON public.user_violations;
DROP POLICY IF EXISTS "user_violations_insert" ON public.user_violations;
DROP POLICY IF EXISTS "user_violations_update" ON public.user_violations;

CREATE POLICY "user_violations_select" ON public.user_violations
  FOR SELECT USING (
    auth.uid()::text IN ("userId", "reportedByUserId")
    OR public.is_staff()
  );

CREATE POLICY "user_violations_insert" ON public.user_violations
  FOR INSERT WITH CHECK (auth.uid()::text = "reportedByUserId" OR public.is_staff());

-- Staff confirm/dismiss and decide appeals; the accused may only file an appeal
-- on their own record. Rank-specific actions (appeal decisions require
-- city_administrator+) are enforced client-side, the same pattern already used
-- for canStaffBan/canStaffEditUser elsewhere — RLS here just checks is_staff().
CREATE POLICY "user_violations_update" ON public.user_violations
  FOR UPDATE USING (
    auth.uid()::text = "userId"
    OR public.is_staff()
  )
  WITH CHECK (
    auth.uid()::text = "userId"
    OR public.is_staff()
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
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "community_events_insert" ON public.community_events
  FOR INSERT WITH CHECK (
    auth.uid()::text = "userId"
    AND (public.events_unlocked() OR public.is_staff())
  );

CREATE POLICY "community_events_update" ON public.community_events
  FOR UPDATE USING (auth.uid()::text = "userId" OR public.is_staff())
  WITH CHECK (auth.uid()::text = "userId" OR public.is_staff());

CREATE POLICY "community_events_delete" ON public.community_events
  FOR DELETE USING (
    (auth.uid()::text = "userId" AND (public.events_unlocked() OR public.is_staff()))
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "Allow read event rsvps" ON public.event_rsvps;
DROP POLICY IF EXISTS "Allow write event rsvps" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_select" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_write_own" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_insert" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_update" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_delete" ON public.event_rsvps;

CREATE POLICY "event_rsvps_select" ON public.event_rsvps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "event_rsvps_insert" ON public.event_rsvps
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "event_rsvps_update" ON public.event_rsvps
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "event_rsvps_delete" ON public.event_rsvps
  FOR DELETE USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Allow read event comments" ON public.event_comments;
DROP POLICY IF EXISTS "Allow write event comments" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_select" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_write_own" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_insert" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_update" ON public.event_comments;
DROP POLICY IF EXISTS "event_comments_delete" ON public.event_comments;

CREATE POLICY "event_comments_select" ON public.event_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

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
-- 9b. HELP ANNOUNCEMENTS, COMMENTS, CONTENT VOTES
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Allow read help announcements" ON public.help_announcements;
DROP POLICY IF EXISTS "Allow write help announcements" ON public.help_announcements;
DROP POLICY IF EXISTS "help_announcements_select" ON public.help_announcements;
DROP POLICY IF EXISTS "help_announcements_write" ON public.help_announcements;
CREATE POLICY "help_announcements_select" ON public.help_announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "help_announcements_write" ON public.help_announcements
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Allow read app update comments" ON public.app_update_comments;
DROP POLICY IF EXISTS "Allow write app update comments" ON public.app_update_comments;
DROP POLICY IF EXISTS "app_update_comments_select" ON public.app_update_comments;
DROP POLICY IF EXISTS "app_update_comments_write" ON public.app_update_comments;
CREATE POLICY "app_update_comments_select" ON public.app_update_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "app_update_comments_write" ON public.app_update_comments
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Allow read help announcement comments" ON public.help_announcement_comments;
DROP POLICY IF EXISTS "Allow write help announcement comments" ON public.help_announcement_comments;
DROP POLICY IF EXISTS "help_announcement_comments_select" ON public.help_announcement_comments;
DROP POLICY IF EXISTS "help_announcement_comments_write" ON public.help_announcement_comments;
CREATE POLICY "help_announcement_comments_select" ON public.help_announcement_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "help_announcement_comments_write" ON public.help_announcement_comments
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Allow read community content votes" ON public.community_content_votes;
DROP POLICY IF EXISTS "Allow write community content votes" ON public.community_content_votes;
DROP POLICY IF EXISTS "content_votes_select" ON public.community_content_votes;
DROP POLICY IF EXISTS "content_votes_write" ON public.community_content_votes;
CREATE POLICY "content_votes_select" ON public.community_content_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "content_votes_write" ON public.community_content_votes
  FOR ALL USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.user_notifications;
CREATE POLICY "Users read own notifications" ON public.user_notifications
  FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users mark own notifications read" ON public.user_notifications
  FOR UPDATE USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users manage own saved items" ON public.saved_items;
CREATE POLICY "Users manage own saved items" ON public.saved_items
  FOR ALL USING (auth.uid()::text = "userId") WITH CHECK (auth.uid()::text = "userId");


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

-- =========================================================
-- STAFF APPLICATIONS — neighbors apply; team reviews Yes / No / Maybe
-- =========================================================
CREATE TABLE IF NOT EXISTS public.staff_applications (
  id TEXT PRIMARY KEY,
  "applicantUserId" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "applicantEmail" TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  statement TEXT NOT NULL,
  "responseTime" TEXT NOT NULL,
  "otherGroups" TEXT NOT NULL DEFAULT '',
  "otherInfo" TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  "reviewedByUserId" TEXT,
  "reviewedByName" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_applications DROP CONSTRAINT IF EXISTS staff_applications_role_check;
ALTER TABLE public.staff_applications ADD CONSTRAINT staff_applications_role_check
  CHECK (role IN ('city_moderator', 'city_administrator', 'city_manager', 'director'));

ALTER TABLE public.staff_applications DROP CONSTRAINT IF EXISTS staff_applications_status_check;
ALTER TABLE public.staff_applications ADD CONSTRAINT staff_applications_status_check
  CHECK (status IN ('pending', 'yes', 'no', 'maybe'));

CREATE UNIQUE INDEX IF NOT EXISTS staff_applications_one_pending
  ON public.staff_applications ("applicantUserId")
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS staff_applications_pending_created_idx
  ON public.staff_applications (status, "createdAt" ASC);

CREATE INDEX IF NOT EXISTS staff_applications_applicant_idx
  ON public.staff_applications ("applicantUserId", "createdAt" DESC);

ALTER TABLE public.staff_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_applications_select" ON public.staff_applications;
CREATE POLICY "staff_applications_select" ON public.staff_applications
  FOR SELECT USING (
    auth.uid()::text = "applicantUserId"
    OR public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  );

DROP POLICY IF EXISTS "staff_applications_insert" ON public.staff_applications;
CREATE POLICY "staff_applications_insert" ON public.staff_applications
  FOR INSERT WITH CHECK (
    auth.uid()::text = "applicantUserId"
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "staff_applications_update" ON public.staff_applications;
CREATE POLICY "staff_applications_update" ON public.staff_applications
  FOR UPDATE USING (
    public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  )
  WITH CHECK (
    public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  );

CREATE OR REPLACE FUNCTION public.my_staff_apply_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  blocked boolean := false;
  pending_row public.staff_applications;
  last_row public.staff_applications;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_applications
    WHERE "applicantUserId" = actor_uid AND status = 'no'
  ) INTO blocked;

  SELECT * INTO pending_row
  FROM public.staff_applications
  WHERE "applicantUserId" = actor_uid AND status = 'pending'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  SELECT * INTO last_row
  FROM public.staff_applications
  WHERE "applicantUserId" = actor_uid AND status IN ('yes', 'no', 'maybe')
  ORDER BY COALESCE("reviewedAt", "updatedAt", "createdAt") DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'blocked', blocked,
    'pending', CASE WHEN pending_row.id IS NULL THEN NULL ELSE to_jsonb(pending_row) END,
    'lastDecision', CASE WHEN last_row.id IS NULL THEN NULL ELSE to_jsonb(last_row) END,
    'seatCounts', jsonb_build_object(
      'city_moderator', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'city_moderator'),
      'city_administrator', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'city_administrator'),
      'city_manager', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'city_manager'),
      'director', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'director')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_staff_application(
  apply_role text,
  statement text,
  response_time text,
  other_groups text,
  other_info text
)
RETURNS public.staff_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  actor public.users%ROWTYPE;
  new_row public.staff_applications;
  seat_limit integer;
  seat_count integer;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO actor FROM public.users WHERE uid = actor_uid;
  IF actor.uid IS NULL THEN
    RAISE EXCEPTION 'Profile required';
  END IF;

  IF public.is_staff_role(actor.role) THEN
    RAISE EXCEPTION 'You are already on the staff team';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_applications
    WHERE "applicantUserId" = actor_uid AND status = 'no'
  ) THEN
    RAISE EXCEPTION 'Staff applications are not open for this account';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_applications
    WHERE "applicantUserId" = actor_uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a staff application waiting';
  END IF;

  IF apply_role NOT IN ('city_moderator', 'city_administrator', 'city_manager', 'director') THEN
    RAISE EXCEPTION 'Pick a staff role';
  END IF;

  seat_limit := CASE apply_role
    WHEN 'city_moderator' THEN 5
    WHEN 'city_administrator' THEN 3
    WHEN 'city_manager' THEN 1
    WHEN 'director' THEN 1
    ELSE NULL
  END;

  IF seat_limit IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO seat_count
    FROM public.users
    WHERE role = apply_role;
    IF seat_count >= seat_limit THEN
      RAISE EXCEPTION 'That staff seat is filled';
    END IF;
  END IF;

  IF COALESCE(btrim(statement), '') = '' THEN
    RAISE EXCEPTION 'Tell us why you want this role';
  END IF;

  IF COALESCE(btrim(response_time), '') = '' THEN
    RAISE EXCEPTION 'How quickly can you respond?';
  END IF;

  INSERT INTO public.staff_applications (
    id,
    "applicantUserId",
    "applicantName",
    "applicantEmail",
    neighborhood,
    role,
    statement,
    "responseTime",
    "otherGroups",
    "otherInfo",
    status,
    "createdAt",
    "updatedAt"
  ) VALUES (
    'sapp_' || replace(gen_random_uuid()::text, '-', ''),
    actor_uid,
    COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Neighbor'),
    COALESCE(actor.email, ''),
    COALESCE(actor.neighborhood, ''),
    apply_role,
    btrim(statement),
    btrim(response_time),
    COALESCE(btrim(other_groups), ''),
    COALESCE(btrim(other_info), ''),
    'pending',
    NOW(),
    NOW()
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_staff_application(app_id text, decision text)
RETURNS public.staff_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  actor public.users%ROWTYPE;
  app_row public.staff_applications;
  seat_limit integer;
  seat_count integer;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO actor FROM public.users WHERE uid = actor_uid;
  IF public.role_rank(actor.role) < public.role_rank('city_administrator') THEN
    RAISE EXCEPTION 'City Administrator rank or above is required';
  END IF;

  IF decision NOT IN ('yes', 'no', 'maybe') THEN
    RAISE EXCEPTION 'Decision must be yes, no, or maybe';
  END IF;

  SELECT * INTO app_row FROM public.staff_applications WHERE id = app_id FOR UPDATE;
  IF app_row.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF app_row.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'That application is no longer waiting';
  END IF;

  IF decision = 'yes' THEN
    IF actor.role IS DISTINCT FROM 'director'
       AND public.role_rank(actor.role) <= public.role_rank(app_row.role) THEN
      RAISE EXCEPTION 'A higher rank needs to approve this seat';
    END IF;

    seat_limit := CASE app_row.role
      WHEN 'city_moderator' THEN 5
      WHEN 'city_administrator' THEN 3
      WHEN 'city_manager' THEN 1
      WHEN 'director' THEN 1
      ELSE NULL
    END;

    IF seat_limit IS NOT NULL THEN
      SELECT COUNT(*)::integer INTO seat_count
      FROM public.users
      WHERE role = app_row.role
        AND uid IS DISTINCT FROM app_row."applicantUserId";
      IF seat_count >= seat_limit THEN
        RAISE EXCEPTION 'That staff seat is full. Demote someone first.';
      END IF;
    END IF;

    UPDATE public.users
    SET role = app_row.role
    WHERE uid = app_row."applicantUserId";
  END IF;

  UPDATE public.staff_applications
  SET
    status = decision,
    "reviewedByUserId" = actor_uid,
    "reviewedByName" = COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff'),
    "reviewedAt" = NOW(),
    "updatedAt" = NOW()
  WHERE id = app_id
  RETURNING * INTO app_row;

  INSERT INTO public.moderation_audit_log (
    id, "actorUserId", "actorName", "actorRole",
    "targetUserId", "targetName", action, detail, "createdAt"
  ) VALUES (
    'mod_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8),
    actor_uid,
    COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff'),
    actor.role,
    app_row."applicantUserId",
    app_row."applicantName",
    'staff_application_' || decision,
    COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff')
      || ' marked staff application '
      || decision
      || ' for '
      || app_row."applicantName"
      || ' ('
      || app_row.role
      || ')',
    NOW()
  );

  BEGIN
    INSERT INTO public.user_notifications (
      id, "userId", kind, title, body, "actorUserId", "actorName", "eventType", tag, url, "createdAt"
    ) VALUES (
      'un_sapp_' || app_row.id,
      app_row."applicantUserId",
      'account_update',
      CASE decision
        WHEN 'yes' THEN 'You''re on the staff team'
        ELSE 'Staff application update'
      END,
      CASE decision
        WHEN 'yes' THEN
          'Welcome — you are now a ' || CASE app_row.role
            WHEN 'city_moderator' THEN 'City Moderator'
            WHEN 'city_administrator' THEN 'City Administrator'
            WHEN 'city_manager' THEN 'City Manager'
            ELSE 'Sacramento Buy Nothing Director'
          END || '. Staff tools are in the app.'
        WHEN 'maybe' THEN
          'Your ' || CASE app_row.role
            WHEN 'city_moderator' THEN 'City Moderator'
            WHEN 'city_administrator' THEN 'City Administrator'
            WHEN 'city_manager' THEN 'City Manager'
            ELSE 'Sacramento Buy Nothing Director'
          END || ' application came back as maybe. You can apply again for that role or any other from Account.'
        ELSE
          'Your ' || CASE app_row.role
            WHEN 'city_moderator' THEN 'City Moderator'
            WHEN 'city_administrator' THEN 'City Administrator'
            WHEN 'city_manager' THEN 'City Manager'
            ELSE 'Sacramento Buy Nothing Director'
          END || ' application was not approved. This account can''t apply for staff roles.'
      END,
      actor_uid,
      COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff'),
      'account_update',
      'staff-apply-' || app_row.id,
      '/profile',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;

  RETURN app_row;
END;
$$;

REVOKE ALL ON FUNCTION public.my_staff_apply_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_staff_apply_state() TO authenticated;
REVOKE ALL ON FUNCTION public.submit_staff_application(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_staff_application(text, text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_staff_application(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_staff_application(text, text) TO authenticated;

-- =========================================================
-- GO GET VIOLATIONS: strike counting + auto-lock at 6
--
-- Runs as a DB trigger (not client-side) so the 6-strike lockout is atomic and
-- can't be missed/raced by two moderators reviewing at once. See status/
-- countsTowardStrikes semantics documented above user_violations.
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_violation_strike_count(target_uid text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.user_violations
  WHERE "userId" = target_uid AND "countsTowardStrikes" = true;
$$;

GRANT EXECUTE ON FUNCTION public.user_violation_strike_count(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.on_user_violation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  strikes INT;
  current_status TEXT;
BEGIN
  strikes := public.user_violation_strike_count(NEW."userId");

  IF strikes >= 6 THEN
    SELECT "accountStatus" INTO current_status FROM public.users WHERE uid = NEW."userId";
    IF current_status IS DISTINCT FROM 'banned' AND current_status IS DISTINCT FROM 'locked' THEN
      UPDATE public.users SET "accountStatus" = 'locked' WHERE uid = NEW."userId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_violation_change ON public.user_violations;
CREATE TRIGGER on_user_violation_change
  AFTER INSERT OR UPDATE OF status, "countsTowardStrikes" ON public.user_violations
  FOR EACH ROW EXECUTE FUNCTION public.on_user_violation_change();

-- Only a city_administrator+ may lift a violation-triggered lock (unlike
-- suspensions, this is never time-based / auto-lifted).
CREATE OR REPLACE FUNCTION public.staff_unlock_violation_account(target_uid text, note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  actor_role text;
BEGIN
  SELECT role INTO actor_role FROM public.users WHERE uid = actor_uid;
  IF public.role_rank(actor_role) < public.role_rank('city_administrator') THEN
    RAISE EXCEPTION 'city_administrator+ required to unlock a violation-locked account';
  END IF;

  UPDATE public.users SET "accountStatus" = 'active' WHERE uid = target_uid AND "accountStatus" = 'locked';

  INSERT INTO public.moderation_audit_log (id, "actorUserId", "actorName", "targetUserId", "targetName", action, detail, "createdAt")
  SELECT
    'modaudit_' || target_uid || '_' || extract(epoch FROM now())::text,
    actor_uid,
    COALESCE((SELECT "displayName" FROM public.users WHERE uid = actor_uid), 'Staff'),
    target_uid,
    COALESCE((SELECT "displayName" FROM public.users WHERE uid = target_uid), 'Neighbor'),
    'unlock_violations',
    note,
    NOW();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_unlock_violation_account(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_unlock_violation_account(text, text) TO authenticated;



-- =========================================================
-- REALTIME — live sync for all public tables
-- =========================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'items',
    'chats',
    'messages',
    'item_votes',
    'item_comments',
    'item_claims',
    'listing_subitems',
    'item_claim_requests',
    'users',
    'user_blocks',
    'message_requests',
    'moderation_audit_log',
    'user_reports',
    'support_tickets',
    'support_ticket_messages',
    'community_events',
    'event_rsvps',
    'event_comments',
    'director_message',
    'staff_messages',
    'staff_applications',
    'app_updates',
    'app_reviews',
    'push_subscriptions',
    'notification_preferences',
    'user_notifications',
    'saved_items',
    'award_definitions',
    'user_awards',
    'help_announcements',
    'help_announcement_comments',
    'app_update_comments',
    'community_content_votes',
    'go_get_sessions',
    'go_get_live_locations',
    'go_get_fulfiller_live_locations',
    'user_violations'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;



-- =========================================================
-- COMMUNITY CHAT SEEDS
-- =========================================================

-- Community global and staff-only group chats (reuse chats + messages tables).
-- Run once in Supabase SQL Editor. Safe to re-run.

INSERT INTO public.chats (
  id,
  "participantIds",
  "participantNames",
  "participantPhotos",
  "lastMessageText",
  "lastMessageAt",
  "itemId",
  "itemTitle"
) VALUES
(
  'community-global',
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Welcome to the community chat — say hello!',
  NOW(),
  '',
  ''
),
(
  'community-staff',
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Staff lounge — team coordination.',
  NOW(),
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;


-- =========================================================
-- PUSH WEBHOOKS (configure in Dashboard — not SQL)
-- =========================================================

-- =========================================================
-- SERVER-SIDE PUSH WEBHOOKS — complete neighbor + staff list
-- =========================================================
--
-- Run complete-schema.sql first so all tables exist.
--
-- EASIEST (recommended): Supabase Dashboard → Database → Webhooks — see table below.
-- Legacy SQL webhook installers are removed; Dashboard webhooks send the
-- correct { type, table, record } payload. SQL triggers send an empty body and are skipped.
--
-- Auth (either works on /api/webhooks/supabase-push):
--   Authorization: Bearer <SUPABASE_PUSH_WEBHOOK_SECRET>   (recommended)
--   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>      (legacy fallback)
-- URL (all webhooks): https://sacramentobuynothing.com/api/webhooks/supabase-push
--
-- | Webhook name          | Table                   | Events         | Who gets notified                |
-- |-----------------------|-------------------------|----------------|----------------------------------|
-- | push-users-join       | users                   | INSERT         | Directors: new neighbors         |
-- | push-users-leave      | users                   | DELETE         | Directors: departures            |
-- | push-listings-insert  | items                   | INSERT         | Discover + directors             |
-- | push-listings-update  | items                   | UPDATE         | Owner status, saved-item alerts  |
-- | push-dm-requests      | message_requests        | INSERT, UPDATE | DM requests + directors          |
-- | push-claim-reqs       | item_claim_requests     | INSERT         | Giver + directors                |
-- | push-item-claims      | item_claims             | INSERT         | Listing owner (claim)            |
-- | push-comments         | item_comments           | INSERT         | Owner + saved-item bookmarkers   |
-- | push-votes            | item_votes              | INSERT, UPDATE | Listing owner (up/down)          |
-- | push-messages         | messages                | INSERT         | Chat participant                 |
-- | push-moderation       | moderation_audit_log    | INSERT         | Directors                        |
-- | push-reports          | user_reports            | INSERT         | Staff inbox                      |
-- | push-support          | support_ticket_messages | INSERT         | Support + staff inbox            |
-- | push-app-updates      | app_updates             | INSERT         | Director changelog (app updates) |
-- | push-announcements    | help_announcements      | INSERT         | Staff help announcements         |
--
-- items UPDATE covers: status changes, owner listing-status alerts, saved-item
-- status alerts, pickup-scheduled alerts (pending_pickup), and saved-item alerts
-- when the owner edits/saves their post.
--
-- moderation_audit_log INSERT covers director moderation alerts and account-update
-- pushes to suspended/banned neighbors (suspend, unsuspend, ban, unban, set_role).
--
-- Daily cron (Vercel): /api/cron/notification-jobs — listing expiry + pickup reminders.
