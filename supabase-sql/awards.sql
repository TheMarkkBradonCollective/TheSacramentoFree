-- Neighbor Awards: definitions, grants, auto-rules, join-rank milestones.
-- Run once in Supabase → SQL Editor.

-- =========================================================
-- 1. SCHEMA
-- =========================================================

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
  SELECT COALESCE(SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END), 0)::INT INTO upvotes_received
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

-- Backfill milestone awards for existing users
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

-- =========================================================
-- 5. RLS
-- =========================================================

ALTER TABLE public.award_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "award_definitions_read" ON public.award_definitions;
CREATE POLICY "award_definitions_read" ON public.award_definitions
  FOR SELECT USING ("isActive" = true OR public.is_staff());

DROP POLICY IF EXISTS "award_definitions_staff_write" ON public.award_definitions;
CREATE POLICY "award_definitions_staff_write" ON public.award_definitions
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "user_awards_read" ON public.user_awards;
CREATE POLICY "user_awards_read" ON public.user_awards
  FOR SELECT USING ("revokedAt" IS NULL);

DROP POLICY IF EXISTS "user_awards_staff_write" ON public.user_awards;
CREATE POLICY "user_awards_staff_write" ON public.user_awards
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- =========================================================
-- 6. REALTIME
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'award_definitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.award_definitions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_awards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_awards;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =========================================================
-- 7. SEED AWARD DEFINITIONS
-- =========================================================

INSERT INTO public.award_definitions (id, slug, title, description, icon, category, "triggerType", "autoRule", "sortOrder", "requiresUnlock")
VALUES
  -- Join milestones (earned at signup, visible after unlock)
  ('awd-first-hundred', 'first-hundred', 'First Hundred', 'One of the first 100 neighbors to join Sacramento Buy Nothing.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":100}', 10, true),
  ('awd-first-two-hundred', 'first-two-hundred', 'First Two Hundred', 'Among the first 200 neighbors in our sharing circle.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":200}', 20, true),
  ('awd-first-three-hundred', 'first-three-hundred', 'First Three Hundred', 'Helped build momentum as one of the first 300 neighbors.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":300}', 30, true),
  ('awd-first-four-hundred', 'first-four-hundred', 'First Four Hundred', 'A founding neighbor from the first 400 members.', 'users', 'milestone', 'auto', '{"type":"join_rank_max","threshold":400}', 40, true),
  ('awd-first-five-hundred', 'first-five-hundred', 'First Five Hundred', 'A true founding neighbor — one of the first 500 members.', 'crown', 'milestone', 'auto', '{"type":"join_rank_max","threshold":500}', 50, true),

  -- Listing & giving
  ('awd-first-listing', 'first-listing', 'First Post', 'Posted your first listing on the feed.', 'plus-circle', 'giving', 'auto', '{"type":"items_posted","threshold":1}', 100, true),
  ('awd-listings-5', 'listings-5', 'Regular Poster', 'Posted 5 listings for neighbors.', 'layers', 'giving', 'auto', '{"type":"items_posted","threshold":5}', 110, true),
  ('awd-listings-10', 'listings-10', 'Feed Contributor', 'Posted 10 listings for the community.', 'layers', 'giving', 'auto', '{"type":"items_posted","threshold":10}', 120, true),
  ('awd-listings-25', 'listings-25', 'Community Voice', 'Posted 25 listings — you keep the feed alive.', 'megaphone', 'giving', 'auto', '{"type":"items_posted","threshold":25}', 130, true),
  ('awd-listings-50', 'listings-50', 'Listing Legend', 'Posted 50 listings for Sacramento neighbors.', 'star', 'giving', 'auto', '{"type":"items_posted","threshold":50}', 140, true),

  ('awd-first-gift', 'first-gift', 'First Gift', 'Completed your first giveaway — thank you for giving!', 'gift', 'giving', 'auto', '{"type":"items_given","threshold":1}', 200, true),
  ('awd-gifts-5', 'gifts-5', 'Generous Neighbor', 'Gave away 5 items to neighbors.', 'gift', 'giving', 'auto', '{"type":"items_given","threshold":5}', 210, true),
  ('awd-gifts-10', 'gifts-10', 'Gift Champion', 'Gave away 10 items — incredible generosity.', 'gift', 'giving', 'auto', '{"type":"items_given","threshold":10}', 220, true),
  ('awd-gifts-25', 'gifts-25', 'Sharing Superstar', 'Gave away 25 items to the community.', 'sparkles', 'giving', 'auto', '{"type":"items_given","threshold":25}', 230, true),
  ('awd-gifts-50', 'gifts-50', 'Giving Hero', 'Gave away 50 items — you embody Buy Nothing spirit.', 'heart', 'giving', 'auto', '{"type":"items_given","threshold":50}', 240, true),
  ('awd-gifts-100', 'gifts-100', 'Sacramento Saint', 'Gave away 100 items. Legendary generosity.', 'crown', 'giving', 'auto', '{"type":"items_given","threshold":100}', 250, true),

  -- Claiming & receiving
  ('awd-first-claim', 'first-claim', 'First Claim', 'Claimed your first item from a neighbor.', 'package', 'community', 'auto', '{"type":"items_claimed","threshold":1}', 300, true),
  ('awd-claims-5', 'claims-5', 'Savvy Saver', 'Claimed 5 items from generous neighbors.', 'package', 'community', 'auto', '{"type":"items_claimed","threshold":5}', 310, true),
  ('awd-claims-10', 'claims-10', 'Treasure Hunter', 'Claimed 10 items through the community.', 'package', 'community', 'auto', '{"type":"items_claimed","threshold":10}', 320, true),
  ('awd-claims-25', 'claims-25', 'Community Connector', 'Claimed 25 items — active participant.', 'link', 'community', 'auto', '{"type":"items_claimed","threshold":25}', 330, true),
  ('awd-claims-50', 'claims-50', 'Neighborhood Navigator', 'Claimed 50 items from the sharing circle.', 'compass', 'community', 'auto', '{"type":"items_claimed","threshold":50}', 340, true),

  -- Requests fulfilled
  ('awd-first-fulfilled', 'first-fulfilled', 'Wish Granted', 'Fulfilled your first neighbor request.', 'check-circle', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":1}', 400, true),
  ('awd-fulfilled-5', 'fulfilled-5', 'Helper', 'Fulfilled 5 neighbor requests.', 'hand-heart', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":5}', 410, true),
  ('awd-fulfilled-10', 'fulfilled-10', 'Problem Solver', 'Fulfilled 10 neighbor requests.', 'hand-heart', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":10}', 420, true),
  ('awd-fulfilled-25', 'fulfilled-25', 'Community Angel', 'Fulfilled 25 neighbor requests.', 'sparkles', 'giving', 'auto', '{"type":"requests_fulfilled","threshold":25}', 430, true),

  -- Trades
  ('awd-first-trade', 'first-trade', 'First Trade', 'Completed your first barter trade.', 'repeat', 'community', 'auto', '{"type":"trades_completed","threshold":1}', 500, true),
  ('awd-trades-5', 'trades-5', 'Barter Pro', 'Completed 5 fair trades with neighbors.', 'repeat', 'community', 'auto', '{"type":"trades_completed","threshold":5}', 510, true),
  ('awd-trades-10', 'trades-10', 'Trade Master', 'Completed 10 barter trades.', 'repeat', 'community', 'auto', '{"type":"trades_completed","threshold":10}', 520, true),

  -- Upvotes
  ('awd-first-upvote', 'first-upvote', 'First Cheer', 'Received your first upvote from a neighbor.', 'thumbs-up', 'recognition', 'auto', '{"type":"upvotes_received","threshold":1}', 600, true),
  ('awd-upvotes-10', 'upvotes-10', 'Appreciated', 'Received 10 upvotes on your listings.', 'thumbs-up', 'recognition', 'auto', '{"type":"upvotes_received","threshold":10}', 610, true),
  ('awd-upvotes-25', 'upvotes-25', 'Beloved Neighbor', 'Received 25 upvotes from the community.', 'heart', 'recognition', 'auto', '{"type":"upvotes_received","threshold":25}', 620, true),
  ('awd-upvotes-50', 'upvotes-50', 'Community Favorite', 'Received 50 upvotes — neighbors love what you share.', 'star', 'recognition', 'auto', '{"type":"upvotes_received","threshold":50}', 630, true),
  ('awd-upvotes-100', 'upvotes-100', 'Neighborhood Icon', 'Received 100 upvotes. A true favorite.', 'crown', 'recognition', 'auto', '{"type":"upvotes_received","threshold":100}', 640, true),

  -- Events
  ('awd-first-rsvp', 'first-rsvp', 'Event Goer', 'RSVP''d to your first community event.', 'calendar', 'events', 'auto', '{"type":"event_rsvps","threshold":1}', 700, true),
  ('awd-events-5', 'events-5', 'Community Regular', 'RSVP''d to 5 community events.', 'calendar', 'events', 'auto', '{"type":"event_rsvps","threshold":5}', 710, true),
  ('awd-events-10', 'events-10', 'Event Enthusiast', 'RSVP''d to 10 community events.', 'party-popper', 'events', 'auto', '{"type":"event_rsvps","threshold":10}', 720, true),

  -- Community chat
  ('awd-first-chat', 'first-chat', 'Community Voice', 'Sent your first message in community chat.', 'message-circle', 'community', 'auto', '{"type":"community_messages","threshold":1}', 800, true),
  ('awd-chat-50', 'chat-50', 'Chat Regular', 'Sent 50 messages in community chat.', 'messages-square', 'community', 'auto', '{"type":"community_messages","threshold":50}', 810, true),
  ('awd-chat-100', 'chat-100', 'Conversation Starter', 'Sent 100 messages in community chat.', 'messages-square', 'community', 'auto', '{"type":"community_messages","threshold":100}', 820, true),
  ('awd-chat-500', 'chat-500', 'Community Pillar', 'Sent 500 messages — you keep us connected.', 'radio', 'community', 'auto', '{"type":"community_messages","threshold":500}', 830, true),

  -- Profile & reviews
  ('awd-profile-complete', 'profile-complete', 'Profile Pro', 'Filled out your neighbor bio.', 'user-check', 'profile', 'auto', '{"type":"has_bio","threshold":1}', 900, true),
  ('awd-app-reviewer', 'app-reviewer', 'Voice Heard', 'Left a review of the app for the community.', 'pen-line', 'profile', 'auto', '{"type":"has_app_review","threshold":1}', 910, true),

  -- Combined giving
  ('awd-combined-10', 'combined-giving-10', 'Circle Keeper', 'Gave and received 10+ items combined.', 'circle', 'giving', 'auto', '{"type":"combined_giving","threshold":10}', 950, true),
  ('awd-combined-25', 'combined-giving-25', 'Full Circle', 'Gave and received 25+ items combined.', 'circle', 'giving', 'auto', '{"type":"combined_giving","threshold":25}', 960, true),
  ('awd-combined-50', 'combined-giving-50', 'Sharing Legend', 'Gave and received 50+ items combined.', 'infinity', 'giving', 'auto', '{"type":"combined_giving","threshold":50}', 970, true)

ON CONFLICT (slug) DO NOTHING;

-- Staff-only manual awards (examples)
INSERT INTO public.award_definitions (id, slug, title, description, icon, category, "triggerType", "sortOrder", "requiresUnlock")
VALUES
  ('awd-staff-star', 'staff-star', 'Staff Star', 'Recognized by staff for outstanding community spirit.', 'shield', 'staff', 'manual', 1000, false),
  ('awd-community-hero', 'community-hero', 'Community Hero', 'Hand-picked by staff for going above and beyond.', 'medal', 'staff', 'manual', 1010, false),
  ('awd-kindness-champion', 'kindness-champion', 'Kindness Champion', 'Awarded by staff for exceptional kindness.', 'heart-handshake', 'staff', 'manual', 1020, false)
ON CONFLICT (slug) DO NOTHING;
