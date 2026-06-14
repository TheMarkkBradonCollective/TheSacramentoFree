-- =========================================================
-- REWRITE ALL APP UPDATES — Mark's voice (individual entries)
-- Paste into Supabase Dashboard → SQL → New query → Run
--
-- body  = short summary (collapsed)
-- detail = full story (expanded on tap)
-- Regenerate: python3 scripts/generate-mark-voice-updates.py
-- =========================================================

DELETE FROM public.community_content_votes
WHERE "targetType" = 'update';

DELETE FROM public.app_updates;

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-05-19_email-password-login',
  '2026-05-19',
  'email + password login',
  $body$Switched to email and password through Supabase — Google popups kept getting blocked.

— Mark$body$,
  $detail$Switched to email and password through Supabase — Google popups kept getting blocked.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_landing-page-before-login',
  '2026-05-19',
  'landing page before login',
  $body$Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.

— Mark$body$,
  $detail$Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_supabase-schema-file',
  '2026-05-19',
  'databaseSQL.txt schema file',
  $body$Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.

— Mark$body$,
  $detail$Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_desktop-feed-map-split',
  '2026-05-20',
  'desktop: feed left, map right',
  $body$Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.

— Mark$body$,
  $detail$Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_device-view-files',
  '2026-05-20',
  'separate layouts per screen size',
  $body$Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.

— Mark$body$,
  $detail$Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_mobile-map-category-blips',
  '2026-05-20',
  'mobile got its own full-screen map',
  $body$Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.

— Mark$body$,
  $detail$Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_openstreetmap',
  '2026-05-20',
  'switched to OpenStreetMap',
  $body$Map uses OpenStreetMap now — real Sacramento streets.

— Mark$body$,
  $detail$Map uses OpenStreetMap now — real Sacramento streets.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_post-location-picker',
  '2026-05-20',
  'pick your location when posting',
  $body$When you post you can use your current GPS location OR tap the map and drop a pin for pickup.

— Mark$body$,
  $detail$When you post you can use your current GPS location OR tap the map and drop a pin for pickup.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_bundle-multi-item-posts',
  '2026-05-29',
  'post multiple items in one listing',
  $body$One post can list several items — people claim separately and you confirm who got what.

— Mark$body$,
  $detail$One post can list several items — people claim separately and you confirm who got what.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_contactless-self-claim',
  '2026-05-29',
  'contactless self-claim at pickup',
  $body$At your pickup spot you can claim themselves and pick which items they took — you confirm.

— Mark$body$,
  $detail$At your pickup spot you can claim themselves and pick which items they took — you confirm.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_request-to-dm',
  '2026-05-29',
  'request to DM outside item chats',
  $body$You can request to DM other users directly — aside from listing chats.

— Mark$body$,
  $detail$You can request to DM other users directly — aside from listing chats.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_awards-coming-soon',
  '2026-06-14',
  'awards button — coming soon',
  $body$There's a glowing Awards button in the header now. Tap it — page just says coming soon while I build it out.

— Mark$body$,
  $detail$Swapped the header theme button for a glowing Awards button. Dark/light theme is under Account now.

Tap Awards and you'll get a coming soon page — that's it for now, still building the rest.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_chat-sidebar-header-removed',
  '2026-06-14',
  'cleaned up chat sidebar header',
  $body$Removed the redundant Chat title and count from the chat sidebar — less noise.

— Mark$body$,
  $detail$Removed the redundant Chat title and count from the chat sidebar — less noise.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_fix-map-crash-leaflet',
  '2026-06-14',
  'fixed map crash',
  $body$Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.

— Mark$body$,
  $detail$Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_fix-profile-crash',
  '2026-06-14',
  'fixed profile page crash',
  $body$Profile page crashed after I moved theme settings. Fixed a missing import — should be good now.

— Mark$body$,
  $detail$Profile page crashed after I moved theme settings. Fixed a missing import — should be good now.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_land-on-map-after-login',
  '2026-06-14',
  'you land on the map when you sign in',
  $body$When you log in you go straight to the map tab now instead of somewhere random.

— Mark$body$,
  $detail$When you log in you go straight to the map tab now instead of somewhere random.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_theme-moved-to-account',
  '2026-06-14',
  'dark/light theme moved to Account',
  $body$Theme toggle isn't in the header anymore — find it under Account now. Less clutter up top.

— Mark$body$,
  $detail$Theme toggle isn't in the header anymore — find it under Account now. Less clutter up top.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_trade-barter-listing-type',
  '2026-06-14',
  'trade/barter posts are live',
  $body$Hey guys 👋

You can post item-for-item swaps now — trade/barter type. Still 100% free, no money involved ever.

— Mark$body$,
  $detail$Hey guys 👋

You can post item-for-item swaps now — trade/barter type. Still 100% free, no money involved ever.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_trade-grey-map-pins',
  '2026-06-14',
  'grey map rings for trade posts',
  $body$Trade listings show a grey ring on the map. Giving stays black, looking stays white.

— Mark$body$,
  $detail$Trade listings show a grey ring on the map. Giving stays black, looking stays white.

That's the quick version. Poke around the app and you should see it — if something looks off, hit support and tell me what screen you're on.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
)
;
