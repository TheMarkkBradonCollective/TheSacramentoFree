-- Paste in Supabase SQL Editor. Safe to re-run.
-- Updates tab only: one row per user-facing feature change.
-- Does NOT touch help_announcements (News) — post those manually in the app.
-- Removes old apk-* release rows from app_updates (those are not Updates posts).

ALTER TABLE public.app_updates ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.app_update_views (
  "updateId" TEXT NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "viewedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("updateId", "userId")
);
ALTER TABLE public.app_update_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS app_update_views_update_idx ON public.app_update_views ("updateId");

CREATE OR REPLACE FUNCTION public.record_app_update_view(target_update_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $recordupdateview$
DECLARE
  viewer_uid text;
  author_uid text;
  inserted_count integer;
  result_count integer;
BEGIN
  viewer_uid := auth.uid()::text;
  IF viewer_uid IS NULL OR target_update_id IS NULL OR target_update_id = '' THEN
    RETURN NULL;
  END IF;

  SELECT "postedByUserId" INTO author_uid FROM public.app_updates WHERE id = target_update_id;
  IF author_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF author_uid = viewer_uid THEN
    SELECT COALESCE("viewCount", 0) INTO result_count FROM public.app_updates WHERE id = target_update_id;
    RETURN result_count;
  END IF;

  INSERT INTO public.app_update_views ("updateId", "userId")
  VALUES (target_update_id, viewer_uid)
  ON CONFLICT ("updateId", "userId") DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count > 0 THEN
    UPDATE public.app_updates
    SET "viewCount" = COALESCE("viewCount", 0) + 1
    WHERE id = target_update_id
    RETURNING "viewCount" INTO result_count;
  ELSE
    SELECT COALESCE("viewCount", 0) INTO result_count FROM public.app_updates WHERE id = target_update_id;
  END IF;

  RETURN result_count;
END;
$recordupdateview$;

REVOKE ALL ON FUNCTION public.record_app_update_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_app_update_view(text) TO authenticated;

DELETE FROM public.app_updates WHERE id ILIKE '%apk-%';
DELETE FROM public.app_updates WHERE id = '2026-08-25_feed-listings-events-chat';

INSERT INTO public.app_updates (
  id, date, title, body, detail,
  "directorName", "directorTitle", "postedByUserId",
  "createdAt", "updatedAt", "viewCount"
)
VALUES
  ('2026-08-28_list-counts-under-meta', '2026-08-28', 'List view: counts sit under location, distance, and date', 'In Stuff and Events list view, location, distance, and date stay on one line. Views, votes, comments, and (for events) going count sit on the next row so they never wrap into the address.', 'WHAT NEIGHBORS SEE
In Stuff and Events list view, location, distance, and date stay on one line. Views, votes, comments, and (for events) going count sit on the next row so they never wrap into the address.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-28T18:10:00.000Z', '2026-08-28T18:10:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-28_list-counts-under-meta'), 0)),
  ('2026-08-28_event-card-count-bubbles', '2026-08-28', 'Events use the same count bubbles as Stuff', 'Event cards now show the same view, vote, and comment bubbles as listings — grid, list, map, and feed. Going count is there too when people have RSVP’d.', 'WHAT NEIGHBORS SEE
Event cards now show the same view, vote, and comment bubbles as listings — grid, list, map, and feed. Going count is there too when people have RSVP’d.

• View count on the photo (including zero)
• Votes and comments on the card when they are above zero

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-28T16:40:00.000Z', '2026-08-28T16:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-28_event-card-count-bubbles'), 0)),
  ('2026-08-26_home-listings-load', '2026-08-26', 'Live listings on the home page again', 'The public home page shows real neighborhood listings again — no more empty classifieds above the fold.', 'WHAT NEIGHBORS SEE
The public home page shows real neighborhood listings again — no more empty classifieds above the fold.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-26T20:10:00.000Z', '2026-08-26T20:10:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-26_home-listings-load'), 0)),
  ('2026-08-26_community-given-fulfilled', '2026-08-26', 'Given away and Fulfilled totals are real counts', 'Community Given away and Fulfilled numbers now come from the live database, not a stuck zero.', 'WHAT NEIGHBORS SEE
Community Given away and Fulfilled numbers now come from the live database, not a stuck zero.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-26T19:40:00.000Z', '2026-08-26T19:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-26_community-given-fulfilled'), 0)),
  ('2026-08-26_listings-above-tour', '2026-08-26', 'Listings sit above the app screenshot tour', 'On the website home page, live listings are above the app screenshots so you see gifts first.', 'WHAT NEIGHBORS SEE
On the website home page, live listings are above the app screenshots so you see gifts first.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-26T19:10:00.000Z', '2026-08-26T19:10:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-26_listings-above-tour'), 0)),
  ('2026-08-26_download-app-nav', '2026-08-26', 'Download app is in the top nav', 'Download app is a top-level website nav item — you do not have to hunt the footer for the Android / home-screen install page.', 'WHAT NEIGHBORS SEE
Download app is a top-level website nav item — you do not have to hunt the footer for the Android / home-screen install page.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-26T18:40:00.000Z', '2026-08-26T18:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-26_download-app-nav'), 0)),
  ('2026-08-26_transparent-brand-logo', '2026-08-26', 'Full transparent hands logo in the app', 'Splash and in-app chrome use the full transparent 3D hands logo. The Android launcher icon stays the Sacramento green squircle.', 'WHAT NEIGHBORS SEE
Splash and in-app chrome use the full transparent 3D hands logo. The Android launcher icon stays the Sacramento green squircle.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-26T18:10:00.000Z', '2026-08-26T18:10:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-26_transparent-brand-logo'), 0)),
  ('2026-08-25_listing-view-counts', '2026-08-25', 'View counts on listings', 'Stuff cards and the full listing page show how many unique neighbors opened that post — one count per person, not per refresh.', 'WHAT NEIGHBORS SEE
Stuff cards and the full listing page show how many unique neighbors opened that post — one count per person, not per refresh.

• Eye count on thumbnails instead of +N photo badges
• Same count on the listing detail page

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T14:50:00.000Z', '2026-08-25T14:50:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_listing-view-counts'), 0)),
  ('2026-08-25_feed-view-counts', '2026-08-25', 'View counts on neighbor feed posts', 'Feed posts show a view count on the photo and in the engagement bar, including when nobody has opened it yet.', 'WHAT NEIGHBORS SEE
Feed posts show a view count on the photo and in the engagement bar, including when nobody has opened it yet.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T14:40:00.000Z', '2026-08-25T14:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_feed-view-counts'), 0)),
  ('2026-08-25_event-view-counts', '2026-08-25', 'View counts on events', 'Open an event and it counts once per neighbor. Cards show the running total next to votes and comments.', 'WHAT NEIGHBORS SEE
Open an event and it counts once per neighbor. Cards show the running total next to votes and comments.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T14:30:00.000Z', '2026-08-25T14:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_event-view-counts'), 0)),
  ('2026-08-25_event-votes', '2026-08-25', 'Upvote and downvote community events', 'Events take the same up/down votes as listings so you can surface gatherings neighbors actually want.', 'WHAT NEIGHBORS SEE
Events take the same up/down votes as listings so you can surface gatherings neighbors actually want.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T14:20:00.000Z', '2026-08-25T14:20:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_event-votes'), 0)),
  ('2026-08-25_chat-read-receipts', '2026-08-25', 'Read receipts in Messages', 'See when someone read your message. Group chats show how many neighbors have read it. Toggle it in the Messages ⋯ menu — on by default.', 'WHAT NEIGHBORS SEE
See when someone read your message. Group chats show how many neighbors have read it. Toggle it in the Messages ⋯ menu — on by default.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T14:10:00.000Z', '2026-08-25T14:10:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_chat-read-receipts'), 0)),
  ('2026-08-25_sort-feed-pickup-style', '2026-08-25', 'Sort feed by pickup style', 'The Sort feed menu now includes Go Get, Drop off, Meet up, and Pick Up so you can browse by how the handoff works.', 'WHAT NEIGHBORS SEE
The Sort feed menu now includes Go Get, Drop off, Meet up, and Pick Up so you can browse by how the handoff works.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T13:50:00.000Z', '2026-08-25T13:50:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_sort-feed-pickup-style'), 0)),
  ('2026-08-25_go-get-pickup', '2026-08-25', 'Go Get — live pickup coordination', 'Go Get rings the other neighbor, schedules the trip, and walks both of you on a live map through handoff — like a rideshare, for a free porch pickup.', 'WHAT NEIGHBORS SEE
Go Get rings the other neighbor, schedules the trip, and walks both of you on a live map through handoff — like a rideshare, for a free porch pickup.

• Incoming ring on the map
• Turn-by-turn for the picker, live tracking for the poster
• Confirm at the pin marks the listing given

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T13:30:00.000Z', '2026-08-25T13:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_go-get-pickup'), 0)),
  ('2026-08-25_meet-dual-travel', '2026-08-25', 'Meet sessions — both neighbors can travel', 'Meet is the name for a coordinated meetup. Trades can run dual-travel so both of you navigate to the same spot. Start Meet waits until both neighbors opt in.', 'WHAT NEIGHBORS SEE
Meet is the name for a coordinated meetup. Trades can run dual-travel so both of you navigate to the same spot. Start Meet waits until both neighbors opt in.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T13:10:00.000Z', '2026-08-25T13:10:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_meet-dual-travel'), 0)),
  ('2026-08-25_quiet-hours', '2026-08-25', 'Quiet hours and smarter notification priorities', 'Alerts respect quiet hours, skip duplicates, and rank urgent pickup pings above low-priority noise. Set the window in Bell → Alerts.', 'WHAT NEIGHBORS SEE
Alerts respect quiet hours, skip duplicates, and rank urgent pickup pings above low-priority noise. Set the window in Bell → Alerts.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T12:50:00.000Z', '2026-08-25T12:50:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_quiet-hours'), 0)),
  ('2026-08-25_listing-view-alerts', '2026-08-25', 'Optional ping when someone views your listing', 'You can get a notification when a neighbor opens one of your posts. Turn it on or off with the other alert toggles.', 'WHAT NEIGHBORS SEE
You can get a notification when a neighbor opens one of your posts. Turn it on or off with the other alert toggles.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T12:40:00.000Z', '2026-08-25T12:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_listing-view-alerts'), 0)),
  ('2026-08-25_gps-navigation', '2026-08-25', 'Smoother GPS heading for Go Get and map routes', 'Navigation follows the street you are on with live heading — less wobble, remaining route slides with you, map stays a heading-up GPS instead of a static highlight.', 'WHAT NEIGHBORS SEE
Navigation follows the street you are on with live heading — less wobble, remaining route slides with you, map stays a heading-up GPS instead of a static highlight.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T12:20:00.000Z', '2026-08-25T12:20:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_gps-navigation'), 0)),
  ('2026-08-25_grid-distance-in-body', '2026-08-25', 'Grid cards: distance in the card body, not on the photo', 'Neighborhood and distance sit in the card text so they do not cover the listing photo. View count stays on the thumbnail.', 'WHAT NEIGHBORS SEE
Neighborhood and distance sit in the card text so they do not cover the listing photo. View count stays on the thumbnail.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T11:50:00.000Z', '2026-08-25T11:50:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_grid-distance-in-body'), 0)),
  ('2026-08-25_repeating-event-badge', '2026-08-25', 'Repeating-event badge on the card body', 'Series events show the repeating badge and distance in the card body, not over the photo. RSVPs are per date as the series advances.', 'WHAT NEIGHBORS SEE
Series events show the repeating badge and distance in the card body, not over the photo. RSVPs are per date as the series advances.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T11:30:00.000Z', '2026-08-25T11:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_repeating-event-badge'), 0)),
  ('2026-08-25_chat-tappable-links', '2026-08-25', 'URLs in chat are tappable links', 'If someone pastes a link in Messages, you can tap it — no more copy-paste out of the bubble.', 'WHAT NEIGHBORS SEE
If someone pastes a link in Messages, you can tap it — no more copy-paste out of the bubble.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T11:10:00.000Z', '2026-08-25T11:10:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_chat-tappable-links'), 0)),
  ('2026-08-25_updates-news-seen-by', '2026-08-25', 'Seen-by counts on Updates and News', 'Each update and news post shows how many unique neighbors have seen it — same idea as listing view counts.', 'WHAT NEIGHBORS SEE
Each update and news post shows how many unique neighbors have seen it — same idea as listing view counts.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T10:50:00.000Z', '2026-08-25T10:50:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_updates-news-seen-by'), 0)),
  ('2026-08-25_swipe-clear-alerts', '2026-08-25', 'Swipe to clear alerts in Notify', 'In Bell → Notify you can swipe an alert away to clear it from the inbox.', 'WHAT NEIGHBORS SEE
In Bell → Notify you can swipe an alert away to clear it from the inbox.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T10:40:00.000Z', '2026-08-25T10:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_swipe-clear-alerts'), 0)),
  ('2026-08-25_notifications-first-run', '2026-08-25', 'First-run prompt for notifications', 'New installs get a one-time prompt to turn on notifications instead of the old rebrand popups.', 'WHAT NEIGHBORS SEE
New installs get a one-time prompt to turn on notifications instead of the old rebrand popups.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-25T10:20:00.000Z', '2026-08-25T10:20:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-25_notifications-first-run'), 0)),
  ('2026-08-20_photo-upload-fix', '2026-08-20', 'Photo uploads work again on Android', 'Listing, event, chat, and support photos upload on Android again. If a picture stalled before, try once more.', 'WHAT NEIGHBORS SEE
Listing, event, chat, and support photos upload on Android again. If a picture stalled before, try once more.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-20T18:00:00.000Z', '2026-08-20T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-20_photo-upload-fix'), 0)),
  ('2026-08-20_event-recurrence', '2026-08-20', 'Repeating events keep the next date current', 'A repeating gathering advances to the next upcoming date automatically. Each date has its own RSVPs.', 'WHAT NEIGHBORS SEE
A repeating gathering advances to the next upcoming date automatically. Each date has its own RSVPs.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-20T16:00:00.000Z', '2026-08-20T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-20_event-recurrence'), 0)),
  ('2026-08-18_feed-hide-given-fulfilled', '2026-08-18', 'Hide given and fulfilled listings from Stuff', 'Filters include ON/OFF switches to hide already-given gifts and fulfilled looking-for posts so the feed stays current.', 'WHAT NEIGHBORS SEE
Filters include ON/OFF switches to hide already-given gifts and fulfilled looking-for posts so the feed stays current.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-18T21:40:00.000Z', '2026-08-18T21:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-18_feed-hide-given-fulfilled'), 0)),
  ('2026-08-18_list-grid-toggle', '2026-08-18', 'List or grid on the Stuff feed', 'Toggle list vs grid. Grid sorts nearest-first so nearby gifts jump to the top.', 'WHAT NEIGHBORS SEE
Toggle list vs grid. Grid sorts nearest-first so nearby gifts jump to the top.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-18T20:40:00.000Z', '2026-08-18T20:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-18_list-grid-toggle'), 0)),
  ('2026-08-18_trades-counter-profiles', '2026-08-18', 'Trades count on neighbor profiles', 'Profiles show how many item-for-item trades you have completed, next to gifts given.', 'WHAT NEIGHBORS SEE
Profiles show how many item-for-item trades you have completed, next to gifts given.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-18T19:40:00.000Z', '2026-08-18T19:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-18_trades-counter-profiles'), 0)),
  ('2026-08-18_pwa-pickup-handoff', '2026-08-18', 'Pickup and drop-off handoff on the website', 'Home-screen / browser users can run a porch pickup or drop-off handoff without the Android app. Confirm still marks the listing complete.', 'WHAT NEIGHBORS SEE
Home-screen / browser users can run a porch pickup or drop-off handoff without the Android app. Confirm still marks the listing complete.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-18T18:40:00.000Z', '2026-08-18T18:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-18_pwa-pickup-handoff'), 0)),
  ('2026-08-18_account-permission-toggles', '2026-08-18', 'Notification and location permission toggles in Account', 'Account has clear switches for notification and location permission so you can grant or revisit them without digging into phone settings first.', 'WHAT NEIGHBORS SEE
Account has clear switches for notification and location permission so you can grant or revisit them without digging into phone settings first.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-18T17:40:00.000Z', '2026-08-18T17:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-18_account-permission-toggles'), 0)),
  ('2026-08-18_collapsible-filters', '2026-08-18', 'Collapsible sort and filter panels', 'Sort and Filters & sort fold up so they do not eat the whole feed on a phone.', 'WHAT NEIGHBORS SEE
Sort and Filters & sort fold up so they do not eat the whole feed on a phone.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-18T16:40:00.000Z', '2026-08-18T16:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-18_collapsible-filters'), 0)),
  ('2026-08-18_compact-filter-toggles', '2026-08-18', 'Compact ON/OFF filter switches', 'Feed and Events filters use compact written ON/OFF thumbs instead of full-width switch rows.', 'WHAT NEIGHBORS SEE
Feed and Events filters use compact written ON/OFF thumbs instead of full-width switch rows.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-08-18T15:40:00.000Z', '2026-08-18T15:40:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-08-18_compact-filter-toggles'), 0)),
  ('2026-07-29_repeat-events-one-card', '2026-07-29', 'Repeat event series merge into one card', 'A weekly or monthly gathering shows as one card on the feed and map instead of a stack of duplicate pins.', 'WHAT NEIGHBORS SEE
A weekly or monthly gathering shows as one card on the feed and map instead of a stack of duplicate pins.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-29T18:00:00.000Z', '2026-07-29T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-29_repeat-events-one-card'), 0)),
  ('2026-07-28_add-dates-to-event-series', '2026-07-28', 'Add upcoming dates to an existing event series', 'If you posted a repeating event, you can add more upcoming dates without making a new listing.', 'WHAT NEIGHBORS SEE
If you posted a repeating event, you can add more upcoming dates without making a new listing.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-28T18:00:00.000Z', '2026-07-28T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-28_add-dates-to-event-series'), 0)),
  ('2026-07-28_repeat-event-series', '2026-07-28', 'Repeat event series', 'Post a gathering once and set it to repeat. Neighbors RSVP per date.', 'WHAT NEIGHBORS SEE
Post a gathering once and set it to repeat. Neighbors RSVP per date.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-28T16:00:00.000Z', '2026-07-28T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-28_repeat-event-series'), 0)),
  ('2026-07-26_go-get-opt-out', '2026-07-26', 'Opt out of Go Get pickup coordination', 'Go Get is available when you use the installed app with notifications on. There is an Account opt-out if you would rather arrange pickup in chat.', 'WHAT NEIGHBORS SEE
Go Get is available when you use the installed app with notifications on. There is an Account opt-out if you would rather arrange pickup in chat.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-26T18:00:00.000Z', '2026-07-26T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-26_go-get-opt-out'), 0)),
  ('2026-07-15_events-unlock-500', '2026-07-15', 'Community events unlock at 500 neighbors', 'The Events tab opens to the whole community at 500 neighbors, not 1,000.', 'WHAT NEIGHBORS SEE
The Events tab opens to the whole community at 500 neighbors, not 1,000.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-15T18:00:00.000Z', '2026-07-15T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-15_events-unlock-500'), 0)),
  ('2026-07-15_download-buttons-home', '2026-07-15', 'APK and home-screen download buttons on home', 'The home hero has buttons for the Android app and Add to Home Screen. Inside the native app that extra Download link stays hidden.', 'WHAT NEIGHBORS SEE
The home hero has buttons for the Android app and Add to Home Screen. Inside the native app that extra Download link stays hidden.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-15T17:00:00.000Z', '2026-07-15T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-15_download-buttons-home'), 0)),
  ('2026-07-15_redesigned-login', '2026-07-15', 'Redesigned sign-in page', 'Desktop sign-in is a split-screen brand panel. Phones get a simple logo hero instead of a loud color bar.', 'WHAT NEIGHBORS SEE
Desktop sign-in is a split-screen brand panel. Phones get a simple logo hero instead of a loud color bar.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-15T16:00:00.000Z', '2026-07-15T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-15_redesigned-login'), 0)),
  ('2026-07-15_tablet-desktop-shell', '2026-07-15', 'Tablet rail and desktop sidebar workspace', 'Tablets get an icon rail. Desktop uses a sidebar plus workspace so Stuff, Map, and Chat are not cramped into a phone layout.', 'WHAT NEIGHBORS SEE
Tablets get an icon rail. Desktop uses a sidebar plus workspace so Stuff, Map, and Chat are not cramped into a phone layout.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-15T15:00:00.000Z', '2026-07-15T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-15_tablet-desktop-shell'), 0)),
  ('2026-07-11_shimmer-loading', '2026-07-11', 'Shimmer placeholders while the feed loads', 'Instead of a blank screen, you see skeleton cards while listings and events load.', 'WHAT NEIGHBORS SEE
Instead of a blank screen, you see skeleton cards while listings and events load.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-11T18:00:00.000Z', '2026-07-11T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-11_shimmer-loading'), 0)),
  ('2026-07-11_download-page', '2026-07-11', 'Download page with version checks', 'A dedicated download page compares the Android app vs Add to Home Screen and tells you if you are already current.', 'WHAT NEIGHBORS SEE
A dedicated download page compares the Android app vs Add to Home Screen and tells you if you are already current.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-11T16:00:00.000Z', '2026-07-11T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-11_download-page'), 0)),
  ('2026-07-11_android-app', '2026-07-11', 'Android app with native push', 'TheSacramentoFree installs as an Android app with native notifications — same account as the website.', 'WHAT NEIGHBORS SEE
TheSacramentoFree installs as an Android app with native notifications — same account as the website.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-11T14:00:00.000Z', '2026-07-11T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-11_android-app'), 0)),
  ('2026-07-09_pwa-auto-update', '2026-07-09', 'Home-screen app updates itself', 'If you added TheSacramentoFree to your home screen, it picks up new deploys without a manual refresh or cache clear.', 'WHAT NEIGHBORS SEE
If you added TheSacramentoFree to your home screen, it picks up new deploys without a manual refresh or cache clear.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-09T18:00:00.000Z', '2026-07-09T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-09_pwa-auto-update'), 0)),
  ('2026-07-09_pickup-flow-map-parity', '2026-07-09', 'Pick Up flow and map/list parity', 'Contactless posts use a Pick Up flow. Map and list show the same listings. Optional arrived/left pings when you want them.', 'WHAT NEIGHBORS SEE
Contactless posts use a Pick Up flow. Map and list show the same listings. Optional arrived/left pings when you want them.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-09T16:00:00.000Z', '2026-07-09T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-09_pickup-flow-map-parity'), 0)),
  ('2026-07-09_solid-map-pins', '2026-07-09', 'Solid circle pins for every listing on the map', 'The map shows all listings with unified solid circle pins so nothing hides behind a filter you did not mean to set.', 'WHAT NEIGHBORS SEE
The map shows all listings with unified solid circle pins so nothing hides behind a filter you did not mean to set.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-07-09T14:00:00.000Z', '2026-07-09T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-07-09_solid-map-pins'), 0)),
  ('2026-06-20_feed-sort', '2026-06-20', 'Sort Stuff: New, Hot, Top, Active', 'Stuff has sort chips — New, Hot, Top, and Active — so you can browse trending posts, not only the newest listing first.', 'WHAT NEIGHBORS SEE
Stuff has sort chips — New, Hot, Top, and Active — so you can browse trending posts, not only the newest listing first.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-20T18:00:00.000Z', '2026-06-20T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-20_feed-sort'), 0)),
  ('2026-06-20_chat-unsend', '2026-06-20', 'Unsend your own chat messages', 'Tap ↩ on a message you sent to unsend it. The text comes back into the box so you can fix a typo and send again.', 'WHAT NEIGHBORS SEE
Tap ↩ on a message you sent to unsend it. The text comes back into the box so you can fix a typo and send again.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-20T17:00:00.000Z', '2026-06-20T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-20_chat-unsend'), 0)),
  ('2026-06-20_support-unsend', '2026-06-20', 'Unsend your own support replies', 'In an open support ticket, tap ↩ on your own message to unsend it. Works for you and for staff on their own replies.', 'WHAT NEIGHBORS SEE
In an open support ticket, tap ↩ on your own message to unsend it. Works for you and for staff on their own replies.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-20T16:30:00.000Z', '2026-06-20T16:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-20_support-unsend'), 0)),
  ('2026-06-20_privacy-policy-login', '2026-06-20', 'Privacy policy at sign-in', 'You accept the privacy policy once at login. Read it anytime from Home, Account, or the footer.', 'WHAT NEIGHBORS SEE
You accept the privacy policy once at login. Read it anytime from Home, Account, or the footer.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-20T16:00:00.000Z', '2026-06-20T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-20_privacy-policy-login'), 0)),
  ('2026-06-20_terms-of-use-login', '2026-06-20', 'Terms of use at sign-in', 'After privacy, you accept the Terms of use once. The footer links Privacy and Terms.', 'WHAT NEIGHBORS SEE
After privacy, you accept the Terms of use once. The footer links Privacy and Terms.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-20T15:30:00.000Z', '2026-06-20T15:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-20_terms-of-use-login'), 0)),
  ('2026-06-20_anonymous-vote-cooldown', '2026-06-20', 'Vote alerts stay anonymous + fair-vote cooldown', 'Vote notifications no longer name who voted. Rapid voting on many posts pauses briefly so one person cannot flood the feed.', 'WHAT NEIGHBORS SEE
Vote notifications no longer name who voted. Rapid voting on many posts pauses briefly so one person cannot flood the feed.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-20T15:00:00.000Z', '2026-06-20T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-20_anonymous-vote-cooldown'), 0)),
  ('2026-06-20_updates-announcements-reading', '2026-06-20', 'Full summaries on Updates and News', 'Bell → Updates and News show the entire summary without cutting off. Tap for the full story. Comments on news stay right on the card.', 'WHAT NEIGHBORS SEE
Bell → Updates and News show the entire summary without cutting off. Tap for the full story. Comments on news stay right on the card.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-20T14:30:00.000Z', '2026-06-20T14:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-20_updates-announcements-reading'), 0)),
  ('2026-06-14_trade-barter-listing-type', '2026-06-14', 'Trade / barter posts are live', 'You can post item-for-item swaps — trade/barter type. Still 100% free, no money involved ever.', 'WHAT NEIGHBORS SEE
You can post item-for-item swaps — trade/barter type. Still 100% free, no money involved ever.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-14T18:00:00.000Z', '2026-06-14T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-14_trade-barter-listing-type'), 0)),
  ('2026-06-14_trade-grey-map-pins', '2026-06-14', 'Grey map rings for trade posts', 'Trade listings show a grey ring on the map. Giving stays black, looking stays white.', 'WHAT NEIGHBORS SEE
Trade listings show a grey ring on the map. Giving stays black, looking stays white.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-14T17:30:00.000Z', '2026-06-14T17:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-14_trade-grey-map-pins'), 0)),
  ('2026-06-14_awards-coming-soon', '2026-06-14', 'Awards button in the header', 'A glowing Awards button is in the header. Tap it for the awards page — still growing, but the door is there. Dark/light theme lives under Account.', 'WHAT NEIGHBORS SEE
A glowing Awards button is in the header. Tap it for the awards page — still growing, but the door is there. Dark/light theme lives under Account.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-14T17:00:00.000Z', '2026-06-14T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-14_awards-coming-soon'), 0)),
  ('2026-06-14_theme-moved-to-account', '2026-06-14', 'Dark / light theme moved to Account', 'Theme toggle is under Account now — less clutter up top.', 'WHAT NEIGHBORS SEE
Theme toggle is under Account now — less clutter up top.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-14T16:30:00.000Z', '2026-06-14T16:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-14_theme-moved-to-account'), 0)),
  ('2026-06-14_land-on-map-after-login', '2026-06-14', 'You land on the map when you sign in', 'After login you go straight to the map tab so gifts near you are the first thing you see.', 'WHAT NEIGHBORS SEE
After login you go straight to the map tab so gifts near you are the first thing you see.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-14T16:00:00.000Z', '2026-06-14T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-14_land-on-map-after-login'), 0)),
  ('2026-06-14_app-update-comments', '2026-06-14', 'Comment on app updates', 'Tap any changelog entry to expand it — read and post comments, same as staff news.', 'WHAT NEIGHBORS SEE
Tap any changelog entry to expand it — read and post comments, same as staff news.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-14T15:00:00.000Z', '2026-06-14T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-14_app-update-comments'), 0)),
  ('2026-06-11_navbar-bell-community-hub', '2026-06-11', 'Bell menu — Notify, News, Updates, Alerts', 'Top-right bell: Notify (inbox), News (staff posts), Updates (this changelog), Alerts (push toggles, last on purpose).', 'WHAT NEIGHBORS SEE
Top-right bell: Notify (inbox), News (staff posts), Updates (this changelog), Alerts (push toggles, last on purpose).

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T20:00:00.000Z', '2026-06-11T20:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_navbar-bell-community-hub'), 0)),
  ('2026-06-11_notifications-inbox-alerts-toggles', '2026-06-11', 'Notify is your inbox — Alerts are the toggles', 'Notifications tab is the inbox of alerts you received. Alerts tab has every push switch.', 'WHAT NEIGHBORS SEE
Notifications tab is the inbox of alerts you received. Alerts tab has every push switch.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T19:30:00.000Z', '2026-06-11T19:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_notifications-inbox-alerts-toggles'), 0)),
  ('2026-06-11_user-notifications-inbox-table', '2026-06-11', 'Inbox logs every alert', 'Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements.', 'WHAT NEIGHBORS SEE
Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T19:00:00.000Z', '2026-06-11T19:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_user-notifications-inbox-table'), 0)),
  ('2026-06-11_searchable-updates', '2026-06-11', 'Search the changelog', 'Bell → Updates has a search field — find past features by keyword.', 'WHAT NEIGHBORS SEE
Bell → Updates has a search field — find past features by keyword.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T18:00:00.000Z', '2026-06-11T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_searchable-updates'), 0)),
  ('2026-06-11_center-map-nav', '2026-06-11', 'Map is the big center button on phones', 'On phones, Map is the round center button in the bottom nav. Tabs: Stuff | Events | Map | Chat | Account.', 'WHAT NEIGHBORS SEE
On phones, Map is the round center button in the bottom nav. Tabs: Stuff | Events | Map | Chat | Account.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T17:00:00.000Z', '2026-06-11T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_center-map-nav'), 0)),
  ('2026-06-11_support-inbox-in-messages', '2026-06-11', 'Support inbox lives in Chat', 'Support tickets sit in Chat with the same sidebar style as DMs.', 'WHAT NEIGHBORS SEE
Support tickets sit in Chat with the same sidebar style as DMs.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T16:30:00.000Z', '2026-06-11T16:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_support-inbox-in-messages'), 0)),
  ('2026-06-11_chat-reviews-reports', '2026-06-11', 'Reviews and reports moved to Chat', 'Community reviews, Send a report, and (for staff) User reports are the last section in the Chat sidebar.', 'WHAT NEIGHBORS SEE
Community reviews, Send a report, and (for staff) User reports are the last section in the Chat sidebar.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T16:00:00.000Z', '2026-06-11T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_chat-reviews-reports'), 0)),
  ('2026-06-11_community-reviews-layout', '2026-06-11', 'Your review on top, neighbors below', 'Chat → Community reviews: post yours up top, everyone else’s below — yours is not duplicated.', 'WHAT NEIGHBORS SEE
Chat → Community reviews: post yours up top, everyone else’s below — yours is not duplicated.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T15:30:00.000Z', '2026-06-11T15:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_community-reviews-layout'), 0)),
  ('2026-06-11_chat-sidebar-preview', '2026-06-11', 'Chat sidebar: last 3 + View all', 'Support and DMs show three recent threads with View all to expand.', 'WHAT NEIGHBORS SEE
Support and DMs show three recent threads with View all to expand.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T15:00:00.000Z', '2026-06-11T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_chat-sidebar-preview'), 0)),
  ('2026-06-11_chat-sidebar-actions', '2026-06-11', 'Start conversation and new support rows', 'Quick rows to start a DM or open a new support chat — same style as Send a report.', 'WHAT NEIGHBORS SEE
Quick rows to start a DM or open a new support chat — same style as Send a report.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T14:30:00.000Z', '2026-06-11T14:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_chat-sidebar-actions'), 0)),
  ('2026-06-11_delete-dm-and-post-chats', '2026-06-11', 'Delete conversations from Chat', 'Remove profile DMs or post chats. The poster can delete a post chat after it is gifted or withdrawn. Closed support tickets can go too.', 'WHAT NEIGHBORS SEE
Remove profile DMs or post chats. The poster can delete a post chat after it is gifted or withdrawn. Closed support tickets can go too.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T14:00:00.000Z', '2026-06-11T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_delete-dm-and-post-chats'), 0)),
  ('2026-06-11_chat-message-deletion', '2026-06-11', 'Delete your chat messages', 'Delete messages you sent. City managers can remove community-channel messages.', 'WHAT NEIGHBORS SEE
Delete messages you sent. City managers can remove community-channel messages.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T13:30:00.000Z', '2026-06-11T13:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_chat-message-deletion'), 0)),
  ('2026-06-11_in-app-dialogs', '2026-06-11', 'In-app confirmations instead of browser popups', 'Deletes and confirms use in-app dialogs that match the site — not generic OK/Cancel boxes.', 'WHAT NEIGHBORS SEE
Deletes and confirms use in-app dialogs that match the site — not generic OK/Cancel boxes.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T13:00:00.000Z', '2026-06-11T13:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_in-app-dialogs'), 0)),
  ('2026-06-11_block-self-votes', '2026-06-11', 'You cannot vote on your own stuff', 'Upvotes and downvotes are disabled on your own listings, reviews, updates, news, and messages.', 'WHAT NEIGHBORS SEE
Upvotes and downvotes are disabled on your own listings, reviews, updates, news, and messages.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-11T12:30:00.000Z', '2026-06-11T12:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-11_block-self-votes'), 0)),
  ('2026-06-10_community-staff-chat-support-moved', '2026-06-10', 'Community chat and support moved to the Chat tab', 'Chat now has the community-wide channel, staff lounge, and support tickets in one place.', 'WHAT NEIGHBORS SEE
Chat now has the community-wide channel, staff lounge, and support tickets in one place.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-10T18:00:00.000Z', '2026-06-10T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-10_community-staff-chat-support-moved'), 0)),
  ('2026-06-10_community-staff-chat-notifications', '2026-06-10', 'Push for community and staff chat', 'New messages in Community chat and Staff chat can send push — each has its own toggle.', 'WHAT NEIGHBORS SEE
New messages in Community chat and Staff chat can send push — each has its own toggle.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-10T16:00:00.000Z', '2026-06-10T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-10_community-staff-chat-notifications'), 0)),
  ('2026-06-09_feed-renamed-to-stuff', '2026-06-09', 'Feed is now called Stuff', 'Renamed the listings tab to Stuff — same free gifts and requests, clearer name.', 'WHAT NEIGHBORS SEE
Renamed the listings tab to Stuff — same free gifts and requests, clearer name.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T22:00:00.000Z', '2026-06-09T22:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_feed-renamed-to-stuff'), 0)),
  ('2026-06-09_free-community-events', '2026-06-09', 'Free community events', 'Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.', 'WHAT NEIGHBORS SEE
Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T21:30:00.000Z', '2026-06-09T21:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_free-community-events'), 0)),
  ('2026-06-09_star-reviews', '2026-06-09', 'Star reviews for the app', 'Leave a rating — one per person, edit anytime.', 'WHAT NEIGHBORS SEE
Leave a rating — one per person, edit anytime.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T21:00:00.000Z', '2026-06-09T21:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_star-reviews'), 0)),
  ('2026-06-09_updates-reviews-pages', '2026-06-09', 'Updates and Reviews pages', 'Changelog and neighbor reviews live under Community in the menu.', 'WHAT NEIGHBORS SEE
Changelog and neighbor reviews live under Community in the menu.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T20:30:00.000Z', '2026-06-09T20:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_updates-reviews-pages'), 0)),
  ('2026-06-09_a-note-from-your-director', '2026-06-09', 'A note from me on the home page', 'I wrote why this exists — free forever, no ads, I do not sell your info.', 'WHAT NEIGHBORS SEE
I wrote why this exists — free forever, no ads, I do not sell your info.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T20:00:00.000Z', '2026-06-09T20:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_a-note-from-your-director'), 0)),
  ('2026-06-09_vote-on-updates-reviews-team-notes', '2026-06-09', 'Vote on updates, reviews, and team notes', 'Upvote or downvote changelog entries, reviews, and staff messages. I see the feedback.', 'WHAT NEIGHBORS SEE
Upvote or downvote changelog entries, reviews, and staff messages. I see the feedback.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T19:30:00.000Z', '2026-06-09T19:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_vote-on-updates-reviews-team-notes'), 0)),
  ('2026-06-09_cleaner-feed-filters', '2026-06-09', 'Filters in one panel', 'Filters and sorting live in one Filters & sort panel so the feed is not a mess of controls.', 'WHAT NEIGHBORS SEE
Filters and sorting live in one Filters & sort panel so the feed is not a mess of controls.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T19:00:00.000Z', '2026-06-09T19:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_cleaner-feed-filters'), 0)),
  ('2026-06-09_smarter-quick-picks', '2026-06-09', 'Stack quick filters', 'Tap multiple quick picks at once — Trending, Saved, My area, With photos, Needs pickup.', 'WHAT NEIGHBORS SEE
Tap multiple quick picks at once — Trending, Saved, My area, With photos, Needs pickup.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T18:30:00.000Z', '2026-06-09T18:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_smarter-quick-picks'), 0)),
  ('2026-06-09_more-ways-to-browse-the-feed', '2026-06-09', 'More ways to browse Stuff', 'Filter by give vs looking, category, neighborhood, status, votes, comments. Sort newest, oldest, most active.', 'WHAT NEIGHBORS SEE
Filter by give vs looking, category, neighborhood, status, votes, comments. Sort newest, oldest, most active.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T18:00:00.000Z', '2026-06-09T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_more-ways-to-browse-the-feed'), 0)),
  ('2026-06-09_withdrawn-posts-stay-hidden', '2026-06-09', 'Withdrawn posts stay hidden', 'If someone removes a listing it does not clutter the feed anymore.', 'WHAT NEIGHBORS SEE
If someone removes a listing it does not clutter the feed anymore.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T17:30:00.000Z', '2026-06-09T17:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_withdrawn-posts-stay-hidden'), 0)),
  ('2026-06-09_support-the-app-optional', '2026-06-09', 'Optional GoFundMe support page', 'A dedicated page explains what it costs to run this — and why I will never charge you or show ads. Short link in the footer.', 'WHAT NEIGHBORS SEE
A dedicated page explains what it costs to run this — and why I will never charge you or show ads. Short link in the footer.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T17:00:00.000Z', '2026-06-09T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_support-the-app-optional'), 0)),
  ('2026-06-09_push-notifications', '2026-06-09', 'Optional push notifications', 'Optional alerts for messages, claims, and activity. Turn each type on or off in Bell → Alerts.', 'WHAT NEIGHBORS SEE
Optional alerts for messages, claims, and activity. Turn each type on or off in Bell → Alerts.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T16:30:00.000Z', '2026-06-09T16:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_push-notifications'), 0)),
  ('2026-06-09_push-alerts-in-the-background', '2026-06-09', 'Push works when the app is closed', 'Notifications reach your phone when the app is not open. iPhone: Add to Home Screen for the most reliable delivery.', 'WHAT NEIGHBORS SEE
Notifications reach your phone when the app is not open. iPhone: Add to Home Screen for the most reliable delivery.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T16:00:00.000Z', '2026-06-09T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_push-alerts-in-the-background'), 0)),
  ('2026-06-09_all-notification-toggles', '2026-06-09', 'Every notification toggle actually delivers', 'Messages, claims, discover, staff inbox, pickup reminders — every switch in Alerts is wired up.', 'WHAT NEIGHBORS SEE
Messages, claims, discover, staff inbox, pickup reminders — every switch in Alerts is wired up.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T15:30:00.000Z', '2026-06-09T15:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_all-notification-toggles'), 0)),
  ('2026-06-09_staff-announcements-in-help', '2026-06-09', 'Staff announcements board', 'News is a separate board from this changelog — staff post community news, you vote and comment.', 'WHAT NEIGHBORS SEE
News is a separate board from this changelog — staff post community news, you vote and comment.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T15:00:00.000Z', '2026-06-09T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_staff-announcements-in-help'), 0)),
  ('2026-06-09_app-updates-vs-announcements-notifications', '2026-06-09', 'Separate toggles: my updates vs staff news', 'Notification settings split App updates (this changelog) and Announcements (staff posts).', 'WHAT NEIGHBORS SEE
Notification settings split App updates (this changelog) and Announcements (staff posts).

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T14:30:00.000Z', '2026-06-09T14:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_app-updates-vs-announcements-notifications'), 0)),
  ('2026-06-09_logout-clears-device-push', '2026-06-09', 'Logout clears push on this device', 'Signing out removes this phone’s push subscription so the next account does not get your alerts.', 'WHAT NEIGHBORS SEE
Signing out removes this phone’s push subscription so the next account does not get your alerts.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T14:00:00.000Z', '2026-06-09T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_logout-clears-device-push'), 0)),
  ('2026-06-09_notification-settings-save-button', '2026-06-09', 'Save button on notification settings', 'Flip toggles, review, then tap Save settings — they do not auto-save on every tap.', 'WHAT NEIGHBORS SEE
Flip toggles, review, then tap Save settings — they do not auto-save on every tap.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T13:30:00.000Z', '2026-06-09T13:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_notification-settings-save-button'), 0)),
  ('2026-06-09_no-more-double-pings', '2026-06-09', 'No more double pings', 'The same alert was firing twice — that is fixed.', 'WHAT NEIGHBORS SEE
The same alert was firing twice — that is fixed.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T13:00:00.000Z', '2026-06-09T13:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_no-more-double-pings'), 0)),
  ('2026-06-09_comment-and-saved-listing-alerts', '2026-06-09', 'Comment and saved-listing alerts', 'Get pinged when someone comments on your listing or when a bookmarked post changes.', 'WHAT NEIGHBORS SEE
Get pinged when someone comments on your listing or when a bookmarked post changes.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T12:30:00.000Z', '2026-06-09T12:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_comment-and-saved-listing-alerts'), 0)),
  ('2026-06-09_listing-vote-alerts', '2026-06-09', 'Optional upvote / downvote alerts', 'Optional push when someone votes on your listings — each direction has its own toggle.', 'WHAT NEIGHBORS SEE
Optional push when someone votes on your listings — each direction has its own toggle.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T12:00:00.000Z', '2026-06-09T12:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_listing-vote-alerts'), 0)),
  ('2026-06-09_saved-bookmarks-sync-online', '2026-06-09', 'Saved bookmarks sync to your account', 'Bookmarks save online so alerts still work when the app is closed.', 'WHAT NEIGHBORS SEE
Bookmarks save online so alerts still work when the app is closed.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-09T11:30:00.000Z', '2026-06-09T11:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-09_saved-bookmarks-sync-online'), 0)),
  ('2026-06-07_save-listings-labor-section', '2026-06-07', 'Save listings + Labor section', 'Bookmark posts to check later. Labor is a section for free community help and skills.', 'WHAT NEIGHBORS SEE
Bookmark posts to check later. Labor is a section for free community help and skills.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-07T18:00:00.000Z', '2026-06-07T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-07_save-listings-labor-section'), 0)),
  ('2026-06-02_preview-listings-before-joining', '2026-06-02', 'Browse listings before you join', 'Guests can see real posts on the home page without signing up first.', 'WHAT NEIGHBORS SEE
Guests can see real posts on the home page without signing up first.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-02T18:00:00.000Z', '2026-06-02T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-02_preview-listings-before-joining'), 0)),
  ('2026-06-02_tap-photos-to-enlarge', '2026-06-02', 'Tap photos to enlarge', 'Listing photos open large so you can see details before you message someone.', 'WHAT NEIGHBORS SEE
Listing photos open large so you can see details before you message someone.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-02T16:00:00.000Z', '2026-06-02T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-02_tap-photos-to-enlarge'), 0)),
  ('2026-06-02_delete-your-account', '2026-06-02', 'Delete your account', 'You can remove your account and data if you want out.', 'WHAT NEIGHBORS SEE
You can remove your account and data if you want out.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-06-02T14:00:00.000Z', '2026-06-02T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-06-02_delete-your-account'), 0)),
  ('2026-05-31_clearer-claim-hold-buttons', '2026-05-31', 'Clearer claim and hold buttons', 'Easier to see what is available, on hold, or already claimed.', 'WHAT NEIGHBORS SEE
Easier to see what is available, on hold, or already claimed.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-31T18:00:00.000Z', '2026-05-31T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-31_clearer-claim-hold-buttons'), 0)),
  ('2026-05-29_bundle-multi-item-posts', '2026-05-29', 'Post multiple items in one listing', 'One post can list several items — people claim separately and you confirm who got what.', 'WHAT NEIGHBORS SEE
One post can list several items — people claim separately and you confirm who got what.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T22:00:00.000Z', '2026-05-29T22:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_bundle-multi-item-posts'), 0)),
  ('2026-05-29_contactless-self-claim', '2026-05-29', 'Contactless self-claim at pickup', 'At your pickup spot neighbors can claim themselves and pick which items they took — you confirm.', 'WHAT NEIGHBORS SEE
At your pickup spot neighbors can claim themselves and pick which items they took — you confirm.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T21:30:00.000Z', '2026-05-29T21:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_contactless-self-claim'), 0)),
  ('2026-05-29_request-to-dm', '2026-05-29', 'Request to DM outside item chats', 'You can request to message other neighbors directly — aside from listing chats.', 'WHAT NEIGHBORS SEE
You can request to message other neighbors directly — aside from listing chats.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T21:00:00.000Z', '2026-05-29T21:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_request-to-dm'), 0)),
  ('2026-05-29_38-sacramento-neighborhoods', '2026-05-29', '38 Sacramento neighborhoods', 'Expanded the neighborhood list — 38 Sacramento areas to pick from.', 'WHAT NEIGHBORS SEE
Expanded the neighborhood list — 38 Sacramento areas to pick from.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T20:30:00.000Z', '2026-05-29T20:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_38-sacramento-neighborhoods'), 0)),
  ('2026-05-29_map-opens-first', '2026-05-29', 'Map opens first', 'Default tab is the map so you see gifts near you right away.', 'WHAT NEIGHBORS SEE
Default tab is the map so you see gifts near you right away.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T20:00:00.000Z', '2026-05-29T20:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_map-opens-first'), 0)),
  ('2026-05-29_real-driving-routes-on-the-map', '2026-05-29', 'Real driving routes on the map', 'Directions use actual streets, not straight lines across town.', 'WHAT NEIGHBORS SEE
Directions use actual streets, not straight lines across town.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T19:30:00.000Z', '2026-05-29T19:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_real-driving-routes-on-the-map'), 0)),
  ('2026-05-29_map-color-index', '2026-05-29', 'Map color legend', 'A legend on the map explains what each pin color means.', 'WHAT NEIGHBORS SEE
A legend on the map explains what each pin color means.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T19:00:00.000Z', '2026-05-29T19:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_map-color-index'), 0)),
  ('2026-05-29_post-from-the-feed', '2026-05-29', 'Post button on the feed', 'Post from the feed on every screen size — not just the map.', 'WHAT NEIGHBORS SEE
Post from the feed on every screen size — not just the map.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T18:30:00.000Z', '2026-05-29T18:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_post-from-the-feed'), 0)),
  ('2026-05-29_listing-detail-page', '2026-05-29', 'Tap a post for full details', 'Tap any listing for photos, comments, votes, and claim options.', 'WHAT NEIGHBORS SEE
Tap any listing for photos, comments, votes, and claim options.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T18:00:00.000Z', '2026-05-29T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_listing-detail-page'), 0)),
  ('2026-05-29_edit-your-own-posts', '2026-05-29', 'Edit your own posts', 'Update a listing anytime before it is claimed.', 'WHAT NEIGHBORS SEE
Update a listing anytime before it is claimed.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T17:30:00.000Z', '2026-05-29T17:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_edit-your-own-posts'), 0)),
  ('2026-05-29_pick-up-several-items-at-once', '2026-05-29', 'Claim several items in one trip', 'Grab several things from the same neighbor in one pickup when they are giving away a bunch.', 'WHAT NEIGHBORS SEE
Grab several things from the same neighbor in one pickup when they are giving away a bunch.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T17:00:00.000Z', '2026-05-29T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_pick-up-several-items-at-once'), 0)),
  ('2026-05-29_faster-photos', '2026-05-29', 'Faster photo uploads', 'Images load quicker and upload smoother when you post.', 'WHAT NEIGHBORS SEE
Images load quicker and upload smoother when you post.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T16:30:00.000Z', '2026-05-29T16:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_faster-photos'), 0)),
  ('2026-05-29_message-requests', '2026-05-29', 'DM requests — accept or decline', 'New chats start as a request. You accept or decline before talking.', 'WHAT NEIGHBORS SEE
New chats start as a request. You accept or decline before talking.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T16:00:00.000Z', '2026-05-29T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_message-requests'), 0)),
  ('2026-05-29_share-pickup-location-in-chat', '2026-05-29', 'Share pickup spot in chat', 'Send your porch or meetup location privately when arranging pickup.', 'WHAT NEIGHBORS SEE
Send your porch or meetup location privately when arranging pickup.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T15:30:00.000Z', '2026-05-29T15:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_share-pickup-location-in-chat'), 0)),
  ('2026-05-29_neighbor-profiles-avatars', '2026-05-29', 'Neighbor profiles and avatars', 'View profiles and see neighbor photos.', 'WHAT NEIGHBORS SEE
View profiles and see neighbor photos.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T15:00:00.000Z', '2026-05-29T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_neighbor-profiles-avatars'), 0)),
  ('2026-05-29_team-directory', '2026-05-29', 'Team directory', 'See who helps run the community and what role they have.', 'WHAT NEIGHBORS SEE
See who helps run the community and what role they have.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T14:30:00.000Z', '2026-05-29T14:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_team-directory'), 0)),
  ('2026-05-29_role-badges', '2026-05-29', 'Role badges on profiles', 'Director and staff badges show on profiles so you know who runs things.', 'WHAT NEIGHBORS SEE
Director and staff badges show on profiles so you know who runs things.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T14:00:00.000Z', '2026-05-29T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_role-badges'), 0)),
  ('2026-05-29_block-report', '2026-05-29', 'Block and report', 'Block someone who makes you uncomfortable. Blocking auto-reports to me.', 'WHAT NEIGHBORS SEE
Block someone who makes you uncomfortable. Blocking auto-reports to me.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T13:30:00.000Z', '2026-05-29T13:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_block-report'), 0)),
  ('2026-05-29_help-support-tab', '2026-05-29', 'Help and support', 'Report bugs, open tickets, reach staff — all in one place.', 'WHAT NEIGHBORS SEE
Report bugs, open tickets, reach staff — all in one place.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T13:00:00.000Z', '2026-05-29T13:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_help-support-tab'), 0)),
  ('2026-05-29_support-tickets-with-photos', '2026-05-29', 'Attach photos to support tickets', 'Snap a screenshot or photo when you report a problem so I can see what you see.', 'WHAT NEIGHBORS SEE
Snap a screenshot or photo when you report a problem so I can see what you see.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T12:30:00.000Z', '2026-05-29T12:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_support-tickets-with-photos'), 0)),
  ('2026-05-29_pinned-mobile-header-nav', '2026-05-29', 'Pinned header and bottom nav on phones', 'Top bar and bottom tabs stay put while you scroll.', 'WHAT NEIGHBORS SEE
Top bar and bottom tabs stay put while you scroll.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T12:00:00.000Z', '2026-05-29T12:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_pinned-mobile-header-nav'), 0)),
  ('2026-05-29_full-screen-mobile-chat-profile', '2026-05-29', 'Full-screen chat and profile on phones', 'Chat and account use the full phone screen like map and feed.', 'WHAT NEIGHBORS SEE
Chat and account use the full phone screen like map and feed.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T11:30:00.000Z', '2026-05-29T11:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_full-screen-mobile-chat-profile'), 0)),
  ('2026-05-29_tab-history-back-button', '2026-05-29', 'Phone back button works between tabs', 'Your back button moves between tabs the way you would expect.', 'WHAT NEIGHBORS SEE
Your back button moves between tabs the way you would expect.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T11:00:00.000Z', '2026-05-29T11:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_tab-history-back-button'), 0)),
  ('2026-05-29_live-updates-everywhere', '2026-05-29', 'Live updates — no refresh spam', 'New posts, chats, votes, and ticket replies show up without pulling to refresh.', 'WHAT NEIGHBORS SEE
New posts, chats, votes, and ticket replies show up without pulling to refresh.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T10:30:00.000Z', '2026-05-29T10:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_live-updates-everywhere'), 0)),
  ('2026-05-29_community-stats-bar', '2026-05-29', 'Community stats on the feed', 'Live counts of neighbors, posts, and gifts at the top of the feed.', 'WHAT NEIGHBORS SEE
Live counts of neighbors, posts, and gifts at the top of the feed.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T10:00:00.000Z', '2026-05-29T10:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_community-stats-bar'), 0)),
  ('2026-05-29_community-stats-on-public-home', '2026-05-29', 'Stats on the public home page', 'The welcome page shows how active the community is before you join.', 'WHAT NEIGHBORS SEE
The welcome page shows how active the community is before you join.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T09:30:00.000Z', '2026-05-29T09:30:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_community-stats-on-public-home'), 0)),
  ('2026-05-29_public-welcome-site', '2026-05-29', 'Public pages before login', 'About, How It Works, Rules, Areas — browse before you sign up.', 'WHAT NEIGHBORS SEE
About, How It Works, Rules, Areas — browse before you sign up.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-29T09:00:00.000Z', '2026-05-29T09:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-29_public-welcome-site'), 0)),
  ('2026-05-20_mobile-map-category-blips', '2026-05-20', 'Full-screen map on phones', 'Phones get a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.', 'WHAT NEIGHBORS SEE
Phones get a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T20:00:00.000Z', '2026-05-20T20:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_mobile-map-category-blips'), 0)),
  ('2026-05-20_desktop-feed-map-split', '2026-05-20', 'Desktop: feed left, map right', 'Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.', 'WHAT NEIGHBORS SEE
Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T19:00:00.000Z', '2026-05-20T19:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_desktop-feed-map-split'), 0)),
  ('2026-05-20_post-location-picker', '2026-05-20', 'Pick your location when posting', 'When you post you can use current GPS or tap the map and drop a pin for pickup.', 'WHAT NEIGHBORS SEE
When you post you can use current GPS or tap the map and drop a pin for pickup.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T18:00:00.000Z', '2026-05-20T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_post-location-picker'), 0)),
  ('2026-05-20_openstreetmap', '2026-05-20', 'Map uses OpenStreetMap', 'The map is real Sacramento streets — OpenStreetMap, not a blank grid.', 'WHAT NEIGHBORS SEE
The map is real Sacramento streets — OpenStreetMap, not a blank grid.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T17:00:00.000Z', '2026-05-20T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_openstreetmap'), 0)),
  ('2026-05-20_full-screen-mobile-layout', '2026-05-20', 'Full-screen layout on phones', 'Map, feed, chat, and profile each use the whole phone screen — no tiny nested boxes.', 'WHAT NEIGHBORS SEE
Map, feed, chat, and profile each use the whole phone screen — no tiny nested boxes.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T16:00:00.000Z', '2026-05-20T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_full-screen-mobile-layout'), 0)),
  ('2026-05-20_install-on-your-home-screen', '2026-05-20', 'Add to Home Screen', 'You can add TheSacramentoFree to your phone like an app. Basic browsing still works if the connection hiccups.', 'WHAT NEIGHBORS SEE
You can add TheSacramentoFree to your phone like an app. Basic browsing still works if the connection hiccups.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T15:00:00.000Z', '2026-05-20T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_install-on-your-home-screen'), 0)),
  ('2026-05-20_neighbor-chat', '2026-05-20', 'Neighbor chat', 'Message whoever posted something to set up porch pickup.', 'WHAT NEIGHBORS SEE
Message whoever posted something to set up porch pickup.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T14:00:00.000Z', '2026-05-20T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_neighbor-chat'), 0)),
  ('2026-05-20_interactive-sacramento-map', '2026-05-20', 'Interactive Sacramento map', 'Zoom, custom pins, and driving directions to free items.', 'WHAT NEIGHBORS SEE
Zoom, custom pins, and driving directions to free items.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-20T13:00:00.000Z', '2026-05-20T13:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-20_interactive-sacramento-map'), 0)),
  ('2026-05-28_everything-saved-online', '2026-05-28', 'Everything saves in the cloud', 'Posts, profiles, and messages live online — nothing stuck on one device.', 'WHAT NEIGHBORS SEE
Posts, profiles, and messages live online — nothing stuck on one device.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-28T12:00:00.000Z', '2026-05-28T12:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-28_everything-saved-online'), 0)),
  ('2026-05-19_landing-page-before-login', '2026-05-19', 'Landing page before login', 'A public page so you can see what this is, the rules, and neighborhoods before you make an account.', 'WHAT NEIGHBORS SEE
A public page so you can see what this is, the rules, and neighborhoods before you make an account.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T20:00:00.000Z', '2026-05-19T20:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_landing-page-before-login'), 0)),
  ('2026-05-19_email-password-login', '2026-05-19', 'Email and password login', 'Sign in with email and password. Google popups kept getting blocked, so this is the reliable path.', 'WHAT NEIGHBORS SEE
Sign in with email and password. Google popups kept getting blocked, so this is the reliable path.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T19:00:00.000Z', '2026-05-19T19:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_email-password-login'), 0)),
  ('2026-05-19_where-it-all-started', '2026-05-19', 'Where it all started — May 19', 'Day one. Log in, post gives and asks, profiles, messaging. That is the whole idea.', 'WHAT NEIGHBORS SEE
Day one. Log in, post gives and asks, profiles, messaging. That is the whole idea.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T18:00:00.000Z', '2026-05-19T18:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_where-it-all-started'), 0)),
  ('2026-05-19_sacramento-buy-nothing-launches', '2026-05-19', 'Sacramento Buy Nothing is live', 'Site went live — a free place for Sacramento neighbors to give, ask, and connect. No money.', 'WHAT NEIGHBORS SEE
Site went live — a free place for Sacramento neighbors to give, ask, and connect. No money.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T17:00:00.000Z', '2026-05-19T17:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_sacramento-buy-nothing-launches'), 0)),
  ('2026-05-19_the-community-vision', '2026-05-19', 'What this is supposed to be', 'The rules: free gifting, local neighbors, no selling ever. That is the whole point.', 'WHAT NEIGHBORS SEE
The rules: free gifting, local neighbors, no selling ever. That is the whole point.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T16:00:00.000Z', '2026-05-19T16:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_the-community-vision'), 0)),
  ('2026-05-19_neighborhood-map-feed', '2026-05-19', 'Map and feed to browse stuff', 'Browse free gifts on a map or in a scrollable feed — gives and looking-for posts.', 'WHAT NEIGHBORS SEE
Browse free gifts on a map or in a scrollable feed — gives and looking-for posts.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T15:00:00.000Z', '2026-05-19T15:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_neighborhood-map-feed'), 0)),
  ('2026-05-19_sacramento-neighborhood-list', '2026-05-19', 'Pick your neighborhood', 'When you join you pick your Sacramento area so posts stay local to your part of town.', 'WHAT NEIGHBORS SEE
When you join you pick your Sacramento area so posts stay local to your part of town.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T14:00:00.000Z', '2026-05-19T14:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_sacramento-neighborhood-list'), 0)),
  ('2026-05-19_photos-on-listings', '2026-05-19', 'Photos on listings', 'Upload pictures when you post so people know what they are picking up.', 'WHAT NEIGHBORS SEE
Upload pictures when you post so people know what they are picking up.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T13:00:00.000Z', '2026-05-19T13:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_photos-on-listings'), 0)),
  ('2026-05-19_works-on-phone-tablet-desktop', '2026-05-19', 'Works on phone, tablet, and desktop', 'Layout adapts to whatever screen you are on — same community everywhere.', 'WHAT NEIGHBORS SEE
Layout adapts to whatever screen you are on — same community everywhere.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T12:00:00.000Z', '2026-05-19T12:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_works-on-phone-tablet-desktop'), 0)),
  ('2026-05-19_offline-friendly', '2026-05-19', 'Still works if the connection drops', 'Basic browsing still works if your connection hiccups for a second.', 'WHAT NEIGHBORS SEE
Basic browsing still works if your connection hiccups for a second.

— Mark', 'Markeith White', 'TheSacramentoFree Director', '204b071f-100c-401d-b76d-40c594e1f132', '2026-05-19T11:00:00.000Z', '2026-05-19T11:00:00.000Z', COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '2026-05-19_offline-friendly'), 0))
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "updatedAt" = EXCLUDED."updatedAt";

-- 149 feature updates seeded.
