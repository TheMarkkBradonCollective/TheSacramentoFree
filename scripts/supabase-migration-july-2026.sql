-- =========================================================
-- JULY 2026 RELEASE — incremental migration
-- Run once in Supabase SQL Editor on an EXISTING production database.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS.
--
-- What this adds:
--   • Pickup attribution columns + facebook_pickup_groups
--   • Go Get sessions + live location tables
--   • user_violations + 6-strike account lock ('locked' status)
--   • RLS policies, strike triggers, realtime publication
--   • 7 app_updates changelog rows + 1 help_announcement
--
-- For a FULL schema re-apply (fresh DB or disaster recovery), use instead:
--   supabase-complete.sql  (project root — entire site schema + seeds)
-- =========================================================

-- ---------------------------------------------------------
-- 0. Account status — add 'locked' for Go Get violation lockout
-- ---------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "accountStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "moderationNote" TEXT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
  CHECK ("accountStatus" IN ('active', 'suspended', 'banned', 'locked'));

-- ---------------------------------------------------------
-- 1. Pickup attribution (quick-claim credit)
-- ---------------------------------------------------------
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

UPDATE public.items i
SET
  "pickupAttributionType" = 'other',
  "pickupAttributionLabel" = 'Other',
  "updatedAt" = NOW()
WHERE i.status = 'completed'
  AND i."pickupAttributionType" IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.item_claims c WHERE c."itemId" = i.id);

DROP POLICY IF EXISTS "facebook_pickup_groups_select" ON public.facebook_pickup_groups;
DROP POLICY IF EXISTS "facebook_pickup_groups_write" ON public.facebook_pickup_groups;

CREATE POLICY "facebook_pickup_groups_select" ON public.facebook_pickup_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "facebook_pickup_groups_write" ON public.facebook_pickup_groups
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------
-- 2. Go Get sessions + live locations
-- ---------------------------------------------------------
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

ALTER TABLE public.go_get_sessions ADD COLUMN IF NOT EXISTS "fulfillerSharingLocation" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.go_get_sessions DROP CONSTRAINT IF EXISTS go_get_sessions_item_type_check;
ALTER TABLE public.go_get_sessions ADD CONSTRAINT go_get_sessions_item_type_check
  CHECK ("itemType" IN ('giveaway', 'looking', 'trade'));

ALTER TABLE public.go_get_sessions DROP CONSTRAINT IF EXISTS go_get_sessions_handshake_check;
ALTER TABLE public.go_get_sessions ADD CONSTRAINT go_get_sessions_handshake_check
  CHECK ("handshakeMode" IN ('instant', 'availability'));

ALTER TABLE public.go_get_sessions DROP CONSTRAINT IF EXISTS go_get_sessions_status_check;
ALTER TABLE public.go_get_sessions ADD CONSTRAINT go_get_sessions_status_check
  CHECK (status IN (
    'awaiting_availability', 'window_offered', 'scheduled', 'active', 'arrived',
    'completed', 'cancelled', 'expired', 'disputed'
  ));

ALTER TABLE public.go_get_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS go_get_sessions_item_idx ON public.go_get_sessions ("itemId", status);
CREATE INDEX IF NOT EXISTS go_get_sessions_fulfiller_idx ON public.go_get_sessions ("fulfillerUserId", status);
CREATE INDEX IF NOT EXISTS go_get_sessions_requester_idx ON public.go_get_sessions ("requesterUserId", status);
CREATE INDEX IF NOT EXISTS go_get_sessions_chat_idx ON public.go_get_sessions ("chatId");

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

CREATE TABLE IF NOT EXISTS public.go_get_fulfiller_live_locations (
  "sessionId" TEXT PRIMARY KEY REFERENCES public.go_get_sessions(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.go_get_fulfiller_live_locations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 3. Go Get violations + strike lockout
-- ---------------------------------------------------------
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

-- RLS: Go Get + violations
DROP POLICY IF EXISTS "go_get_sessions_select" ON public.go_get_sessions;
DROP POLICY IF EXISTS "go_get_sessions_write" ON public.go_get_sessions;

CREATE POLICY "go_get_sessions_select" ON public.go_get_sessions
  FOR SELECT USING (
    auth.uid()::text IN ("fulfillerUserId", "requesterUserId")
    OR public.is_staff()
  );

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

CREATE POLICY "user_violations_update" ON public.user_violations
  FOR UPDATE USING (
    auth.uid()::text = "userId"
    OR public.is_staff()
  )
  WITH CHECK (
    auth.uid()::text = "userId"
    OR public.is_staff()
  );

-- Strike counting + auto-lock at 6
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

-- ---------------------------------------------------------
-- 4. Realtime publication (optional — ignore errors if already added)
-- ---------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
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

-- ---------------------------------------------------------
-- 5. App updates (changelog) + help announcement (news)
-- ---------------------------------------------------------
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
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "updatedAt" = NOW();

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
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "authorName" = EXCLUDED."authorName",
  "authorTitle" = EXCLUDED."authorTitle",
  "updatedAt" = NOW();

-- Staff oversight: allow staff to read all chats (including neighbor DMs) for moderation.
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
