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
  'Email + password login',
  $body$Switched to email and password through Supabase — Google popups kept getting blocked.$body$,
  $detail$Switched to email and password through Supabase — Google popups kept getting blocked.

Google sign-in kept getting blocked in the browser, so I went with plain email and password through Supabase.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_landing-page-before-login',
  '2026-05-19',
  'Landing page before login',
  $body$Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.$body$,
  $detail$Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.

You can read the rules and browse neighborhoods before creating an account.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_neighborhood-map-feed',
  '2026-05-19',
  'Map + feed to browse stuff',
  $body$You can browse free gifts on a map OR in a scrollable feed — gives and looking-for posts.$body$,
  $detail$What you'll notice:
Browse free gifts on a map or scrollable Stuff feed — giveaways giveaways and looking-for posts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_offline-friendly',
  '2026-05-19',
  'Still works if connection drops',
  $body$Basic browsing still works if your connection hiccups for a second.$body$,
  $detail$What you'll notice:
Basic browsing survives brief connection drops — cached profile/items and service worker shell.

Service worker caches static assets.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_orange-sage-branding',
  '2026-05-19',
  'Reddit orange + sage green look',
  $body$Gave it reddit orange and sage green — wanted it to feel like Sacramento, not some random app.$body$,
  $detail$What you'll notice:
Warm orange + sage community palette and Sacramento Buy Nothing logo — local feel, not a generic template.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_photos-on-listings',
  '2026-05-19',
  'Photos on listings',
  $body$You can upload pictures when you post so people know what they're picking up.$body$,
  $detail$What you'll notice:
Upload photos when posting so you know exactly what you are giving or seeking.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_sacramento-buy-nothing-launches',
  '2026-05-19',
  'Sacramento Buy Nothing is live',
  $body$Site went live — free place for Sacramento neighbors to give, ask, and connect. No money.$body$,
  $detail$What you'll notice:
Sacramento Buy Nothing goes live — free local gifting, no selling, no bidding, you helping you.

100% free rule enforced in post flows and moderation.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_sacramento-neighborhood-list',
  '2026-05-19',
  'Pick your neighborhood',
  $body$When you join you pick your Sacramento area so posts stay local to your part of town.$body$,
  $detail$What you'll notice:
Pick your neighborhood at onboarding so posts stay local to your part of Sacramento.

Used for feed filters, map centering, and profile display.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_supabase-schema-file',
  '2026-05-19',
  'DatabaseSQL.txt schema file',
  $body$Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.$body$,
  $detail$Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.

Handy if you're setting up a fresh Supabase project from scratch.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_the-community-vision',
  '2026-05-19',
  'What this is supposed to be',
  $body$Wrote down the rules: free gifting, local neighbors, no selling ever. That's the whole point.$body$,
  $detail$What you'll notice:
Written mission: free gifting, local you, reduce waste, no money ever.

Shown on public About and Rules pages.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_where-it-all-started',
  '2026-05-19',
  'Where it all started — May 19',
  $body$This is day one. I sat down and started building Sacramento Buy Nothing — log in, post gives and asks, profiles, messaging. That's the whole idea.$body$,
  $detail$May 19, 2026 — day one.

I sat down and started building Sacramento Buy Nothing for real: sign in, post gives and asks, profiles, messaging. That was the whole idea from the jump.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_works-on-phone-tablet-desktop',
  '2026-05-19',
  'Works on phone, tablet, desktop',
  $body$Layout adapts to whatever screen you're on — same app everywhere.$body$,
  $detail$Layout adapts to whatever screen you're on — same app everywhere.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_desktop-feed-map-split',
  '2026-05-20',
  'Desktop: feed left, map right',
  $body$Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.$body$,
  $detail$Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_device-view-files',
  '2026-05-20',
  'Separate layouts per screen size',
  $body$Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.$body$,
  $detail$Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_full-screen-mobile-layout',
  '2026-05-20',
  'Full-screen mobile layout',
  $body$Map, feed, chat, and profile each use the whole phone screen — no tiny nested boxes.$body$,
  $detail$What you'll notice:
Map, Stuff, Chat, and Profile each fill the phone — no double scroll containers.

Foundation for modern mobile UX.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_hooked-up-to-a-real-database',
  '2026-05-20',
  'Hooked up Supabase — real data',
  $body$Posts and accounts save online in Supabase now. Same community every time you visit.$body$,
  $detail$What you'll notice:
Posts and accounts persist in Supabase — you see the same listings every visit.

Replaced demo/local-only data store.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_install-on-your-home-screen',
  '2026-05-20',
  'Add to home screen',
  $body$You can add Sacramento Buy Nothing to your phone like an app — works offline for basic browsing.$body$,
  $detail$What you'll notice:
Install Sacramento Buy Nothing like an app — icon on home screen, standalone display mode, basic offline shell.

Beforeinstallprompt handling on Android/desktop Chrome.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_interactive-sacramento-map',
  '2026-05-20',
  'Interactive Sacramento map',
  $body$Map with zoom, custom pins, and driving directions to free items.$body$,
  $detail$What you'll notice:
Leaflet map with zoom, custom pins per listing type, and driving directions to items.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_mobile-first-desktop-unchanged',
  '2026-05-20',
  'Mobile rebuilt, desktop mostly same',
  $body$Reworked phones hard while keeping the wider desktop layout you already had.$body$,
  $detail$What you'll notice:
Phone experience rebuilt for touch-first use while desktop you keep the wider layout they already used.

Parallel MobileView vs DesktopView components.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_mobile-map-category-blips',
  '2026-05-20',
  'Mobile got its own full-screen map',
  $body$Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.$body$,
  $detail$Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_neighbor-chat',
  '2026-05-20',
  'Neighbor chat',
  $body$Message whoever posted something to set up porch pickup.$body$,
  $detail$What you'll notice:
Message the person giving something away to arrange porch pickup.

Start from listing Message button or accepted profile request.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_openstreetmap',
  '2026-05-20',
  'Switched to OpenStreetMap',
  $body$Map uses OpenStreetMap now — real Sacramento streets.$body$,
  $detail$Map uses OpenStreetMap now — real Sacramento streets.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_post-location-picker',
  '2026-05-20',
  'Pick your location when posting',
  $body$When you post you can use your current GPS location OR tap the map and drop a pin for pickup.$body$,
  $detail$When you post you can use your current GPS location OR tap the map and drop a pin for pickup.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_user-roles',
  '2026-05-20',
  'Director + staff roles',
  $body$Added early director and staff roles so we can moderate as this grows.$body$,
  $detail$What you'll notice:
Staff and director roles so the growing community can be moderated fairly.

Early foundation for StaffModerationPanel and RoleBadge.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-28_everything-saved-online',
  '2026-05-28',
  'Everything saves in the cloud',
  $body$All posts, profiles, and messages live online — nothing stuck on one device.$body$,
  $detail$What you'll notice:
Posts, profiles, chats, and votes live in Supabase — same community on every device, nothing stuck on one phone.

MIGRATION from early local-only prototypes to cloud-backed app.

Realtime sync across sessions.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_38-sacramento-neighborhoods',
  '2026-05-29',
  '38 neighborhoods now',
  $body$Expanded the neighborhood list — 38 Sacramento areas to pick from.$body$,
  $detail$What you'll notice:
Pick from 38 Sacramento-area neighborhoods when joining or posting — better local matching.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_block-report',
  '2026-05-29',
  'Block & report',
  $body$Block someone who makes you uncomfortable. Blocking auto-reports to me.$body$,
  $detail$What you'll notice:
Block a neighbor (hide their posts/chats) or send a one-way report to staff.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_bundle-multi-item-posts',
  '2026-05-29',
  'Post multiple items in one listing',
  $body$One post can list several items — people claim separately and you confirm who got what.$body$,
  $detail$One post can list several items — people claim separately and you confirm who got what.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_community-stats-bar',
  '2026-05-29',
  'Community stats on the feed',
  $body$Live counts of neighbors, posts, and gifts at the top of the feed.$body$,
  $detail$What you'll notice:
Live counts of you, active posts, items given, and requests fulfilled at top of Stuff feed.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_community-stats-on-public-home',
  '2026-05-29',
  'Stats on the public home page',
  $body$Welcome page shows how active the community is before you join.$body$,
  $detail$What you'll notice:
Welcome page shows community activity before you join — same stats as in-app bar.

Builds trust for new visitors.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_contactless-self-claim',
  '2026-05-29',
  'Contactless self-claim at pickup',
  $body$At your pickup spot you can claim themselves and pick which items they took — you confirm.$body$,
  $detail$At your pickup spot you can claim themselves and pick which items they took — you confirm.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_director-role-management',
  '2026-05-29',
  'I can assign staff roles',
  $body$I can give people moderator/admin/city manager roles from their profile.$body$,
  $detail$I can bump people up to moderator, administrator, or city manager from their profile.

Helps as the community grows so I'm not the only one watching reports and tickets.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_edit-your-own-posts',
  '2026-05-29',
  'Edit your own posts',
  $body$Update a listing anytime before it's claimed.$body$,
  $detail$What you'll notice:
Edit your listing title, description, photos, and category before it is claimed.

Saved-item bookmarkers can get push on owner edits (if enabled).$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_faster-photos',
  '2026-05-29',
  'Faster photo uploads',
  $body$Images load quicker and upload smoother when you post.$body$,
  $detail$What you'll notice:
Listing photos load faster and upload more smoothly when posting.

ListingImage component with lazy-friendly loading.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_fresh-design-system',
  '2026-05-29',
  'Fresh design pass',
  $body$New cards, cleaner nav, dark/light themes, polished look throughout.$body$,
  $detail$What you'll notice:
Modern cards, cleaner navigation, light/dark themes, consistent buttons and inputs across the app.

Mobile/tablet/desktop shells share the same visual language.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_full-screen-mobile-chat-profile',
  '2026-05-29',
  'Full-screen chat & profile on mobile',
  $body$Chat and account use the full phone screen like map and feed.$body$,
  $detail$Chat and account use the full phone screen like map and feed.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_help-support-tab',
  '2026-05-29',
  'Help & support tab',
  $body$Report bugs, open tickets, reach staff — all in one place.$body$,
  $detail$What you'll notice:
Dedicated Community hub tab for reports, app updates, announcements, and reviews (support tickets now under Chat).

Staff moderation panel on same tab for staff roles.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_iso-fulfillment-credits',
  '2026-05-29',
  'ISO credits if you give a lot',
  $body$Give generously and it helps when you post something you're looking for.$body$,
  $detail$What you'll notice:
When someone helps fulfill your ISO request, they get “items given” credit and you get “items claimed” credit.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_listing-detail-page',
  '2026-05-29',
  'Tap a post for full details',
  $body$Tap any listing for photos, comments, votes, and claim options.$body$,
  $detail$What you'll notice:
Tap any post for full photos, description, comments, votes, bookmark, and claim/message actions.

Opened from ItemGrid, map popups, profile listings.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_live-updates-everywhere',
  '2026-05-29',
  'Live updates — no refresh spam',
  $body$New posts, chats, votes, and ticket replies show up without refreshing.$body$,
  $detail$What you'll notice:
New posts, chat messages, votes, ticket replies, and events appear without manual refresh.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_map-color-index',
  '2026-05-29',
  'Map color legend',
  $body$Little legend on the map explains what each pin color means.$body$,
  $detail$What you'll notice:
Legend on the map explains pin colors for giveaways, looking-for posts, labor, pending pickup, etc.

Category → color mapping in map marker renderer.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_map-opens-first',
  '2026-05-29',
  'Map opens first',
  $body$Default tab is the map so you see gifts near you right away.$body$,
  $detail$WHAT NEIGHBORS SEE Default tab after sign-in is the neighborhood map so you see gifts near you immediately.

DEFAULT TAB — App.tsx initial tab 'map' (localStorage sbn_active_tab_v1)

SacramentoMapView.tsx with category-colored pins.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_message-requests',
  '2026-05-29',
  'DM requests — accept or decline',
  $body$New chats start as a request. You accept or decline before talking.$body$,
  $detail$What you'll notice:
Cold DMs from profiles start as a request — accept or decline before chatting. Listing messages skip the gate.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_neighbor-profiles-avatars',
  '2026-05-29',
  'Neighbor profiles + avatars',
  $body$View profiles and see neighbor photos.$body$,
  $detail$What you'll notice:
Tap avatars to open neighbor profiles with photo, neighborhood, bio, and listings.

Linked from ItemCard, ChatSystem, map pins, comments.

Avatars from Google sign-in photoURL or dicebear fallback.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_pick-up-several-items-at-once',
  '2026-05-29',
  'Claim multiple items one trip',
  $body$Grab several things from the same neighbor in one pickup when they're giving away a bunch.$body$,
  $detail$Grab several things from the same neighbor in one pickup when they're giving away a bunch.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_pinned-mobile-header-nav',
  '2026-05-29',
  'Pinned header + bottom nav on mobile',
  $body$Top bar and bottom tabs stay put while you scroll on phones.$body$,
  $detail$What you'll notice:
Top header and bottom tab bar stay fixed while scrolling on phones.

Safe-area insets for notched iPhones.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_post-from-the-feed',
  '2026-05-29',
  'Post button on the feed',
  $body$Post button on the feed on every screen size — not just the map.$body$,
  $detail$Post button on the feed on every screen size — not just the map.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_public-welcome-site',
  '2026-05-29',
  'Public pages before login',
  $body$About, How It Works, Rules, Areas — browse before you sign up.$body$,
  $detail$What you'll notice:
Public pages before sign-in: Home, About, How It Works, Rules, Areas, Community, Updates, Reviews, GoFundMe.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_real-driving-routes-on-the-map',
  '2026-05-29',
  'Real driving routes on map',
  $body$Directions use actual streets now, not straight lines across the map.$body$,
  $detail$What you'll notice:
Directions to free gifts use real streets (OSRM) instead of straight lines.

Falls back to Haversine line if routing API unavailable.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_request-to-dm',
  '2026-05-29',
  'Request to DM outside item chats',
  $body$You can request to DM other users directly — aside from listing chats.$body$,
  $detail$You can request to DM other users directly — aside from listing chats.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_role-badges',
  '2026-05-29',
  'Role badges on profiles',
  $body$Director and staff badges show on profiles so you know who runs things.$body$,
  $detail$What you'll notice:
Director and staff roles show on profiles and messages so you know who helps run the app.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_share-pickup-location-in-chat',
  '2026-05-29',
  'Share pickup spot in chat',
  $body$Send your porch or meetup location privately when arranging pickup.$body$,
  $detail$What you'll notice:
Listing owner can send porch/meetup address privately in the coordination chat.

Respects showExactLocation privacy flag on items.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_staff-moderation-tools',
  '2026-05-29',
  'Staff moderation tools',
  $body$Staff can review reports, manage accounts, and keep the space safe.$body$,
  $detail$For staff:
Review reports, manage support tickets, view directory, suspend/ban, audit log.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_steadier-sign-in-listings',
  '2026-05-29',
  'Steadier sign-in',
  $body$Stay signed in after refresh and posts load reliably once you're in.$body$,
  $detail$What you'll notice:
Stay signed in after refresh; listings load reliably once logged in.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_support-tickets-with-photos',
  '2026-05-29',
  'Attach photos to support tickets',
  $body$Snap a screenshot or photo when you report a problem so I can see what you see.$body$,
  $detail$What you'll notice:
Attach a photo when opening a support ticket so staff can see what you see.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_tab-history-back-button',
  '2026-05-29',
  'Phone back button works between tabs',
  $body$Your back button moves between tabs the way you'd expect.$body$,
  $detail$What you'll notice:
Android back button and browser back move between app tabs as expected.

ParseTabFromHistoryState on popstate.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_team-directory',
  '2026-05-29',
  'Team directory',
  $body$See who helps run the community and what role they have.$body$,
  $detail$What you'll notice:
See who helps run Sacramento Buy Nothing and their role (moderator, administrator, city manager, director).$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-31_clearer-claim-hold-buttons',
  '2026-05-31',
  'Clearer claim & hold buttons',
  $body$Easier to see what's available, on hold, or already claimed.$body$,
  $detail$What you'll notice:
Clearer buttons and labels for available, on hold, pending pickup, and claimed states on listings and in chat.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-02_animated-public-home-page',
  '2026-06-02',
  'Animated welcome page',
  $body$Home page has some motion so it doesn't feel dead before you sign in.$body$,
  $detail$What you'll notice:
Scroll-driven motion on the welcome page — depth layers move at different speeds as you scroll.

Respects reduced-motion where possible via CSS.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-02_delete-your-account',
  '2026-06-02',
  'Delete your account',
  $body$You can remove your account and data if you want out.$body$,
  $detail$What you'll notice:
Remove your account and community data when you no longer want to participate.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-02_preview-listings-before-joining',
  '2026-06-02',
  'Browse listings before you join',
  $body$Guests can see real posts on the home page without signing up first.$body$,
  $detail$What you'll notice:
Guests browse real active listings on the public home page without creating an account first.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-02_staff-safety-tools',
  '2026-06-02',
  'Staff safety tools',
  $body$Leaders can remove comments, delete accounts, and purge data when we have to.$body$,
  $detail$For staff:
Leaders can remove comments, suspend/ban you, delete accounts, and purge data when safety requires it.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-02_tap-photos-to-enlarge',
  '2026-06-02',
  'Tap photos to enlarge',
  $body$Listing photos open big so you can see details before you message someone.$body$,
  $detail$What you'll notice:
Tap listing photos to open a full-screen lightbox before messaging the giver.

Escape or backdrop tap closes overlay.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-07_save-listings-labor-section',
  '2026-06-07',
  'Save listings + Labor section',
  $body$Bookmark posts to check later. New Labor section for free community help and skills.$body$,
  $detail$What you'll notice:
Bookmark listings to check later. New Labor categories for community help/skills. Added Old Foothill Farms to neighborhood list.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-07_smoother-mobile-home-page',
  '2026-06-07',
  'Smoother mobile home page',
  $body$Fixed layout quirks on phones before you sign in.$body$,
  $detail$What you'll notice:
Guest home page layout fixed on phones — less horizontal scroll, better spacing before sign-in.

Touch-friendly sections and stats bar alignment on narrow screens.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_a-note-from-your-director',
  '2026-06-09',
  'A note from me on the home page',
  $body$I wrote why this exists — free forever, no ads, I don't sell your info.$body$,
  $detail$What you'll notice:
Director welcome message on home and reviews — free forever, no ads, your data is not sold.

Director can edit from Community hub when signed in as director.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_all-notification-toggles',
  '2026-06-09',
  'Every notification toggle works',
  $body$Every switch in push settings actually delivers — messages, claims, discover, staff inbox, pickup reminders, all of it.$body$,
  $detail$What you'll notice:
Every switch in Account → Push notifications should deliver when enabled — messages, claims, discover, staff inbox, pickup reminders, listing status, support, announcements, and more.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_app-updates-vs-announcements-notifications',
  '2026-06-09',
  'Separate toggles: my updates vs staff news',
  $body$Notification settings split App updates (my changelog) and Announcements (staff posts).$body$,
  $detail$WHY WE SPLIT THEM App updates = director changelog in app_updates (technical “what shipped”). Announcements = staff community news in help_announcements (Help board with votes/comments). They must not share one push preference.

Community section now has:. App updates → preference key appUpdates. Announcements → preference key announcements. Account updates → accountUpdates (suspensions, bans, role changes — unchanged)

Database:
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS "appUpdates" BOOLEAN DEFAULT true;.

EVENT_PREF_MAP: app_update → appUpdates announcement → announcements account_update → accountUpdates.

Added app_update alongside announcement. help_announcements INSERT → runAnnouncementNotify → url /help/announcements.

NotifyAppUpdate() sends eventType app_update. notifyCommunityAnnouncement() sends eventType announcement.

/updates opens Help → App updates panel. /help/announcements opens Help → Announcements panel.

Row 14: push-app-updates on app_updates INSERT. Row 15: push-announcements on help_announcements INSERT (not app_updates).$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_cleaner-feed-filters',
  '2026-06-09',
  'Filters in one panel',
  $body$Filters and sorting in one "Filters & sort" panel so the feed isn't a mess.$body$,
  $detail$What you'll notice:
Filters and sorting moved into one “Filters & sort” panel so the Stuff feed stays easy to scroll.

Single panel: type (give/look), category, neighborhood, status, vote/comment filters, sort order.

Mobile-friendly sheet instead of many inline controls.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_comment-and-saved-listing-alerts',
  '2026-06-09',
  'Comment + saved-listing alerts',
  $body$Get pinged when someone comments on your listing or when a bookmarked post changes.$body$,
  $detail$What you'll notice:
Listing owners get a push when someone comments on their post. You who bookmark a listing get alerts when that post is edited, commented on, claimed, or changes status (active → pending pickup → completed). Your listings → Comments. Saved items → edits, comments, claims, status changes.

Item_comments INSERT → comment push to owner + saved-item bookmarkers. items UPDATE → listingStatus / saved-item paths with dedup tags.

SETUP Each comment is its own alert (not bundled). Toggle Saved items if you only want alerts on bookmarked posts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_director-oversight-alerts',
  '2026-06-09',
  'Director oversight alerts for me',
  $body$I get optional push for joins, reports, moderation, tickets, listings, message requests, claims — each toggleable.$body$,
  $detail$WHAT NEIGHBORS SEE (DIRECTORS) Eight optional oversight categories in push settings: joins, departures, moderation, reports, tickets, listings, message requests, claim requests.

Users INSERT/DELETE, moderation_audit_log, user_reports, support_tickets, items, message_requests, item_claim_requests.

Each category has its own toggle — turn off noise you do not need.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_each-staff-member-writes-their-own-message',
  '2026-06-09',
  'Each staff member has their own welcome note',
  $body$Moderators and admins write their own message for home and reviews — not one shared blurb.$body$,
  $detail$What you'll notice:
Each staff member publishes their own welcome note on home and reviews — not one shared city-manager message.

PK userId — one row per staff member.

Director note remains separate in director_message table.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_every-alert-like-new-listings',
  '2026-06-09',
  'Every alert type wired up',
  $body$Messages, comments, votes, pickup reminders, account notices — same pipeline as new listing alerts.$body$,
  $detail$ARCHITECTURE. message_requests INSERT/UPDATE (accepted). item_claim_requests, item_claims, item_comments, item_votes. messages INSERT (per-message tags msg-{messageId}). items UPDATE → status, pickup_scheduled, saved-item alerts. moderation_audit_log → account_update pushes. app_updates / help_announcements → changelog vs staff announcements. support_ticket_messages, user_reports, app_updates.

Push_dispatch_log table with UNIQUE(tag). Fail-open on DB errors except duplicate 23505.

CLIENT_PUSH_DISPATCH_ENABLED true again with dedup tags matching server.

Listing expiry + pickup reminders when app closed.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_feed-renamed-to-stuff',
  '2026-06-09',
  'Feed is now called "Stuff"',
  $body$Renamed the listings tab to Stuff — same free gifts and requests, less weird name.$body$,
  $detail$What you'll notice:
The main listings tab label changed from “Feed” to “Stuff” — same free gifts and looking-for posts, friendlier name.

IN_APP.feedTabLabel = 'Stuff' IN_APP.feedTitle = 'Community Stuff'

No database changes — display copy only.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_fewer-duplicate-notifications',
  '2026-06-09',
  'Fewer duplicate notifications',
  $body$Tightened dedup so the same ping doesn't land twice.$body$,
  $detail$What you'll notice:
The same event should not ping your phone twice when both the open app and the server tried to send at once.

ClaimPushDispatch(tag) inserts into push_dispatch_log with UNIQUE(tag) and ~90s window.

SQL CREATE UNIQUE INDEX IF NOT EXISTS push_dispatch_log_tag_unique ON push_dispatch_log (tag);.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_free-community-events',
  '2026-06-09',
  'Free community events',
  $body$Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.$body$,
  $detail$Post neighborhood gatherings, RSVP (going / maybe / can’t go), and leave comments. Every event must be 100% free.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_gofundme-footer-improvements',
  '2026-06-09',
  'GoFundMe not stuck on the map',
  $body$Removed the GoFundMe strip from under the map tab. Still at the bottom elsewhere — tap for full page.$body$,
  $detail$What you'll notice:
GoFundMe strip removed from under the map. On other scrollable pages it sits at the bottom; tap for full cost breakdown.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_gofundme-on-its-own-page',
  '2026-06-09',
  'GoFundMe got its own page',
  $body$Full cost breakdown on a dedicated page. Short support link at the bottom of other screens.$body$,
  $detail$What you'll notice:
Full hosting cost breakdown on a dedicated page; every other screen shows a short optional support link at the bottom.

Explains Vercel, Supabase, domain, and why the app stays free with no ads.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_listing-vote-alerts',
  '2026-06-09',
  'Upvote/downvote alerts (optional)',
  $body$Optional push when someone votes on your listings — each has its own toggle.$body$,
  $detail$What you'll notice:
Optional push when you upvote or downvote your listings — each direction has its own toggle.

Respects listingUpvotes and listingDownvotes preference keys.

WORKS IN BACKGROUND when push is enabled and device subscription is valid (Add to Home Screen on iPhone).$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_logout-clears-device-push',
  '2026-06-09',
  'Logout clears push on this device',
  $body$Signing out removes this phone's push subscription so the next account doesn't get your alerts.$body$,
  $detail$What you'll notice:
After logout, notification toggles reset in the UI until the next account loads its saved preferences from the database. The device is no longer registered to receive pushes for the signed-out account.

WHAT STAYS IN THE DATABASE Per-account notification_preferences remain saved (toggles you tapped Save settings for). Only device push subscription rows and local session state are cleared.

ClearNotificationDataOnLogout(userId): 1) detachPushSubscriptionForUser(uid) — removes push_subscriptions row for this endpoint and calls subscription.unsubscribe() in the browser. 2) Clears celebration localStorage key sbn_push_celebration_prompt_dismissed_v1. 3) Broadcasts NOTIFICATION_SESSION_CLEARED_EVENT so usePushNotifications resets to CLEARED_NOTIFICATION_PREFERENCES in memory.

Listens for sbn-notification-session-cleared and calls resetPreferencesState().

Await clearNotificationDataOnLogout(userProfile.uid) before supabase.auth.signOut().

IMPORTANT Prefs are per account in notification_preferences (one row per userId). Push delivery is per device in push_subscriptions. Re-enable notifications after switching accounts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_more-ways-to-browse-the-feed',
  '2026-06-09',
  'More feed filters',
  $body$Filter by give vs looking, category, neighborhood, status, votes, comments. Sort newest, oldest, most active.$body$,
  $detail$What you'll notice:
Filter by giving vs looking, category, neighborhood, status, votes, comments. Sort by newest, oldest, or most active.

Helps find active looking-for posts or popular giveaways quickly.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_no-more-double-pings',
  '2026-06-09',
  'No more double pings',
  $body$Same alert was firing twice — fixed that. Drove me nuts too.$body$,
  $detail$What actually fixed it:
Re-enabled client dispatch WITH dedup:. Bad tags fixed: msg-{chatId} → msg-{messageId}, static community-announcement → announcement-{id}.

Removed unauthenticated resubscribe that reassigned endpoints to wrong users.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_notification-settings-save-button',
  '2026-06-09',
  'Save button on notification settings',
  $body$Flip toggles, review, then tap Save settings — they don't auto-save on every tap anymore.$body$,
  $detail$SUMMARY FOR NEIGHBORS Your notification choices are stored per account in Supabase, not silently in the browser. Flip toggles, review them, then tap Save settings. Discard reverts to last saved state. hasUnsavedChanges banner with Save settings + Discard buttons. setDraftPreferences() updates local React state only until save.

Preferences vs savedPreferences state, preferencesEqual(), hasUnsavedRef prevents realtime reload from overwriting unsaved edits.

LOGOUT BEHAVIOR clearNotificationDataOnLogout clears device push + in-memory UI; DB prefs for the account remain for next login.

WHY NOT AUTOSAVE Prevents accidental toggles and matches “prefs per account, push per device” model documented in Help copy.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_notifications-right-account',
  '2026-06-09',
  'Alerts go to the right account',
  $body$Fixed push landing on the wrong person on shared phones. Toggle off then on once while signed in as you.$body$,
  $detail$The problem:
Shared devices: browser push endpoint stayed registered to previous user’s row in push_subscriptions.

1) DELETE FROM push_subscriptions WHERE endpoint = $endpoint 2) UPSERT row with current auth userId, p256dh, auth keys.

After you pull the update:
Each neighbor: notifications off → on once while signed in as themselves.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_push-alerts-in-the-background',
  '2026-06-09',
  'Push works when app is closed',
  $body$Notifications reach your phone when the app isn't open. iPhone: Add to Home Screen.$body$,
  $detail$What you'll notice:
Notifications reach your phone when Sacramento Buy Nothing is closed — not only while the tab is open.

STACK. public/service-worker.js — push event + notificationclick → deep link.

IPHONE.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_push-notifications',
  '2026-06-09',
  'Push notifications (optional)',
  $body$Optional alerts for messages, claims, and activity. Turn on/off in Account.$body$,
  $detail$What you'll notice:
Optional browser push for messages, claims, new listings, comments, and more — controlled per account in settings.

Enable in Account → Push notifications. iPhone: Add to Home Screen for background delivery.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_real-notifications-not-just-test',
  '2026-06-09',
  'Real alerts work — not just test button',
  $body$Messages, listings, comments, and other alerts deliver again. Only the test button had been working for a lot of people. Turn notifications off and on once per device.$body$,
  $detail$What you'll notice:
After this deploy, alerts for real activity (new messages, listing changes, comments, votes, support replies, etc.) should reach your device again — not only the “Send test notification” button in Account → Push notifications.

Export const CLIENT_PUSH_DISPATCH_ENABLED = true;.

New ensureNotificationPreferencesOnSubscribe(userId): if a notification_preferences row already exists, we UPDATE enabled=true without wiping other toggles. Previously ignoreDuplicates on subscribe left enabled=false forever, blocking all real pushes.

SavePushSubscriptionDirect() now calls ensureNotificationPreferencesOnSubscribe() instead of upsert with ignoreDuplicates.

Messages use msg-{messageId}, pickup chat notes use pickup-msg-{messageId}, announcements use announcement-{id} so client and server share tags.

What to do:
On each device: Help or Account → Push notifications → turn off, then on again once. Tap Save settings if you changed toggles. Confirm test push still works, then trigger a real event (have someone message you).$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_saved-bookmarks-sync-online',
  '2026-06-09',
  'Saved bookmarks sync online',
  $body$Bookmarks save to your account so alerts work when the app is closed.$body$,
  $detail$What you'll notice:
Saving a listing now stores the bookmark in your account online — not only on this phone — so the server can alert you when that post changes.

BEFORE localStorage key sbn_saved_items_v1 only — server could not notify when app was closed.

SyncSavedItemBookmark(userId, itemId, saved) writes saved_items rows. migrateLocalSavedItemsToDb() on login imports old local bookmarks.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_smarter-quick-picks',
  '2026-06-09',
  'Stack quick filters',
  $body$Tap multiple quick picks at once — Trending, Saved, My area, With photos, Needs pickup.$body$,
  $detail$What you'll notice:
Tap multiple quick filters at once — Trending, Saved, My area, With photos, Needs pickup.

Trending = recent activity; Saved = useSavedItems hook; My area = your neighborhood; etc.

Combines with full Filters & sort panel.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_stable-after-sign-in',
  '2026-06-09',
  'Fixed crash after sign-in',
  $body$Fixed white screens and "Something went wrong" right after login.$body$,
  $detail$What you'll notice:
Signing in should land you on the feed without a blank page or error boundary. Opening Help → notification-related panels should no longer crash the whole app.

1) Duplicate Supabase Realtime channels Two components both called usePushNotifications(userId) with the same channel name live-notification-prefs-{userId}. Supabase throws: “cannot add postgres_changes callbacks after subscribe()”. That uncaught error took down the React tree.

2) Logout race with push cleanup clearNotificationDataOnLogout() ran during sign-out while hooks still mounted, causing state updates on unmounted components.

RealtimeChannelIdRef uses crypto.randomUUID() so channelName becomes live-notification-prefs-{userId}-{uuid}.

UsePushNotifications(userId, { syncPreferences: false }) so the onboarding prompt does not open a second prefs channel.

UseRef/useState order fixed; logout paths guard against races while notification session clears.

Catches render crashes with a recoverable message instead of a white screen.

Added Heart icon import that had been causing a secondary crash.

How to check:
Sign in on phone and desktop, open Help, expand notification settings, switch accounts — app should remain interactive.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_staff-announcements-in-help',
  '2026-06-09',
  'Staff announcements board',
  $body$Help has a separate Announcements board — staff post news, you vote and comment. Not the same as my changelog.$body$,
  $detail$What you'll notice:
Help & support → Announcements. Tap a post to expand it, upvote/downvote, and join the discussion in comments. This is separate from App updates (director changelog).

For staff:
Any staff role can tap Post announcement. Authors and I can edit or delete their posts. Votes help staff see what resonates.

DATABASE (run in Supabase SQL Editor)

TABLE: help_announcements Columns mirror app_updates but use authorName/authorTitle instead of directorName. postedByUserId links to users.uid.

TABLE: help_announcement_comments announcementId → help_announcements.id ON DELETE CASCADE, plus denormalized userName, userNeighborhood, text.

VOTES.

COMMENTS.

GetSupabaseHelpAnnouncements, createSupabaseHelpAnnouncement, updateSupabaseHelpAnnouncement, deleteSupabaseHelpAnnouncement, comment helpers.

CanPostAnnouncements() = any staff role.

UI.

PUSH.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_star-reviews',
  '2026-06-09',
  'Star reviews for the app',
  $body$Leave a rating — one per person, edit anytime.$body$,
  $detail$What you'll notice:
Leave a 0.5–5 star rating and optional text. One review per neighbor; edit anytime.

UNIQUE userId.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_support-the-app-optional',
  '2026-06-09',
  'Optional GoFundMe support',
  $body$GoFundMe link explains what it costs to run this — and why I'll never charge you or show ads.$body$,
  $detail$What you'll notice:
Optional GoFundMe link explains real monthly costs — app stays 100% free, no ads, no selling data.

Never required to participate in the community.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_test-push-notifications',
  '2026-06-09',
  'Test push button',
  $body$Send yourself a test alert from Account → Push notifications after you subscribe.$body$,
  $detail$What you'll notice:
After enabling push, tap “Send test notification” in Account → Push notifications to confirm this device receives alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_updates-live-in-the-database',
  '2026-06-09',
  'I can post updates from the app now',
  $body$Changelog lives in the database — I post, edit, delete from the app instead of buried code.$body$,
  $detail$What you'll notice:
Director changelog entries live in Supabase, not hard-coded. You read them under Community hub → App updates; director can post, edit, delete.

Columns: id, date, title, body, detail, directorName, postedByUserId.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_updates-reviews-pages',
  '2026-06-09',
  'Updates & Reviews pages',
  $body$Changelog and neighbor reviews under Community in the menu.$body$,
  $detail$What you'll notice:
Public Updates and Reviews pages for guests and you — changelog oldest→newest, star reviews, director note.

Update votes feed back to director.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_vote-on-updates-reviews-team-notes',
  '2026-06-09',
  'Vote on updates, reviews, team notes',
  $body$Upvote or downvote changelog entries, reviews, and staff messages. I see the feedback.$body$,
  $detail$What you'll notice:
Upvote or downvote changelog entries, neighbor app reviews, and staff/director welcome messages. Update votes go to I as product feedback.

TargetType: update | review | leader_message | announcement.

Used in UpdatesList, CommunityReviews, StaffMessage, DirectorMessage.

Cannot vote on your own review. Sign in required.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_withdrawn-posts-stay-hidden',
  '2026-06-09',
  'Withdrawn posts stay hidden',
  $body$If someone removes a listing it doesn't clutter the feed anymore.$body$,
  $detail$What you'll notice:
When a neighbor withdraws a listing, it disappears from the community feed and map.

Owner can still see withdrawn posts in profile history where applicable.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-10_chat-gofundme-scroll-support-back',
  '2026-06-10',
  'GoFundMe scrolls in chat + support back button',
  $body$GoFundMe strip scrolls at bottom of chat instead of pinned on screen. Support tickets have a back button.$body$,
  $detail$On mobile, open Chat and scroll the conversation list — the optional GoFundMe support strip is at the bottom of the scrollable content, not stuck under the messenger window. Same idea on support ticket lists.

Open Chat → Support → My support tickets. Tap ← to return to the chat inbox. Inside a ticket thread, ← goes back to your ticket list.

CODE.

Deploy only — no new SQL tables.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-10_community-staff-chat-notifications',
  '2026-06-10',
  'Push for community + staff chat',
  $body$New messages in Community chat and Staff chat send push — each has its own toggle.$body$,
  $detail$What you'll notice:
When someone posts in Chat → Community chat, you who enabled Community chat notifications get a push alert. Tap it to open the channel.

For staff:
Staff who enabled Staff chat under Notification settings → Staff moderation get alerts for new messages in the staff-only lounge.

NOTIFICATION SETTINGS. Messages & support → Community chat (all you). Staff moderation → Staff chat (staff only)

How it works:. Dedup tags: community-msg-{messageId} and staff-msg-{messageId}. Deep links: /messages/community-global and /messages/community-staff.

CODE.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-10_community-staff-chat-support-moved',
  '2026-06-10',
  'Community chat + support moved to Chat tab',
  $body$Chat now has community-wide channel, staff lounge, and support tickets. Help renamed Community hub.$body$,
  $detail$. Community chat — all you (global channel). Staff chat — staff only (hidden from you). Support — personal tickets with staff (moved out of Community hub). Direct messages — unchanged 1:1 listing/profile chats.

COMMUNITY HUB (was Help) App updates, announcements, reviews, and safety reports. Tab label is now Community.

CODE.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-10_full-changelog-deep-detail',
  '2026-06-10',
  'Tap updates to read full story',
  $body$Every changelog entry can expand with the full write-up when you tap it.$body$,
  $detail$What you'll notice:
Community hub → App updates → tap an entry. The short summary is still one or two sentences; expand to read the full story (what changed, which files, SQL to run).

FOR DIRECTORS.

Run once in Supabase SQL Editor:.

Safe to re-run — ON CONFLICT DO UPDATE refreshes body and detail for all 87 rows.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-10_no-duplicate-announcements',
  '2026-06-10',
  'Announcements don''t show twice',
  $body$Fixed staff announcements appearing twice right after posting.$body$,
  $detail$What you'll notice:
When staff post an announcement under Community hub → Announcements, you should see one card per post — not two identical entries right after publishing.

What was broken:
After posting, the app both (a) added the new row to the screen immediately and (b) refreshed from Supabase realtime a moment later. If realtime finished first, the immediate add ran again and duplicated the same announcement id in the list.

No SQL required for this fix — deploy the app update only.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_bell-tab-order-notifications-before-alerts',
  '2026-06-11',
  'Bell tab order: Notify before Alerts',
  $body$Reorder: Notify → News → Updates → Alerts last so you find your inbox before settings.$body$,
  $detail$Reorder: Notify → News → Updates → Alerts last so you find your inbox before settings.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_block-self-votes',
  '2026-06-11',
  'Can''t vote on your own stuff',
  $body$Upvotes/downvotes disabled on your own listings, reviews, updates, news, and messages.$body$,
  $detail$Applies everywhere you can vote:. Your listings. Your review. Your announcements or changelog entries. Director and staff messages you authored.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_center-map-nav',
  '2026-06-11',
  'Map is the big center button',
  $body$On phones, Map is the round center button in the bottom nav.$body$,
  $detail$Bottom nav: Stuff | Events | Map (circle) | Chat | Account Tap the center circle to open the neighborhood map.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-empty-states',
  '2026-06-11',
  'Chat empty states match',
  $body$Support, DMs, and reviews use the same empty layout when there's nothing yet.$body$,
  $detail$Support, DMs, and reviews use the same empty layout when there's nothing yet.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-message-deletion',
  '2026-06-11',
  'Delete your chat messages',
  $body$Delete messages you sent. I/city managers can remove community channel messages.$body$,
  $detail$Use delete on your own messages in DMs, community chat, staff chat, and support threads. Director and city manager can delete any message in community-global.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-reviews-reports',
  '2026-06-11',
  'Reviews & reports moved to Chat',
  $body$Community reviews, Send a report, and (staff) User reports — last section in Chat sidebar.$body$,
  $detail$. Direct messages. Group chats (All you, Staff lounge). Support. Reviews & reports.

REVIEWS & REPORTS. Community reviews — read and post yours. Send a report — one-way to staff. User reports — staff only.

Group chats replaced the old "Community" label. Public channel is now All you.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-sidebar-actions',
  '2026-06-11',
  'Start conversation + new support rows',
  $body$Quick rows to start a DM or open a new support chat — same style as Send a report.$body$,
  $detail$QUICK ACTIONS (same row style as Send a report). Start conversation — opens Stuff to message from a listing. Open new support chat — private thread with staff.

SIDEBAR ORDER 1. Direct messages 2. Group chats 3. Support 4. Reviews & reports.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-sidebar-preview',
  '2026-06-11',
  'Chat sidebar: last 3 + View all',
  $body$Support and DMs show three recent threads with View all to expand.$body$,
  $detail$Support and DMs show three recent threads with View all to expand.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_community-reviews-layout',
  '2026-06-11',
  'Your review on top, neighbors below',
  $body$Chat → Community reviews: post yours up top, everyone else's below — yours isn't duplicated.$body$,
  $detail$Chat → Community reviews: post yours up top, everyone else's below — yours isn't duplicated.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_delete-dm-and-post-chats',
  '2026-06-11',
  'Delete conversations from Chat',
  $body$Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn. Delete closed support tickets too.$body$,
  $detail$Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn. Delete closed support tickets too.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_hub-removed-staff-on-account',
  '2026-06-11',
  'Hub tab gone — staff tools on Account',
  $body$Removed Hub tab. Staff/director tools live under Account now. Mobile: Stuff | Events | Map | Chat | Account.$body$,
  $detail$STAFF & DIRECTOR Account tab → Staff tools (directory, audit log, welcome messages, etc.) Director → site overview on Account too.

NEIGHBORS Five tabs on mobile: Stuff | Events | Map (center) | Chat | Account News and announcements: bell (top right) Reviews and reports: Chat.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_in-app-dialogs',
  '2026-06-11',
  'No more browser OK/Cancel boxes',
  $body$Confirmations use in-app dialogs that match the site — not generic browser popups.$body$,
  $detail$Applies to deletes, director broadcast tests, and other sensitive actions — src/contexts/ConfirmContext.tsx, ConfirmDialog.tsx.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'New bell menu — 4 tabs',
  $body$Bell (top right): Notify (inbox), News (staff posts), Updates (changelog), Alerts (push toggles — last on purpose).$body$,
  $detail$WHERE TO FIND IT Any screen → top right → bell icon (next to light/dark theme).

Each tab has its own header title, subtitle, and intro so you always know what they are looking at.

Title: Announcements Subtitle: Staff community news — vote and comment What it is: Posts from directors and staff. Vote and comment. Staff publish here — posting triggers push for you who enabled Alerts → Announcements.

Title: App updates Subtitle: Director changelog — what shipped and why What it is: Technical release notes. Tap any entry to expand the full story.

Title: Notifications Subtitle: Your posts — comments, votes, claims, gifts, and status What it is: Only activity on listings YOU posted and your profile — comments, upvotes, downvotes, claims, gifts, listing status, pickup reminders, account updates. Not DMs or neighborhood discover.

Title: Push alerts Subtitle: Turn push on, then choose messages, chat, discover, and community What it is: Enable or turn off push on this device, master All alerts switch, messages, community chat, support, discover (new/nearby listings, requests, saved items), app-update and announcement push toggles, nearby radius, follow categories, staff/director moderation toggles.

WHY TWO PUSH TABS? Notifications = you interacting with your posts. Alerts = general push. Tune separately. Turn push on once under Alerts (last tab) — it covers every tab.

DEEP LINKS. /help/announcements → Announcements. /updates → Updates. /notifications/listings → Notifications. /notifications → Alerts.

IPhone: Home Screen app (Add to Home Screen), not a Safari tab.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_notifications-inbox-alerts-toggles',
  '2026-06-11',
  'Notify = inbox, Alerts = toggles',
  $body$Notifications tab is your inbox of alerts received. Alerts tab (last) has every push toggle.$body$,
  $detail$TAB ORDER (left to right)

1. Announcements — staff news 2. Updates — changelog 3. Notifications — YOUR INBOX: comments, upvotes, downvotes, claims, claim requests, listing status on posts you made 4. Alerts (last) — ALL PUSH TOGGLES: turn device on/off, messages, chat, discover, community, AND your-post alerts (comments, votes, claims, gifts, listing status, pickup reminders, account updates)

KEY IDEA. Notifications = what happened (read it). Alerts = what you want pushed to your phone (toggle it)

DEEP LINKS. /notifications → Notifications inbox. /notifications/alerts → Alerts settings.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_post-announcement-for-push',
  '2026-06-11',
  'Staff: post news from bell for push',
  $body$Staff announcements posted from Bell → News trigger push for neighbors who enabled it.$body$,
  $detail$HOW TO NOTIFY EVERYONE ABOUT PUSH REFRESH.

1. Deploy this app version 2. Run this SQL file for Updates tab entries 3. Bell → Announcements → Post announcement 4. Use title/summary about refreshing alerts under bell → Alerts tab 5. Save once — push goes to you with Announcements enabled under Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'Push rebuilt — refresh once per device',
  $body$Fixed webhooks, duplicate alerts, stuck prefs, shared-phone bugs. Bell → Alerts → off → on → Save. iPhone: Home Screen app.$body$,
  $detail$Push was a mess — a lot of you only got the test alert, not real messages or claims.

I rebuilt the pipeline: webhooks, duplicate filtering, prefs that actually save, and logout clears your phone so shared devices don't cross wires.

If you're still not getting pings: Bell → Alerts → turn off → Save → flip back on → Save. On iPhone, use the Home Screen app — Safari won't cut it.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_refresh-push-notifications',
  '2026-06-11',
  'Please refresh your push alerts',
  $body$After the push rebuild: Bell → Alerts → turn off → enable → save settings once per phone.$body$,
  $detail$Open the bell icon in the top right (next to the theme button) → Alerts tab (last tab) → Turn off alerts, then enable them again.

IPhone you: use Sacramento Buy Nothing from your Home Screen (Add to Home Screen), not a Safari tab — background alerts need the installed app.

After refreshing, you should receive messages, claims, community chat, saved listings, and other alerts reliably. Thank you for your patience!$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_searchable-updates',
  '2026-06-11',
  'Search the changelog',
  $body$Bell → Updates has a search field — find past releases by keyword.$body$,
  $detail$Use Search updates… to find past releases quickly. Works on the public updates page too.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_support-inbox-in-messages',
  '2026-06-11',
  'Support inbox in Chat',
  $body$Support tickets live in Chat with the same sidebar style as DMs.$body$,
  $detail$You: Chat → Support — open tickets, reply, back button to inbox. Staff: Chat → Support inbox — ticket list with last-message preview. Removed from Community hub moderation panel. Push: Alerts tab → Support tickets. Deep links /staff/tickets and /support open Messages support.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_user-notifications-inbox-table',
  '2026-06-11',
  'Inbox logs every alert',
  $body$Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements. If you'd get a push, it shows in your inbox.$body$,
  $detail$TABLE: user_notifications. One row per neighbor per alert (any event type they are eligible to receive). Written by the server when push is dispatched (service role). If you would see a push alert, you also see it under bell → Notifications. Toggle what sends push under Alerts (last tab)

After deploy, trigger any alert (message, comment, nearby listing) to see inbox rows.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_welcome-message-account',
  '2026-06-11',
  'Edit welcome messages from Account',
  $body$Director and staff public welcome notes edited from Account → Staff tools.$body$,
  $detail$Director — Public welcome message (home + reviews) Staff — Your team message (home + reviews) Still shown on home carousel and reviews page.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_awards-coming-soon',
  '2026-06-14',
  'Awards button — coming soon',
  $body$There's a glowing Awards button in the header now. Tap it — page just says coming soon while I build it out.$body$,
  $detail$Swapped the header theme button for a glowing Awards button. Dark/light theme is under Account now.

Tap Awards and you'll get a coming soon page — that's it for now, still building the rest.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_chat-sidebar-header-removed',
  '2026-06-14',
  'Cleaned up chat sidebar header',
  $body$Removed the redundant Chat title and count from the chat sidebar — less noise.$body$,
  $detail$Removed the redundant Chat title and count from the chat sidebar — less noise.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_fix-map-crash-leaflet',
  '2026-06-14',
  'Fixed map crash',
  $body$Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.$body$,
  $detail$Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.

Should be sorted now. If you still see it, hit support and tell me what screen you're on.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_fix-profile-crash',
  '2026-06-14',
  'Fixed profile page crash',
  $body$Profile page crashed after I moved theme settings. Fixed a missing import — should be good now.$body$,
  $detail$Profile page crashed after I moved theme settings. Fixed a missing import — should be good now.

Should be sorted now. If you still see it, hit support and tell me what screen you're on.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_land-on-map-after-login',
  '2026-06-14',
  'You land on the map when you sign in',
  $body$When you log in you go straight to the map tab now instead of somewhere random.$body$,
  $detail$When you log in you go straight to the map tab now instead of somewhere random.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_theme-moved-to-account',
  '2026-06-14',
  'Dark/light theme moved to Account',
  $body$Theme toggle isn't in the header anymore — find it under Account now. Less clutter up top.$body$,
  $detail$Theme toggle isn't in the header anymore — find it under Account now. Less clutter up top.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_trade-barter-listing-type',
  '2026-06-14',
  'Trade/barter posts are live',
  $body$Hey guys 👋

You can post item-for-item swaps now — trade/barter type. Still 100% free, no money involved ever.$body$,
  $detail$Hey guys 👋

You can post item-for-item swaps now — trade/barter type.

Still 100% free. No money, no shipping, no sketchy side deals — just neighbors trading stuff.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_trade-grey-map-pins',
  '2026-06-14',
  'Grey map rings for trade posts',
  $body$Trade listings show a grey ring on the map. Giving stays black, looking stays white.$body$,
  $detail$Trade listings show a grey ring on the map. Giving stays black, looking stays white.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
;
