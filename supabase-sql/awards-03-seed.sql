-- STEP 3 of 3 — Awards seed data + backfill
-- Run AFTER awards-01-tables.sql AND awards-02-functions.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'award_definitions'
  ) THEN
    RAISE EXCEPTION 'Tables missing. Run awards-01-tables.sql first, then awards-02-functions.sql.';
  END IF;
END $$;

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
