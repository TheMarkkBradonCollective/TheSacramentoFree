-- STEP 2 of 3 — Awards functions, triggers, RLS
-- Run AFTER awards-01-tables.sql, then run awards-03-seed.sql

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

-- Staff helpers (safe if security-hardening.sql already ran)
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
