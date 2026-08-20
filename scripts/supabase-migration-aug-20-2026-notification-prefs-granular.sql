-- Granular notification preference toggles — Aug 20, 2026
-- Run in Supabase SQL editor on existing production DB.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS "feedPosts" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "feedComments" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "feedReactions" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "feedUpvotes" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "feedDownvotes" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "listingComments" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "goGetAlerts" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "pickupCoordination" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "listingModeration" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "listingExpiry" BOOLEAN,
  ADD COLUMN IF NOT EXISTS violations BOOLEAN,
  ADD COLUMN IF NOT EXISTS "claimRequests" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "nearbyRequests" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "requestFulfilled" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "neighborRequests" BOOLEAN;

UPDATE public.notification_preferences SET
  "feedPosts" = COALESCE("feedPosts", "newListings"),
  "feedComments" = COALESCE("feedComments", comments),
  "feedReactions" = COALESCE("feedReactions", comments),
  "feedUpvotes" = COALESCE("feedUpvotes", "listingUpvotes"),
  "feedDownvotes" = COALESCE("feedDownvotes", "listingDownvotes"),
  "listingComments" = COALESCE("listingComments", comments),
  "goGetAlerts" = COALESCE("goGetAlerts", "pickupReminders"),
  "pickupCoordination" = COALESCE("pickupCoordination", "pickupReminders"),
  "listingModeration" = COALESCE("listingModeration", "listingStatus"),
  "listingExpiry" = COALESCE("listingExpiry", "listingStatus"),
  violations = COALESCE(violations, "accountUpdates"),
  "claimRequests" = COALESCE("claimRequests", requests),
  "nearbyRequests" = COALESCE("nearbyRequests", requests),
  "requestFulfilled" = COALESCE("requestFulfilled", requests),
  "neighborRequests" = COALESCE("neighborRequests", requests);

ALTER TABLE public.notification_preferences
  ALTER COLUMN "feedPosts" SET DEFAULT true,
  ALTER COLUMN "feedComments" SET DEFAULT true,
  ALTER COLUMN "feedReactions" SET DEFAULT true,
  ALTER COLUMN "feedUpvotes" SET DEFAULT true,
  ALTER COLUMN "feedDownvotes" SET DEFAULT true,
  ALTER COLUMN "listingComments" SET DEFAULT true,
  ALTER COLUMN "goGetAlerts" SET DEFAULT true,
  ALTER COLUMN "pickupCoordination" SET DEFAULT true,
  ALTER COLUMN "listingModeration" SET DEFAULT true,
  ALTER COLUMN "listingExpiry" SET DEFAULT true,
  ALTER COLUMN violations SET DEFAULT true,
  ALTER COLUMN "claimRequests" SET DEFAULT true,
  ALTER COLUMN "nearbyRequests" SET DEFAULT true,
  ALTER COLUMN "requestFulfilled" SET DEFAULT true,
  ALTER COLUMN "neighborRequests" SET DEFAULT true;
