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
  '2026-05-19_neighborhood-map-feed',
  '2026-05-19',
  'map + feed to browse stuff',
  $body$You can browse free gifts on a map OR in a scrollable feed — gives and looking-for posts.

— Mark$body$,
  $detail$What you'll notice
Browse free gifts on a map or scrollable Stuff feed — giveaways (OFFER) and ISO requests.

TABS — map + feed (now Stuff) in app navigation
TYPES — PostType giveaway | looking in src/types.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_offline-friendly',
  '2026-05-19',
  'still works if connection drops',
  $body$Basic browsing still works if your connection hiccups for a second.

— Mark$body$,
  $detail$What you'll notice
Basic browsing survives brief connection drops — cached profile/items and service worker shell.

readCachedProfile, readCachedItems in App.tsx initial state
Service worker caches static assets.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_orange-sage-branding',
  '2026-05-19',
  'reddit orange + sage green look',
  $body$Gave it reddit orange and sage green — wanted it to feel like Sacramento, not some random app.

— Mark$body$,
  $detail$What you'll notice
Warm orange + sage community palette and Sacramento Buy Nothing logo — local feel, not a generic template.

ASSETS — public/Logo.jpeg, CSS variables in src/index.css
siteContent.ts SITE branding copy

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_photos-on-listings',
  '2026-05-19',
  'photos on listings',
  $body$You can upload pictures when you post so people know what they're picking up.

— Mark$body$,
  $detail$What you'll notice
Upload photos when posting so you know exactly what you are giving or seeking.

STORAGE — Supabase storage upload from PostItemModal.tsx
normalizeItemMedia in src/lib/listingContent.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_sacramento-buy-nothing-launches',
  '2026-05-19',
  'Sacramento Buy Nothing is live',
  $body$Site went live — free place for Sacramento neighbors to give, ask, and connect. No money.

— Mark$body$,
  $detail$What you'll notice
Sacramento Buy Nothing goes live — free local gifting, no selling, no bidding, you helping neighbors.

VISION — src/siteContent.ts ABOUT, RULES, HOW_IT_WORKS
100% free rule enforced in post flows and moderation.

Launch date: May 19, 2026.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_sacramento-neighborhood-list',
  '2026-05-19',
  'pick your neighborhood',
  $body$When you join you pick your Sacramento area so posts stay local to your part of town.

— Mark$body$,
  $detail$What you'll notice
Pick your neighborhood at onboarding so posts stay local to your part of Sacramento.

ONBOARDING — Onboarding.tsx neighborhood select
Used for feed filters, map centering, and profile display.

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
  '2026-05-19_the-community-vision',
  '2026-05-19',
  'what this is supposed to be',
  $body$Wrote down the rules: free gifting, local neighbors, no selling ever. That's the whole point.

— Mark$body$,
  $detail$What you'll notice
Written mission: free gifting, local neighbors, reduce waste, no money ever.

CONTENT — src/siteContent.ts SITE, ABOUT, RULES, principles array
Shown on public About and Rules pages.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_where-it-all-started',
  '2026-05-19',
  'where it all started — May 19',
  $body$This is day one. I sat down and started building Sacramento Buy Nothing — log in, post gives and asks, profiles, messaging. That's the whole idea.

— Mark$body$,
  $detail$What you'll notice
First build session — May 19, 2026 — web app for Sacramento you to give freely and ask kindly.

Origin changelog entry documenting project start
Stack: React + Vite + Supabase + Vercel.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_works-on-phone-tablet-desktop',
  '2026-05-19',
  'works on phone, tablet, desktop',
  $body$Layout adapts to whatever screen you're on — same app everywhere.

— Mark$body$,
  $detail$What you'll notice
Layouts adapt to screen size — MobileView, TabletView, DesktopView shells in App.tsx.

Responsive breakpoints at 768px and 1024px
One codebase, three layouts.

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
  '2026-05-20_full-screen-mobile-layout',
  '2026-05-20',
  'full-screen mobile layout',
  $body$Map, feed, chat, and profile each use the whole phone screen — no tiny nested boxes.

— Mark$body$,
  $detail$What you'll notice
Map, Stuff, Chat, and Profile each fill the phone — no double scroll containers.

Mobile shell refactor — sbn-mobile-shell CSS, flex min-h-0 children
Foundation for modern mobile UX.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_hooked-up-to-a-real-database',
  '2026-05-20',
  'hooked up Supabase — real data',
  $body$Posts and accounts save online in Supabase now. Same community every time you visit.

— Mark$body$,
  $detail$What you'll notice
Posts and accounts persist in Supabase — you see the same listings every visit.

CLIENT — @supabase/supabase-js in src/supabase.ts
SCHEMA — supabase-setup.sql (users, items, chats, messages, …)

Replaced demo/local-only data store.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_install-on-your-home-screen',
  '2026-05-20',
  'add to home screen',
  $body$You can add Sacramento Buy Nothing to your phone like an app — works offline for basic browsing.

— Mark$body$,
  $detail$What you'll notice
Install Sacramento Buy Nothing like an app — icon on home screen, standalone display mode, basic offline shell.

PWA — public/manifest.json, InstallPrompt.tsx, registerServiceWorker.ts
beforeinstallprompt handling on Android/desktop Chrome

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_interactive-sacramento-map',
  '2026-05-20',
  'interactive Sacramento map',
  $body$Map with zoom, custom pins, and driving directions to free items.

— Mark$body$,
  $detail$What you'll notice
Leaflet map with zoom, custom pins per listing type, and driving directions to items.

COMPONENT — SacramentoMapView.tsx (react-leaflet)
ROUTE — src/lib/mapRoute.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_mobile-first-desktop-unchanged',
  '2026-05-20',
  'mobile rebuilt, desktop mostly same',
  $body$Reworked phones hard while keeping the wider desktop layout you already had.

— Mark$body$,
  $detail$What you'll notice
Phone experience rebuilt for touch-first use while desktop you keep the wider layout they already used.

Parallel MobileView vs DesktopView components
Shared business logic in hooks + supabase.ts.

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
  '2026-05-20_neighbor-chat',
  '2026-05-20',
  'neighbor chat',
  $body$Message whoever posted something to set up porch pickup.

— Mark$body$,
  $detail$What you'll notice
Message the person giving something away to arrange porch pickup.

TABLES — chats, messages (two-participant DMs, optional itemId context)
UI — ChatSystem.tsx

Start from listing Message button or accepted profile request.

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
  '2026-05-20_user-roles',
  '2026-05-20',
  'director + staff roles',
  $body$Added early director and staff roles so we can moderate as this grows.

— Mark$body$,
  $detail$What you'll notice
Staff and director roles so the growing community can be moderated fairly.

ROLES — users.role column, src/lib/roles.ts
Early foundation for StaffModerationPanel and RoleBadge.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-28_everything-saved-online',
  '2026-05-28',
  'everything saves in the cloud',
  $body$All posts, profiles, and messages live online — nothing stuck on one device.

— Mark$body$,
  $detail$What you'll notice
Posts, profiles, chats, and votes live in Supabase — same community on every device, nothing stuck on one phone.

MIGRATION from early local-only prototypes to cloud-backed app
CORE — src/supabase.ts + supabase-setup.sql schema

Realtime sync across sessions.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_38-sacramento-neighborhoods',
  '2026-05-29',
  '38 neighborhoods now',
  $body$Expanded the neighborhood list — 38 Sacramento areas to pick from.

— Mark$body$,
  $detail$What you'll notice
Pick from 38 Sacramento-area neighborhoods when joining or posting — better local matching.

CONST — SACRAMENTO_NEIGHBORHOODS in src/types.ts
MAP — NEIGHBORHOOD_COORDS for pin placement
PUBLIC — NeighborhoodsPage.tsx lists all areas

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_block-report',
  '2026-05-29',
  'block & report',
  $body$Block someone who makes you uncomfortable. Blocking auto-reports to me.

— Mark$body$,
  $detail$What you'll notice
Block a you (hide their posts/chats) or send a one-way report to staff.

BLOCK — BlockNeighborModal.tsx, user_blocks table, useBlockedUsers.ts
REPORT — ReportNeighborModal.tsx, user_reports table, AccountHelpSection report form

Blocked you cannot DM you; chats hidden via filterChatsByBlocked in src/supabase.ts.

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
  '2026-05-29_community-stats-bar',
  '2026-05-29',
  'community stats on the feed',
  $body$Live counts of neighbors, posts, and gifts at the top of the feed.

— Mark$body$,
  $detail$What you'll notice
Live counts of neighbors, active posts, items given, and requests fulfilled at top of Stuff feed.

COMPONENT — CommunityStatsBar.tsx
DATA — getCommunityStats() in src/supabase.ts aggregates users/items/claims

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_community-stats-on-public-home',
  '2026-05-29',
  'stats on the public home page',
  $body$Welcome page shows how active the community is before you join.

— Mark$body$,
  $detail$What you'll notice
Welcome page shows community activity before you join — same stats as in-app bar.

HomePage.tsx embeds CommunityStatsBar (compact variant)
Builds trust for new visitors.

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
  '2026-05-29_director-role-management',
  '2026-05-29',
  'I can assign staff roles',
  $body$I can give people moderator/admin/city manager roles from their profile.

— Mark$body$,
  $detail$What you'll notice (DIRECTOR)
I assigns staff roles from you profiles — you → moderator → administrator → manager → director.

UI — role picker on NeighborProfileView / staff tools
API — updateUserRole in src/supabase.ts

Legacy role slugs normalized in normalizeUserRole().

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_edit-your-own-posts',
  '2026-05-29',
  'edit your own posts',
  $body$Update a listing anytime before it's claimed.

— Mark$body$,
  $detail$What you'll notice
Edit your listing title, description, photos, and category before it is claimed.

UI — PostItemModal.tsx in edit mode from ItemDetailView
API — updateSupabaseItem in src/supabase.ts

Saved-item bookmarkers can get push on owner edits (if enabled).

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_faster-photos',
  '2026-05-29',
  'faster photo uploads',
  $body$Images load quicker and upload smoother when you post.

— Mark$body$,
  $detail$What you'll notice
Listing photos load faster and upload more smoothly when posting.

CLIENT — src/lib/imageUrl.ts compressImageIfNeeded before upload
STORAGE — Supabase storage buckets for listing images

ListingImage component with lazy-friendly loading.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_fresh-design-system',
  '2026-05-29',
  'fresh design pass',
  $body$New cards, cleaner nav, dark/light themes, polished look throughout.

— Mark$body$,
  $detail$What you'll notice
Modern cards, cleaner navigation, light/dark themes, consistent buttons and inputs across the app.

CSS — src/index.css design tokens (--color-accent, sbn-btn, sbn-card, item-feed-card)
ThemeToggle.tsx persists preference

Mobile/tablet/desktop shells share the same visual language.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_full-screen-mobile-chat-profile',
  '2026-05-29',
  'full-screen chat & profile on mobile',
  $body$Chat and account use the full phone screen like map and feed.

— Mark$body$,
  $detail$What you'll notice
Chat and Account tabs use the full phone screen like Map and Stuff — no cramped nested boxes.

LAYOUT — MobileView.tsx tab panes with min-h-0 flex columns
ChatSystem fullBleed mode

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_help-support-tab',
  '2026-05-29',
  'Help & support tab',
  $body$Report bugs, open tickets, reach staff — all in one place.

— Mark$body$,
  $detail$What you'll notice
Dedicated Community hub tab for reports, app updates, announcements, and reviews (support tickets now under Chat).

UI — AccountHelpSection.tsx in CommunityMenuView.tsx
TAB — app tab 'menu' labeled Community (src/siteContent.ts)

Staff moderation panel on same tab for staff roles.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_iso-fulfillment-credits',
  '2026-05-29',
  'ISO credits if you give a lot',
  $body$Give generously and it helps when you post something you're looking for.

— Mark$body$,
  $detail$What you'll notice
When someone helps fulfill your ISO request, they get “items given” credit and you get “items claimed” credit.

FLOW — ChatSystem “Mark request fulfilled” → markItemFulfilledFromChat() in src/supabase.ts
CLAIM TYPE — request_fulfilled in item_claims

STATS — getNeighborStats() on NeighborProfileView / UserProfileView

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_listing-detail-page',
  '2026-05-29',
  'tap a post for full details',
  $body$Tap any listing for photos, comments, votes, and claim options.

— Mark$body$,
  $detail$What you'll notice
Tap any post for full photos, description, comments, votes, bookmark, and claim/message actions.

UI — ItemDetailView.tsx + ListingEngagement.tsx
Opened from ItemGrid, map popups, profile listings

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_live-updates-everywhere',
  '2026-05-29',
  'live updates — no refresh spam',
  $body$New posts, chats, votes, and ticket replies show up without refreshing.

— Mark$body$,
  $detail$What you'll notice
New posts, chat messages, votes, ticket replies, and events appear without manual refresh.

HELPER — src/lib/supabaseRealtime.ts subscribePostgresChanges()
USED BY — useItemsRealtime, ChatSystem, useEventsEngagement, usePushNotifications, etc.

Supabase Realtime publication on public tables (supabase-setup.sql).

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_map-color-index',
  '2026-05-29',
  'map color legend',
  $body$Little legend on the map explains what each pin color means.

— Mark$body$,
  $detail$What you'll notice
Legend on the map explains pin colors for giveaways, ISO requests, labor, pending pickup, etc.

UI — SacramentoMapView.tsx color guide toggle / index
Category → color mapping in map marker renderer

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_map-opens-first',
  '2026-05-29',
  'map opens first',
  $body$Default tab is the map so you see gifts near you right away.

— Mark$body$,
  $detail$What you'll notice
Default tab after sign-in is the neighborhood map so you see gifts near you immediately.

DEFAULT TAB — App.tsx initial tab 'map' (localStorage sbn_active_tab_v1)

SacramentoMapView.tsx with category-colored pins.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_message-requests',
  '2026-05-29',
  'DM requests — accept or decline',
  $body$New chats start as a request. You accept or decline before talking.

— Mark$body$,
  $detail$What you'll notice
Cold DMs from profiles start as a request — accept or decline before chatting. Listing messages skip the gate.

TABLE — message_requests (status pending|accepted|declined)
UI — ChatSystem incoming requests section, NeighborProfileView send/accept

API — sendMessageRequest, acceptMessageRequest in src/supabase.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_neighbor-profiles-avatars',
  '2026-05-29',
  'neighbor profiles + avatars',
  $body$View profiles and see neighbor photos.

— Mark$body$,
  $detail$What you'll notice
Tap avatars to open you profiles with photo, neighborhood, bio, and listings.

UI — NeighborProfileView.tsx
Linked from ItemCard, ChatSystem, map pins, comments

Avatars from Google sign-in photoURL or dicebear fallback.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_pick-up-several-items-at-once',
  '2026-05-29',
  'claim multiple items one trip',
  $body$Grab several things from the same neighbor in one pickup when they're giving away a bunch.

— Mark$body$,
  $detail$What you'll notice
Multi-item giveaways: claim specific subitems or several things in one trip.

TABLES — listing_subitems, item_claims, item_claim_requests
UI — SubItemPicker.tsx, ClaimAtPickupButton.tsx, ChatClaimActions.tsx

MESSAGES — formatSelfClaimRequestMessage in src/lib/claims.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_pinned-mobile-header-nav',
  '2026-05-29',
  'pinned header + bottom nav on mobile',
  $body$Top bar and bottom tabs stay put while you scroll on phones.

— Mark$body$,
  $detail$What you'll notice
Top header and bottom tab bar stay fixed while scrolling on phones.

CSS — sbn-mobile-shell, sbn-mobile-header, bottom nav in MobileView.tsx
safe-area insets for notched iPhones

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_post-from-the-feed',
  '2026-05-29',
  'post button on the feed',
  $body$Post button on the feed on every screen size — not just the map.

— Mark$body$,
  $detail$What you'll notice
Post button on Stuff feed and events — create giveaway or ISO from any screen size.

FAB / header buttons in MobileView, DesktopView
PostItemModal.tsx, PostEventModal.tsx

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_public-welcome-site',
  '2026-05-29',
  'public pages before login',
  $body$About, How It Works, Rules, Areas — browse before you sign up.

— Mark$body$,
  $detail$What you'll notice
Public pages before sign-in: Home, About, How It Works, Rules, Areas, Community, Updates, Reviews, GoFundMe.

ROUTER — src/components/public/PublicSite.tsx hash routes (#/home, etc.)
CONFIG — src/public/routes.ts

App.tsx shows PublicSite until userProfile exists.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_real-driving-routes-on-the-map',
  '2026-05-29',
  'real driving routes on map',
  $body$Directions use actual streets now, not straight lines across the map.

— Mark$body$,
  $detail$What you'll notice
Directions to free gifts use real streets (OSRM) instead of straight lines.

MODULE — src/lib/mapRoute.ts fetchRoute(), openDrivingDirections()
MAP — SacramentoMapView.tsx draws polyline overlay

Falls back to Haversine line if routing API unavailable.

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
  '2026-05-29_role-badges',
  '2026-05-29',
  'role badges on profiles',
  $body$Director and staff badges show on profiles so you know who runs things.

— Mark$body$,
  $detail$What you'll notice
I and staff roles show on profiles and messages so you know who helps run the app.

COMPONENT — RoleBadge.tsx
LABELS — ROLE_LABELS in src/lib/roles.ts (city_moderator, city_administrator, city_manager, director)

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_share-pickup-location-in-chat',
  '2026-05-29',
  'share pickup spot in chat',
  $body$Send your porch or meetup location privately when arranging pickup.

— Mark$body$,
  $detail$What you'll notice
Listing owner can send porch/meetup address privately in the coordination chat.

BUTTON — ChatSystem.tsx “Send pickup location”
FORMAT — formatPickupLocationMessage() in src/lib/itemLocation.ts
Respects showExactLocation privacy flag on items.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_staff-moderation-tools',
  '2026-05-29',
  'staff moderation tools',
  $body$Staff can review reports, manage accounts, and keep the space safe.

— Mark$body$,
  $detail$What you'll notice (STAFF)
Review reports, manage support tickets, view directory, suspend/ban, audit log.

PANEL — StaffModerationPanel.tsx
PERMS — src/lib/roles.ts staff rank system

TABLES — user_reports, support_tickets, moderation_audit_log

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_steadier-sign-in-listings',
  '2026-05-29',
  'steadier sign-in',
  $body$Stay signed in after refresh and posts load reliably once you're in.

— Mark$body$,
  $detail$What you'll notice
Stay signed in after refresh; listings load reliably once logged in.

AUTH — Supabase auth session in App.tsx
CACHE — readCachedProfile/readCachedItems for faster first paint
FIXES — profile + items fetch retries in src/supabase.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_support-tickets-with-photos',
  '2026-05-29',
  'attach photos to support tickets',
  $body$Snap a screenshot or photo when you report a problem so I can see what you see.

— Mark$body$,
  $detail$What you'll notice
Attach a photo when opening a support ticket so staff can see what you see.

UI — ChatSupportSection.tsx (Chat tab), SupportTicketThread.tsx
STORAGE — upload to Supabase storage; support_ticket_messages.imageUrl column

API — createSupportTicket, addSupportTicketMessage in src/supabase.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_tab-history-back-button',
  '2026-05-29',
  'phone back button works between tabs',
  $body$Your back button moves between tabs the way you'd expect.

— Mark$body$,
  $detail$What you'll notice
Android back button and browser back move between app tabs as expected.

HISTORY — App.tsx TAB_HISTORY_KEY sbnTab in window.history state
parseTabFromHistoryState on popstate

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_team-directory',
  '2026-05-29',
  'team directory',
  $body$See who helps run the community and what role they have.

— Mark$body$,
  $detail$What you'll notice
See who helps run Sacramento Buy Nothing and their role (moderator, administrator, city manager, director).

UI — staff directory section in StaffModerationPanel.tsx
BADGES — RoleBadge.tsx + roleLabel() from src/lib/roles.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-31_clearer-claim-hold-buttons',
  '2026-05-31',
  'clearer claim & hold buttons',
  $body$Easier to see what's available, on hold, or already claimed.

— Mark$body$,
  $detail$What you'll notice
Clearer buttons and labels for available, on hold, pending pickup, and claimed states on listings and in chat.

UI — ItemDetailView.tsx status actions, ChatSystem.tsx hold/pending pickup buttons
STATUSES — active | on_hold | pending_pickup | completed | withdrawn

ChatClaimActions.tsx for giveaway claim confirm flow.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_animated-public-home-page',
  '2026-06-02',
  'animated welcome page',
  $body$Home page has some motion so it doesn't feel dead before you sign in.

— Mark$body$,
  $detail$What you'll notice
Scroll-driven motion on the welcome page — depth layers move at different speeds as you scroll.

COMPONENT — HomeScrollStage.tsx
Used by HomePage.tsx for pre-login marketing experience

Respects reduced-motion where possible via CSS.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_delete-your-account',
  '2026-06-02',
  'delete your account',
  $body$You can remove your account and data if you want out.

— Mark$body$,
  $detail$What you'll notice
Remove your account and community data when you no longer want to participate.

UI — UserProfileView.tsx delete section
SERVER — deleteOwnAccount() in src/supabase.ts

SQL — supabase-sql/account-deletion.sql (delete_own_account RPC + cascades)

Staff can also delete accounts from StaffModerationPanel.tsx (higher permission).

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_preview-listings-before-joining',
  '2026-06-02',
  'browse listings before you join',
  $body$Guests can see real posts on the home page without signing up first.

— Mark$body$,
  $detail$What you'll notice
Guests browse real active listings on the public home page without creating an account first.

COMPONENT — GuestListingPreview.tsx
Read-only cards; tap opens GuestItemDetailView.tsx with sign-in CTA to message

DATA — App.tsx passes visibleItems subset to PublicSite

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_staff-safety-tools',
  '2026-06-02',
  'staff safety tools',
  $body$Leaders can remove comments, delete accounts, and purge data when we have to.

— Mark$body$,
  $detail$What you'll notice (STAFF)
Leaders can remove comments, suspend/ban neighbors, delete accounts, and purge data when safety requires it.

PANEL — StaffModerationPanel.tsx
ROLES — src/lib/roles.ts canStaffSuspend, canStaffBan, canStaffDeleteAccount

AUDIT — moderation_audit_log table tracks actions
API — src/supabase.ts staff moderation helpers

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_tap-photos-to-enlarge',
  '2026-06-02',
  'tap photos to enlarge',
  $body$Listing photos open big so you can see details before you message someone.

— Mark$body$,
  $detail$What you'll notice
Tap listing photos to open a full-screen lightbox before messaging the giver.

COMPONENTS — ImageLightbox.tsx, ListingPhotoGallery.tsx
Used in ItemDetailView.tsx and listing cards

Escape or backdrop tap closes overlay.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-07_save-listings-labor-section',
  '2026-06-07',
  'save listings + Labor section',
  $body$Bookmark posts to check later. New Labor section for free community help and skills.

— Mark$body$,
  $detail$What you'll notice
Bookmark listings to check later. New Labor categories for community help/skills. Added Old Foothill Farms to neighborhood list.

SAVED — useSavedItems.ts + saved_items sync (see saved-bookmarks update)

LABOR — src/types.ts categories: Labor & Services, Labor & Services Needed, Help / Labor Request
PostItemModal.tsx category picker; map pin colors in SacramentoMapView.tsx

NEIGHBORHOODS — SACRAMENTO_NEIGHBORHOODS in src/types.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-07_smoother-mobile-home-page',
  '2026-06-07',
  'smoother mobile home page',
  $body$Fixed layout quirks on phones before you sign in.

— Mark$body$,
  $detail$What you'll notice
Guest home page layout fixed on phones — less horizontal scroll, better spacing before sign-in.

Behind the scenes — src/components/public/pages/HomePage.tsx, HomeScrollStage.tsx, public layout CSS in src/index.css

Touch-friendly sections and stats bar alignment on narrow screens.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_a-note-from-your-director',
  '2026-06-09',
  'a note from me on the home page',
  $body$I wrote why this exists — free forever, no ads, I don't sell your info.

— Mark$body$,
  $detail$What you'll notice
I welcome message on home and reviews — free forever, no ads, your data is not sold.

TABLE — director_message (id 'main')
DEFAULT COPY — src/siteContent.ts DIRECTOR_MESSAGE_DEFAULT

UI — DirectorMessage.tsx, LeadershipMessagesCarousel.tsx
HOOK — useDirectorMessage.ts with realtime sync

I can edit from Community hub when signed in as director.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_all-notification-toggles',
  '2026-06-09',
  'every notification toggle works',
  $body$Every switch in push settings actually delivers — messages, claims, discover, staff inbox, pickup reminders, all of it.

— Mark$body$,
  $detail$What you'll notice
Every switch in Account → Push notifications should deliver when enabled — messages, claims, discover, staff inbox, pickup reminders, listing status, support, announcements, and more.

PREFS TABLE — notification_preferences (supabase-sql/notifications-complete.sql)

SERVER MAP — api/push/_server/pushDelivery.ts EVENT_PREF_MAP filters each eventType

WEBHOOKS — supabase-sql/supabase-push-webhook.sql (15 handlers documented)

CRON — api/cron/notification-jobs.ts for listing expiry + pickup reminders

After this update
Run notifications SQL, confirm webhooks, toggle notifications off → on once per device.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_app-updates-vs-announcements-notifications',
  '2026-06-09',
  'separate toggles: my updates vs staff news',
  $body$Notification settings split App updates (my changelog) and Announcements (staff posts).

— Mark$body$,
  $detail$WHY WE SPLIT THEM
App updates = director changelog in app_updates (technical “what shipped”). Announcements = staff community news in help_announcements (Help board with votes/comments). They must not share one push preference.

NOTIFICATION TOGGLES — src/components/NotificationSettings.tsx
Community section now has:
• App updates → preference key appUpdates
• Announcements → preference key announcements
• Account updates → accountUpdates (suspensions, bans, role changes — unchanged)

Database stuff
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS "appUpdates" BOOLEAN DEFAULT true;
(see supabase-sql/add-app-updates-notification-pref.sql)

SERVER PREF MAP — api/push/_server/pushDelivery.ts
EVENT_PREF_MAP:
  app_update → appUpdates
  announcement → announcements
  account_update → accountUpdates

PUSH EVENT TYPES — api/push/_server/pushDelivery.ts PushEventType
Added app_update alongside announcement.

WEBHOOK ROUTING — api/push/_server/webhookDispatch.ts
• app_updates INSERT → runAppUpdateNotify (api/push/_server/appUpdateNotify.ts) → url /updates
• help_announcements INSERT → runAnnouncementNotify → url /help/announcements

CLIENT PUSH — src/lib/pushEvents.ts
notifyAppUpdate() sends eventType app_update.
notifyCommunityAnnouncement() sends eventType announcement.

DEEP LINKS — src/lib/pushDeepLink.ts
/updates opens Help → App updates panel.
/help/announcements opens Help → Announcements panel.
App.tsx passes initialHelpPanel through MobileView / TabletView / DesktopView → CommunityMenuView → AccountHelpSection.

WEBHOOK DOC — supabase-sql/supabase-push-webhook.sql
Row 14: push-app-updates on app_updates INSERT.
Row 15: push-announcements on help_announcements INSERT (not app_updates).

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_cleaner-feed-filters',
  '2026-06-09',
  'filters in one panel',
  $body$Filters and sorting in one "Filters & sort" panel so the feed isn't a mess.

— Mark$body$,
  $detail$What you'll notice
Filters and sorting moved into one “Filters & sort” panel so the Stuff feed stays easy to scroll.

UI — src/components/ItemGrid.tsx
Single panel: type (give/look), category, neighborhood, status, vote/comment filters, sort order

Mobile-friendly sheet instead of many inline controls.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_comment-and-saved-listing-alerts',
  '2026-06-09',
  'comment + saved-listing alerts',
  $body$Get pinged when someone comments on your listing or when a bookmarked post changes.

— Mark$body$,
  $detail$What you'll notice
Listing owners get a push when someone comments on their post. You who bookmark a listing get alerts when that post is edited, commented on, claimed, or changes status (active → pending pickup → completed).

NOTIFICATION TOGGLES — src/components/NotificationSettings.tsx
• Your listings → Comments
• Saved items → edits, comments, claims, status changes

SERVER — api/push/_server/neighborNotify.ts + webhookDispatch.ts
item_comments INSERT → comment push to owner + saved-item bookmarkers.
items UPDATE → listingStatus / saved-item paths with dedup tags.

CLIENT — src/hooks/useSavedItemPushAlerts.ts watches saved listing IDs for changes when app is open.

DATA — saved_items table (synced from local bookmarks via migrateLocalSavedItemsToDb in src/supabase.ts).

SETUP
Each comment is its own alert (not bundled). Toggle Saved items if you only want alerts on bookmarked posts.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_director-oversight-alerts',
  '2026-06-09',
  'director oversight alerts for me',
  $body$I get optional push for joins, reports, moderation, tickets, listings, message requests, claims — each toggleable.

— Mark$body$,
  $detail$What you'll notice (DIRECTORS)
Eight optional oversight categories in push settings: joins, departures, moderation, reports, tickets, listings, message requests, claim requests.

UI — src/components/NotificationSettings.tsx → I oversight section

SERVER — api/push/_server/directorNotify.ts + webhookDispatch.ts
users INSERT/DELETE, moderation_audit_log, user_reports, support_tickets, items, message_requests, item_claim_requests.

DEEP LINK — /director/overview → DirectorSiteOverview.tsx

Each category has its own toggle — turn off noise you do not need.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_each-staff-member-writes-their-own-message',
  '2026-06-09',
  'each staff member has their own welcome note',
  $body$Moderators and admins write their own message for home and reviews — not one shared blurb.

— Mark$body$,
  $detail$What you'll notice
Each staff member publishes their own welcome note on home and reviews — not one shared city-manager message.

TABLE — staff_messages (supabase-sql/staff-messages.sql)
PK userId — one row per staff member

UI — src/components/StaffMessage.tsx, PublishedStaffMessages.tsx, LeadershipMessagesCarousel.tsx
HOOKS — useStaffMessage.ts, usePublishedStaffMessages.ts

PERMS — canEditOwnStaffMessage() in src/lib/roles.ts
I note remains separate in director_message table.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_every-alert-like-new-listings',
  '2026-06-09',
  'every alert type wired up',
  $body$Messages, comments, votes, pickup reminders, account notices — same pipeline as new listing alerts.

— Mark$body$,
  $detail$ARCHITECTURE
New listings were the reference path: Supabase INSERT on items → webhook → api/webhooks/supabase-push → api/push/_server/webhookDispatch.ts → neighborNotify → runPushSend → sendPushToUsers.

WEBHOOK HANDLERS ADDED/COMPLETED — webhookDispatch.ts
• message_requests INSERT/UPDATE (accepted)
• item_claim_requests, item_claims, item_comments, item_votes
• messages INSERT (per-message tags msg-{messageId})
• items UPDATE → status, pickup_scheduled, saved-item alerts
• moderation_audit_log → account_update pushes
• app_updates / help_announcements → changelog vs staff announcements
• support_ticket_messages, user_reports, app_updates

DEDUP — api/push/_server/pushDedup.ts
push_dispatch_log table with UNIQUE(tag). Fail-open on DB errors except duplicate 23505.

CLIENT DISPATCH — src/lib/pushConfig.ts
CLIENT_PUSH_DISPATCH_ENABLED true again with dedup tags matching server.

SQL setup
supabase-sql/notifications-complete.sql, supabase-sql/supabase-push-webhook.sql (15 webhooks), push_dispatch_log unique index on tag.

CRON — api/cron/notification-jobs.ts
Listing expiry + pickup reminders when app closed.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_feed-renamed-to-stuff',
  '2026-06-09',
  'feed is now called "Stuff"',
  $body$Renamed the listings tab to Stuff — same free gifts and requests, less weird name.

— Mark$body$,
  $detail$What you'll notice
The main listings tab label changed from “Feed” to “Stuff” — same free gifts and ISO requests, friendlier name.

COPY — src/siteContent.ts
IN_APP.feedTabLabel = 'Stuff'
IN_APP.feedTitle = 'Community Stuff'

NAV — src/components/MobileView.tsx, TabletView.tsx, Navbar.tsx use IN_APP.feedTabLabel

No database changes — display copy only.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_fewer-duplicate-notifications',
  '2026-06-09',
  'fewer duplicate notifications',
  $body$Tightened dedup so the same ping doesn't land twice.

— Mark$body$,
  $detail$What you'll notice
The same event should not ping your phone twice when both the open app and the server tried to send at once.

FIX — api/push/_server/pushDedup.ts
claimPushDispatch(tag) inserts into push_dispatch_log with UNIQUE(tag) and ~90s window.

TAGS — src/lib/pushEvents.ts aligns client tags with api/push/_server/neighborNotify.ts (msg-{messageId}, etc.).

SUBSCRIBE HARDENING — api/push/_server/pushSubscribe.ts + api/push/resubscribe.ts keep endpoint rows valid after deploys.

SQL
CREATE UNIQUE INDEX IF NOT EXISTS push_dispatch_log_tag_unique ON push_dispatch_log (tag);

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_free-community-events',
  '2026-06-09',
  'free community events',
  $body$Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.

— Mark$body$,
  $detail$What you'll notice
Post free neighborhood gatherings, RSVP (going/maybe/can't go), comment on events. Paid/ticketed events are blocked.

TABLES — community_events, event_rsvps, event_comments (supabase-sql/all-community-updates.sql + supabase-setup.sql)
CHECK constraint isFree = true

UI — EventsView.tsx, EventCard.tsx, EventDetailView.tsx, PostEventModal.tsx
REALTIME — useEventsRealtime.ts, useEventsEngagement.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_gofundme-footer-improvements',
  '2026-06-09',
  'GoFundMe not stuck on the map',
  $body$Removed the GoFundMe strip from under the map tab. Still at the bottom elsewhere — tap for full page.

— Mark$body$,
  $detail$What you'll notice
GoFundMe strip removed from under the map. On other scrollable pages it sits at the bottom; tap for full cost breakdown.

COMPONENTS — GoFundMeFooter.tsx, PageScrollFooter.tsx, GoFundMeSupport.tsx
PUBLIC PAGE — src/components/public/pages/GoFundMePage.tsx

SIGNED-IN — tap footer opens full-screen GoFundMe panel from App.tsx

COPY — src/siteContent.ts GOFUNDME constants

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_gofundme-on-its-own-page',
  '2026-06-09',
  'GoFundMe got its own page',
  $body$Full cost breakdown on a dedicated page. Short support link at the bottom of other screens.

— Mark$body$,
  $detail$What you'll notice
Full hosting cost breakdown on a dedicated page; every other screen shows a short optional support link at the bottom.

ROUTE — #/gofundme via src/public/routes.ts
PAGE — GoFundMePage.tsx renders GoFundMeSupport.tsx

Explains Vercel, Supabase, domain, and why the app stays free with no ads.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_listing-vote-alerts',
  '2026-06-09',
  'upvote/downvote alerts (optional)',
  $body$Optional push when someone votes on your listings — each has its own toggle.

— Mark$body$,
  $detail$What you'll notice
Optional push when you upvote or downvote your listings — each direction has its own toggle.

TOGGLES — Account → Push notifications → Your listings → Upvotes / Downvotes

SERVER — item_votes INSERT/UPDATE webhook → api/push/_server/neighborNotify.ts
Respects listingUpvotes and listingDownvotes preference keys.

UI — src/components/ListingEngagement.tsx records votes; ItemDetailView shows counts.

WORKS IN BACKGROUND when push is enabled and device subscription is valid (Add to Home Screen on iPhone).

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_logout-clears-device-push',
  '2026-06-09',
  'logout clears push on this device',
  $body$Signing out removes this phone's push subscription so the next account doesn't get your alerts.

— Mark$body$,
  $detail$What you'll notice
After logout, notification toggles reset in the UI until the next account loads its saved preferences from the database. The device is no longer registered to receive pushes for the signed-out account.

WHAT STAYS IN THE Database stuff
Per-account notification_preferences remain saved (toggles you tapped Save settings for). Only device push subscription rows and local session state are cleared.

CODE PATH — src/lib/pushNotifications.ts
clearNotificationDataOnLogout(userId):
1) detachPushSubscriptionForUser(uid) — removes push_subscriptions row for this endpoint and calls subscription.unsubscribe() in the browser.
2) Clears celebration localStorage key sbn_push_celebration_prompt_dismissed_v1.
3) Broadcasts NOTIFICATION_SESSION_CLEARED_EVENT so usePushNotifications resets to CLEARED_NOTIFICATION_PREFERENCES in memory.

HOOK — src/hooks/usePushNotifications.ts
Listens for sbn-notification-session-cleared and calls resetPreferencesState().

CALLED FROM — src/App.tsx handleLogOut
await clearNotificationDataOnLogout(userProfile.uid) before supabase.auth.signOut().

IMPORTANT
Prefs are per account in notification_preferences (one row per userId). Push delivery is per device in push_subscriptions. Re-enable notifications after switching accounts.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_more-ways-to-browse-the-feed',
  '2026-06-09',
  'more feed filters',
  $body$Filter by give vs looking, category, neighborhood, status, votes, comments. Sort newest, oldest, most active.

— Mark$body$,
  $detail$What you'll notice
Filter by giving vs looking, category, neighborhood, status, votes, comments. Sort by newest, oldest, or most active.

ENGAGEMENT DATA — useItemsEngagement.ts loads item_votes + item_comments for filter predicates

UI — ItemGrid.tsx filter state persisted in component session

Helps find active ISO requests or popular giveaways quickly.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_no-more-double-pings',
  '2026-06-09',
  'no more double pings',
  $body$Same alert was firing twice — fixed that. Drove me nuts too.

— Mark$body$,
  $detail$The problem
Client runPushTask() in src/supabase.ts and Supabase webhooks both fired on the same database event → two notifications.

First fix I tried
Set CLIENT_PUSH_DISPATCH_ENABLED = false in src/lib/pushConfig.ts — stopped doubles but broke alerts when webhooks absent.

What actually fixed it
Re-enabled client dispatch WITH dedup:
• api/push/_server/pushDedup.ts — claimPushDispatch(tag)
• Matching tags in src/lib/pushEvents.ts and api/push/_server/neighborNotify.ts
• Bad tags fixed: msg-{chatId} → msg-{messageId}, static community-announcement → announcement-{id}

SERVICE WORKER — public/service-worker.js
Removed unauthenticated resubscribe that reassigned endpoints to wrong users.

SUBSCRIBE — api/push/_server/pushSubscribe.ts claimPushSubscriptionForUser deletes endpoint then upserts for signed-in userId.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_notification-settings-save-button',
  '2026-06-09',
  'Save button on notification settings',
  $body$Flip toggles, review, then tap Save settings — they don't auto-save on every tap anymore.

— Mark$body$,
  $detail$SUMMARY FOR NEIGHBORS
Your notification choices are stored per account in Supabase, not silently in the browser. Flip toggles, review them, then tap Save settings. Discard reverts to last saved state.

UI — src/components/NotificationSettings.tsx
• hasUnsavedChanges banner with Save settings + Discard buttons.
• setDraftPreferences() updates local React state only until save.
• savePreferences() → saveNotificationPreferences() in src/lib/pushNotifications.ts → upsert notification_preferences.

HOOK — src/hooks/usePushNotifications.ts
preferences vs savedPreferences state, preferencesEqual(), hasUnsavedRef prevents realtime reload from overwriting unsaved edits.

Database stuff
Table notification_preferences (see supabase-sql/notifications-complete.sql). Realtime channel syncs across tabs when another device saves.

LOGOUT BEHAVIOR
clearNotificationDataOnLogout clears device push + in-memory UI; DB prefs for the account remain for next login.

WHY NOT AUTOSAVE
Prevents accidental toggles and matches “prefs per account, push per device” model documented in Help copy.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_notifications-right-account',
  '2026-06-09',
  'alerts go to the right account',
  $body$Fixed push landing on the wrong person on shared phones. Toggle off then on once while signed in as you.

— Mark$body$,
  $detail$The problem
Shared devices: browser push endpoint stayed registered to previous user’s row in push_subscriptions.

FIX — api/push/_server/pushSubscribe.ts claimPushSubscriptionForUser()
1) DELETE FROM push_subscriptions WHERE endpoint = $endpoint
2) UPSERT row with current auth userId, p256dh, auth keys

CLIENT — src/lib/pushNotifications.ts persistPushSubscription() posts to /api/push/subscribe with Bearer token.

RESUBSCRIBE — api/push/resubscribe.ts requires auth (removed service worker silent resubscribe).

LOGOUT — clearNotificationDataOnLogout() detaches subscription for signed-out user.

After this update
Each neighbor: notifications off → on once while signed in as themselves.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_push-alerts-in-the-background',
  '2026-06-09',
  'push works when app is closed',
  $body$Notifications reach your phone when the app isn't open. iPhone: Add to Home Screen.

— Mark$body$,
  $detail$What you'll notice
Notifications reach your phone when Sacramento Buy Nothing is closed — not only while the tab is open.

STACK
• public/service-worker.js — push event + notificationclick → deep link
• Supabase webhooks → api/webhooks/supabase-push → runPushSend
• VAPID keys in Vercel env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

IPHONE
Safari tabs alone do not get background push. Add to Home Screen (iOS 16.4+). InstallPrompt.tsx explains steps.

CLIENT — src/lib/pushNotifications.ts subscribe flow + src/pwa/registerServiceWorker.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_push-notifications',
  '2026-06-09',
  'push notifications (optional)',
  $body$Optional alerts for messages, claims, and activity. Turn on/off in Account.

— Mark$body$,
  $detail$What you'll notice
Optional browser push for messages, claims, new listings, comments, and more — controlled per account in settings.

TABLES — push_subscriptions, notification_preferences (supabase-sql/push-notifications.sql, notifications-complete.sql)

CLIENT — src/lib/pushNotifications.ts, usePushNotifications.ts, NotificationSettings.tsx
SERVER — api/push/* routes, server/push.ts, public/service-worker.js

Enable in Account → Push notifications. iPhone: Add to Home Screen for background delivery.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_real-notifications-not-just-test',
  '2026-06-09',
  'real alerts work — not just test button',
  $body$Messages, listings, comments, and other alerts deliver again. Only the test button had been working for a lot of people. Turn notifications off and on once per device.

— Mark$body$,
  $detail$What you'll notice
After this deploy, alerts for real activity (new messages, listing changes, comments, votes, support replies, etc.) should reach your device again — not only the “Send test notification” button in Account → Push notifications.

What was broken
I had turned off client-side push dispatch to stop duplicate notifications. That left many alert types dependent on Supabase database webhooks alone. If webhooks were missing or a preference row had enabled=false stuck in the database, every real push was filtered out — while the test endpoint (/api/push/test) still worked because it bypasses preference checks and webhooks.

What I changed

1) Re-enabled client dispatch — src/lib/pushConfig.ts
   export const CLIENT_PUSH_DISPATCH_ENABLED = true;
   The app again calls push helpers after Supabase writes (src/supabase.ts → runPushTask). Server webhooks remain the backup when the app is closed.

2) Dedup prevents doubles — api/push/_server/pushDedup.ts
   claimPushDispatch(tag) writes to push_dispatch_log with a 90-second window. Client and webhook both may fire; only the first send with a given tag goes through.

3) Subscribe fixes stuck “all off” prefs — api/push/_server/pushSubscribe.ts
   New ensureNotificationPreferencesOnSubscribe(userId): if a notification_preferences row already exists, we UPDATE enabled=true without wiping other toggles. Previously ignoreDuplicates on subscribe left enabled=false forever, blocking all real pushes.

4) Same subscribe fix on the client — src/lib/pushNotifications.ts
   savePushSubscriptionDirect() now calls ensureNotificationPreferencesOnSubscribe() instead of upsert with ignoreDuplicates.

5) Aligned dedup tags — src/lib/pushEvents.ts + api/push/_server/neighborNotify.ts
   Messages use msg-{messageId}, pickup chat notes use pickup-msg-{messageId}, announcements use announcement-{id} so client and server share tags.

Behind the scenes (files I touched)
src/lib/pushConfig.ts, src/supabase.ts, src/lib/pushIntegration.ts, src/lib/pushEvents.ts, api/push/_server/pushSubscribe.ts, api/push/subscribe.ts, server/app.ts

What you should do
On each device: Help or Account → Push notifications → turn off, then on again once. Tap Save settings if you changed toggles. Confirm test push still works, then trigger a real event (have someone message you).

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_saved-bookmarks-sync-online',
  '2026-06-09',
  'saved bookmarks sync online',
  $body$Bookmarks save to your account so alerts work when the app is closed.

— Mark$body$,
  $detail$What you'll notice
Saving a listing now stores the bookmark in your account online — not only on this phone — so the server can alert you when that post changes.

BEFORE
localStorage key sbn_saved_items_v1 only — server could not notify when app was closed.

AFTER — src/hooks/useSavedItems.ts + src/supabase.ts
syncSavedItemBookmark(userId, itemId, saved) writes saved_items rows.
migrateLocalSavedItemsToDb() on login imports old local bookmarks.

PUSH — src/hooks/useSavedItemPushAlerts.ts + webhooks on items/item_comments/item_claims.

UI — bookmark button on ItemCard.tsx and ItemDetailView.tsx; “Saved” quick pick in ItemGrid.tsx.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_smarter-quick-picks',
  '2026-06-09',
  'stack quick filters',
  $body$Tap multiple quick picks at once — Trending, Saved, My area, With photos, Needs pickup.

— Mark$body$,
  $detail$What you'll notice
Tap multiple quick filters at once — Trending, Saved, My area, With photos, Needs pickup.

LOGIC — ItemGrid.tsx quickPicks state (multi-select)
Trending = recent activity; Saved = useSavedItems hook; My area = your neighborhood; etc.

Combines with full Filters & sort panel.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_stable-after-sign-in',
  '2026-06-09',
  'fixed crash after sign-in',
  $body$Fixed white screens and "Something went wrong" right after login.

— Mark$body$,
  $detail$What you'll notice
Signing in should land you on the feed without a blank page or error boundary. Opening Help → notification-related panels should no longer crash the whole app.

Why it broke

1) Duplicate Supabase Realtime channels
   Two components both called usePushNotifications(userId) with the same channel name live-notification-prefs-{userId}. Supabase throws: “cannot add postgres_changes callbacks after subscribe()”. That uncaught error took down the React tree.

2) Logout race with push cleanup
   clearNotificationDataOnLogout() ran during sign-out while hooks still mounted, causing state updates on unmounted components.

What I changed

1) Unique realtime channel per hook instance — src/hooks/usePushNotifications.ts
   realtimeChannelIdRef uses crypto.randomUUID() so channelName becomes live-notification-prefs-{userId}-{uuid}.

2) Lightweight celebration modal — src/components/PushNotificationCelebration.tsx
   usePushNotifications(userId, { syncPreferences: false }) so the onboarding prompt does not open a second prefs channel.

3) Hook order + guards — src/App.tsx
   useRef/useState order fixed; logout paths guard against races while notification session clears.

4) Error boundary — src/components/AppErrorBoundary.tsx
   Catches render crashes with a recoverable message instead of a white screen.

5) Missing import — src/components/Onboarding.tsx
   Added Heart icon import that had been causing a secondary crash.

Behind the scenes (files I touched)
src/hooks/usePushNotifications.ts, src/components/PushNotificationCelebration.tsx, src/components/NotificationSettings.tsx, src/App.tsx, src/components/AppErrorBoundary.tsx, src/lib/pushNotifications.ts (clearNotificationDataOnLogout)

How to check it
Sign in on phone and desktop, open Help, expand notification settings, switch accounts — app should remain interactive.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_staff-announcements-in-help',
  '2026-06-09',
  'staff announcements board',
  $body$Help has a separate Announcements board — staff post news, you vote and comment. Not the same as my changelog.

— Mark$body$,
  $detail$What you'll notice
Help & support → Announcements. Tap a post to expand it, upvote/downvote, and join the discussion in comments. This is separate from App updates (director changelog).

What staff see
Any staff role can tap Post announcement. Authors and me can edit or delete their posts. Votes help staff see what resonates.

Database stuff (run in Supabase SQL Editor)
1) supabase-sql/help-announcements.sql — table help_announcements
2) supabase-sql/help-announcement-comments.sql — table help_announcement_comments
3) supabase-sql/add-app-updates-notification-pref.sql — appUpdates column + announcement vote type

TABLE: help_announcements
Columns mirror app_updates but use authorName/authorTitle instead of directorName. postedByUserId links to users.uid.

TABLE: help_announcement_comments
announcementId → help_announcements.id ON DELETE CASCADE, plus denormalized userName, userNeighborhood, text.

VOTES
community_content_votes.targetType now includes 'announcement' (see community-content-votes.sql). AnnouncementsList uses useCommunityContentVotes('announcement', ids).

COMMENTS
src/hooks/useHelpAnnouncementComments.ts — loads comments, realtime on help_announcement_comments, optimistic add/delete.
src/components/AnnouncementComments.tsx — discussion UI under expanded posts.

CRUD / API LAYER — src/supabase.ts
getSupabaseHelpAnnouncements, createSupabaseHelpAnnouncement, updateSupabaseHelpAnnouncement, deleteSupabaseHelpAnnouncement, comment helpers.

PERMISSIONS — src/lib/roles.ts
canPostAnnouncements() = any staff role.
canEditAnnouncement(actor, postedByUserId) = author or director.

UI
src/components/AnnouncementsList.tsx — main list (forked from UpdatesList with comments).
src/components/AccountHelpSection.tsx — second Help tile for Announcements vs App updates.

PUSH
help_announcements INSERT → api/push/_server/webhookDispatch.ts → runAnnouncementNotify → eventType 'announcement' → notifications toggle announcements.

Add 15th webhook: help_announcements INSERT → /api/webhooks/supabase-push

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_star-reviews',
  '2026-06-09',
  'star reviews for the app',
  $body$Leave a rating — one per person, edit anytime.

— Mark$body$,
  $detail$What you'll notice
Leave a 0.5–5 star rating and optional text. One review per neighbor; edit anytime.

TABLE — app_reviews (supabase-sql/all-community-updates.sql)
UNIQUE userId

UI — CommunityReviews.tsx (in-app), public ReviewsPage.tsx
VOTES — community_content_votes targetType 'review'

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_support-the-app-optional',
  '2026-06-09',
  'optional GoFundMe support',
  $body$GoFundMe link explains what it costs to run this — and why I'll never charge you or show ads.

— Mark$body$,
  $detail$What you'll notice
Optional GoFundMe link explains real monthly costs — app stays 100% free, no ads, no selling data.

COPY — src/siteContent.ts GOFUNDME section
UI — GoFundMeFooter.tsx, GoFundMeSupport.tsx, GoFundMePage.tsx

Never required to participate in the community.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_test-push-notifications',
  '2026-06-09',
  'test push button',
  $body$Send yourself a test alert from Account → Push notifications after you subscribe.

— Mark$body$,
  $detail$What you'll notice
After enabling push, tap “Send test notification” in Account → Push notifications to confirm this device receives alerts.

ENDPOINT — api/push/test.ts (bypasses preference checks — always sends to your subscription)

CLIENT — src/lib/pushNotifications.ts sendTestPush()

USE THIS to verify VAPID keys and service worker before debugging “real” alerts that depend on prefs + webhooks.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_updates-live-in-the-database',
  '2026-06-09',
  'I can post updates from the app now',
  $body$Changelog lives in the database — I post, edit, delete from the app instead of buried code.

— Mark$body$,
  $detail$What you'll notice
I changelog entries live in Supabase, not hard-coded. You read them under Community hub → App updates; director can post, edit, delete.

TABLE — app_updates (supabase-sql/app-updates.sql)
Columns: id, date, title, body, detail, directorName, postedByUserId

UI — src/components/UpdatesList.tsx, AppUpdateEditModal.tsx
API — src/supabase.ts getSupabaseAppUpdates, create/update/delete

PUBLIC — src/components/public/pages/UpdatesPage.tsx (#/updates)

VOTES — community_content_votes targetType 'update'

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_updates-reviews-pages',
  '2026-06-09',
  'Updates & Reviews pages',
  $body$Changelog and neighbor reviews under Community in the menu.

— Mark$body$,
  $detail$What you'll notice
Public Updates and Reviews pages for guests and you — changelog oldest→newest, star reviews, director note.

ROUTES — #/updates, #/reviews in src/public/routes.ts
PAGES — UpdatesPage.tsx, ReviewsPage.tsx (public shell PublicSite.tsx)

IN-APP — Community hub tiles mirror same data via UpdatesList and CommunityReviews

Update votes feed back to director.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_vote-on-updates-reviews-team-notes',
  '2026-06-09',
  'vote on updates, reviews, team notes',
  $body$Upvote or downvote changelog entries, reviews, and staff messages. I see the feedback.

— Mark$body$,
  $detail$What you'll notice
Upvote or downvote changelog entries, you app reviews, and staff/director welcome messages. Update votes go to me as product feedback.

TABLE — community_content_votes (supabase-sql/community-content-votes.sql)
targetType: update | review | leader_message | announcement

UI — ContentVoteButtons.tsx + useCommunityContentVotes.ts
Used in UpdatesList, CommunityReviews, StaffMessage, DirectorMessage

Cannot vote on your own review. Sign in required.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_withdrawn-posts-stay-hidden',
  '2026-06-09',
  'withdrawn posts stay hidden',
  $body$If someone removes a listing it doesn't clutter the feed anymore.

— Mark$body$,
  $detail$What you'll notice
When a you withdraws a listing, it disappears from the community feed and map.

STATUS — items.status = 'withdrawn' (src/types.ts PostStatus)

QUERIES — getSupabaseItems filters active statuses for feed/map
Owner can still see withdrawn posts in profile history where applicable.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_chat-gofundme-scroll-support-back',
  '2026-06-10',
  'GoFundMe scrolls in chat + support back button',
  $body$GoFundMe strip scrolls at bottom of chat instead of pinned on screen. Support tickets have a back button.

— Mark$body$,
  $detail$What you'll notice

CHAT → GOFUNDME
On mobile, open Chat and scroll the conversation list — the optional GoFundMe support strip is at the bottom of the scrollable content, not stuck under the messenger window. Same idea on support ticket lists.

CHAT → SUPPORT → BACK
Open Chat → Support → My support tickets. Tap ← to return to the chat inbox. Inside a ticket thread, ← goes back to your ticket list.

CODE
• src/components/MobileView.tsx — removed pinned GoFundMe sibling under Chat
• src/components/ChatSystem.tsx — PageScrollFooter at end of chat_rooms_scrollable; onOpenGoFundMe prop
• src/components/ChatSupportSection.tsx — back button on ticket list (onBackToChat)
• src/components/DesktopView.tsx / TabletView.tsx — GoFundMe below chat card in page scroll

Deploy only — no new SQL tables.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_community-staff-chat-notifications',
  '2026-06-10',
  'push for community + staff chat',
  $body$New messages in Community chat and Staff chat send push — each has its own toggle.

— Mark$body$,
  $detail$What you'll notice
When someone posts in Chat → Community chat, you who enabled Community chat notifications get a push alert. Tap it to open the channel.

What staff see
Staff who enabled Staff chat under Notification settings → Staff moderation get alerts for new messages in the staff-only lounge.

NOTIFICATION SETTINGS
• Messages & support → Community chat (all neighbors)
• Staff moderation → Staff chat (staff only)

SQL I ran in Supabase
supabase-sql/add-community-chat-notification-prefs.sql

How it works
• messages INSERT webhook (push-messages) routes community-global and community-staff to broadcast handlers
• Dedup tags: community-msg-{messageId} and staff-msg-{messageId}
• Deep links: /messages/community-global and /messages/community-staff

CODE
api/push/_server/communityChatNotify.ts, api/push/_server/neighborNotify.ts, api/push/_server/runPushSend.ts, api/push/_server/pushDelivery.ts, src/lib/pushEvents.ts, src/lib/pushIntegration.ts, src/supabase.ts, src/components/NotificationSettings.tsx

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_community-staff-chat-support-moved',
  '2026-06-10',
  'community chat + support moved to Chat tab',
  $body$Chat now has community-wide channel, staff lounge, and support tickets. Help renamed Community hub.

— Mark$body$,
  $detail$What you'll notice

CHAT TAB
• Community chat — all you (global channel)
• Staff chat — staff only (hidden from neighbors)
• Support — personal tickets with staff (moved out of Community hub)
• Direct messages — unchanged 1:1 listing/profile chats

COMMUNITY HUB (was Help)
App updates, announcements, reviews, and safety reports. Tab label is now Community.

SQL I ran in Supabase (if not already)
• supabase-sql/community-chats.sql — seeds community-global and community-staff rows
• supabase-sql/help-announcements.sql + help-announcement-comments.sql (announcements board)

WEBHOOK
help_announcements INSERT → /api/webhooks/supabase-push (push-announcements)

CODE
src/lib/communityChats.ts, src/components/ChatSystem.tsx, src/components/ChatSupportSection.tsx, src/components/AccountHelpSection.tsx, src/siteContent.ts

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_full-changelog-deep-detail',
  '2026-06-10',
  'tap updates to read full story',
  $body$Every changelog entry can expand with the full write-up when you tap it.

— Mark$body$,
  $detail$What you'll notice
Community hub → App updates → tap an entry. The short summary is still one or two sentences; expand to read the full story (what changed, which files, SQL to run).

FOR DIRECTORS
Post new entries with Summary + Full story fields in the edit modal. Regenerate the SQL bundle anytime with: node scripts/expand-changelog-details.mjs

SQL TO PUBLISH ALL DETAIL TEXT
Run once in Supabase SQL Editor:
supabase-sql/expand-all-community-updates-detail.sql

Safe to re-run — ON CONFLICT DO UPDATE refreshes body and detail for all 87 rows.

Behind the scenes
scripts/expand-changelog-details.mjs, supabase-sql/expand-all-community-updates-detail.sql, src/components/UpdatesList.tsx, src/components/AppUpdateEditModal.tsx

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_no-duplicate-announcements',
  '2026-06-10',
  'announcements don''t show twice',
  $body$Fixed staff announcements appearing twice right after posting.

— Mark$body$,
  $detail$What you'll notice
When staff post an announcement under Community hub → Announcements, you should see one card per post — not two identical entries right after publishing.

What was broken
After posting, the app both (a) added the new row to the screen immediately and (b) refreshed from Supabase realtime a moment later. If realtime finished first, the immediate add ran again and duplicated the same announcement id in the list.

What I changed
• src/hooks/useHelpAnnouncements.ts — after a successful post, reload from the database instead of prepending a second copy; debounced realtime refresh; dedupe by id when loading.
• src/hooks/useAppUpdates.ts — same pattern for director changelog posts (prevents the same bug on App updates).

Behind the scenes
src/hooks/useHelpAnnouncements.ts, src/hooks/useAppUpdates.ts, src/lib/supabaseRealtime.ts (debounceRealtime)

No SQL required for this fix — deploy the app update only.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_bell-tab-order-notifications-before-alerts',
  '2026-06-11',
  'bell tab order: Notify before Alerts',
  $body$Reorder: Notify → News → Updates → Alerts last so you find your inbox before settings.

— Mark$body$,
  $detail$See 2026-06-11_notifications-inbox-alerts-toggles for full explanation.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_block-self-votes',
  '2026-06-11',
  'can''t vote on your own stuff',
  $body$Upvotes/downvotes disabled on your own listings, reviews, updates, news, and messages.

— Mark$body$,
  $detail$Applies everywhere you can vote:
• Your listings
• Your review
• Your announcements or changelog entries
• I and staff messages you authored

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_center-map-nav',
  '2026-06-11',
  'map is the big center button',
  $body$On phones, Map is the round center button in the bottom nav.

— Mark$body$,
  $detail$Bottom nav: Stuff | Events | Map (circle) | Chat | Account
Tap the center circle to open the neighborhood map.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-empty-states',
  '2026-06-11',
  'chat empty states match',
  $body$Support, DMs, and reviews use the same empty layout when there's nothing yet.

— Mark$body$,
  $detail$Consistent icon, title, and description — sidebar and full inbox match.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-message-deletion',
  '2026-06-11',
  'delete your chat messages',
  $body$Delete messages you sent. I/city managers can remove community channel messages.

— Mark$body$,
  $detail$Use delete on your own messages in DMs, community chat, staff chat, and support threads. I and city manager can delete any message in community-global.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-reviews-reports',
  '2026-06-11',
  'reviews & reports moved to Chat',
  $body$Community reviews, Send a report, and (staff) User reports — last section in Chat sidebar.

— Mark$body$,
  $detail$Chat sidebar order (top to bottom)
• Direct messages
• Group chats (All neighbors, Staff lounge)
• Support
• Reviews & reports

REVIEWS & REPORTS
• Community reviews — read and post yours
• Send a report — one-way to staff
• User reports — staff only

Group chats replaced the old "Community" label. Public channel is now All neighbors.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-sidebar-actions',
  '2026-06-11',
  'Start conversation + new support rows',
  $body$Quick rows to start a DM or open a new support chat — same style as Send a report.

— Mark$body$,
  $detail$QUICK ACTIONS (same row style as Send a report)
• Start conversation — opens Stuff to message from a listing
• Open new support chat — private thread with staff

SIDEBAR ORDER
1. Direct messages
2. Group chats
3. Support
4. Reviews & reports

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-sidebar-preview',
  '2026-06-11',
  'chat sidebar: last 3 + View all',
  $body$Support and DMs show three recent threads with View all to expand.

— Mark$body$,
  $detail$Keeps the chat panel tidy on phones while everything stays one tap away.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_community-reviews-layout',
  '2026-06-11',
  'your review on top, neighbors below',
  $body$Chat → Community reviews: post yours up top, everyone else's below — yours isn't duplicated.

— Mark$body$,
  $detail$YOUR REVIEW (top)
Post once, edit anytime, or remove.

FROM NEIGHBORS (below)
Everyone else's reviews — yours is not duplicated in the list.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_delete-dm-and-post-chats',
  '2026-06-11',
  'delete conversations from Chat',
  $body$Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn. Delete closed support tickets too.

— Mark$body$,
  $detail$Profile DMs: either neighbor; new message request required to chat again.
Post chats: buyer anytime; poster after listing is read-only.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_hub-removed-staff-on-account',
  '2026-06-11',
  'Hub tab gone — staff tools on Account',
  $body$Removed Hub tab. Staff/director tools live under Account now. Mobile: Stuff | Events | Map | Chat | Account.

— Mark$body$,
  $detail$STAFF & DIRECTOR
Account tab → Staff tools (directory, audit log, welcome messages, etc.)
I → site overview on Account too

NEIGHBORS
Five tabs on mobile: Stuff | Events | Map (center) | Chat | Account
News and announcements: bell (top right)
Reviews and reports: Chat

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_in-app-dialogs',
  '2026-06-11',
  'no more browser OK/Cancel boxes',
  $body$Confirmations use in-app dialogs that match the site — not generic browser popups.

— Mark$body$,
  $detail$Applies to deletes, director broadcast tests, and other sensitive actions — src/contexts/ConfirmContext.tsx, ConfirmDialog.tsx.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'new bell menu — 4 tabs',
  $body$Bell (top right): Notify (inbox), News (staff posts), Updates (changelog), Alerts (push toggles — last on purpose).

— Mark$body$,
  $detail$WHERE TO FIND IT
Any screen → top right → bell icon (next to light/dark theme).

Each tab has its own header title, subtitle, and intro so you always know what they are looking at.

TAB 1 — ANNOUNCEMENTS (mobile tab: News)
Title: Announcements
Subtitle: Staff community news — vote and comment
What it is: Posts from directors and staff. Vote and comment. Staff publish here — posting triggers push for you who enabled Alerts → Announcements.

TAB 2 — UPDATES (mobile tab: Updates)
Title: App updates
Subtitle: I changelog — what shipped and why
What it is: Technical release notes. Tap any entry to expand the full story.

TAB 3 — NOTIFICATIONS (mobile tab: Notify)
Title: Notifications
Subtitle: Your posts — comments, votes, claims, gifts, and status
What it is: Only activity on listings YOU posted and your profile — comments, upvotes, downvotes, claims, gifts, listing status, pickup reminders, account updates. Not DMs or neighborhood discover.

TAB 4 — ALERTS (mobile tab: Alerts) — last tab
Title: Push alerts
Subtitle: Turn push on, then choose messages, chat, discover, and community
What it is: Enable or turn off push on this device, master All alerts switch, messages, community chat, support, discover (new/nearby listings, requests, saved items), app-update and announcement push toggles, nearby radius, follow categories, staff/director moderation toggles.

WHY TWO PUSH TABS?
Notifications = you interacting with your posts. Alerts = general push. Tune separately. Turn push on once under Alerts (last tab) — it covers every tab.

DEEP LINKS
• /help/announcements → Announcements
• /updates → Updates
• /notifications/listings → Notifications
• /notifications → Alerts

After this update
Bell → Alerts (last tab) → Turn off alerts → Enable alerts once per device. Bell → Notifications (third tab) → review toggles → Save settings.

iPhone: Home Screen app (Add to Home Screen), not a Safari tab.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_notifications-inbox-alerts-toggles',
  '2026-06-11',
  'Notify = inbox, Alerts = toggles',
  $body$Notifications tab is your inbox of alerts received. Alerts tab (last) has every push toggle.

— Mark$body$,
  $detail$Tab order (left to right)

1. Announcements — staff news
2. Updates — changelog
3. Notifications — YOUR INBOX: comments, upvotes, downvotes, claims, claim requests, listing status on posts you made
4. Alerts (last) — ALL PUSH TOGGLES: turn device on/off, messages, chat, discover, community, AND your-post alerts (comments, votes, claims, gifts, listing status, pickup reminders, account updates)

KEY IDEA
• Notifications = what happened (read it)
• Alerts = what you want pushed to your phone (toggle it)

Refresh push on your phone
Bell → Alerts (last tab) → Turn off → Enable → Save settings.

DEEP LINKS
• /notifications → Notifications inbox
• /notifications/alerts → Alerts settings

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_post-announcement-for-push',
  '2026-06-11',
  'staff: post news from bell for push',
  $body$Staff announcements posted from Bell → News trigger push for neighbors who enabled it.

— Mark$body$,
  $detail$How to notify everyone EVERYONE ABOUT PUSH REFRESH

1. Deploy this app version
2. Run this SQL file for Updates tab entries
3. Bell → Announcements → Post announcement
4. Use title/summary about refreshing alerts under bell → Alerts tab
5. Save once — push goes to you with Announcements enabled under Alerts

Requires push-announcements webhook on help_announcements INSERT (install-push-webhooks.sql).

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'push rebuilt — refresh once per device',
  $body$Fixed webhooks, duplicate alerts, stuck prefs, shared-phone bugs. Bell → Alerts → off → on → Save. iPhone: Home Screen app.

— Mark$body$,
  $detail$What was broken
Many you only received the test push, not real activity. Causes included duplicate dispatch tags, stuck preference rows, missing webhook triggers, and device subscriptions out of sync after key changes.

What I fixed
• Item claims, support tickets, saved-listing status — column and dedup tag mismatches
• All 15 Supabase push webhooks (supabase-sql/install-push-webhooks.sql)
• Community chat — reliable dispatch after send
• I join/leave push handlers
• Logout clears this device subscription on shared phones
• Explicit Save settings button; prefs sync across tabs

If you're me and it's still broken IF STILL BROKEN
1. supabase-sql/notifications-complete.sql
2. supabase-sql/install-push-webhooks.sql
3. Vercel env: VAPID keys, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET

What you should do
Bell → Alerts → Turn off → Enable → Send test alert → Save settings if toggles changed.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_refresh-push-notifications',
  '2026-06-11',
  'please refresh your push alerts',
  $body$After the push rebuild: Bell → Alerts → turn off → enable → save settings once per phone.

— Mark$body$,
  $detail$Open the bell icon in the top right (next to the theme button) → Alerts tab (last tab) → Turn off alerts, then enable them again.

iPhone neighbors: use Sacramento Buy Nothing from your Home Screen (Add to Home Screen), not a Safari tab — background alerts need the installed app.

After refreshing, you should receive messages, claims, community chat, saved listings, and other alerts reliably. Thank you for your patience!

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_searchable-updates',
  '2026-06-11',
  'search the changelog',
  $body$Bell → Updates has a search field — find past releases by keyword.

— Mark$body$,
  $detail$Use Search updates… to find past releases quickly. Works on the public updates page too.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_support-inbox-in-messages',
  '2026-06-11',
  'support inbox in Chat',
  $body$Support tickets live in Chat with the same sidebar style as DMs.

— Mark$body$,
  $detail$Neighbors: Chat → Support — open tickets, reply, back button to inbox.
Staff: Chat → Support inbox — ticket list with last-message preview. Removed from Community hub moderation panel.
Push: Alerts tab → Support tickets. Deep links /staff/tickets and /support open Messages support.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_user-notifications-inbox-table',
  '2026-06-11',
  'inbox logs every alert',
  $body$Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements. If you'd get a push, it shows in your inbox.

— Mark$body$,
  $detail$TABLE: user_notifications
• One row per you per alert (any event type they are eligible to receive)
• Written by the server when push is dispatched (service role)
• If you would see a push alert, you also see it under bell → Notifications
• Toggle what sends push under Alerts (last tab)

SQL I ran in Supabase ONCE
supabase-sql/user-notifications.sql

After deploy, trigger any alert (message, comment, nearby listing) to see inbox rows.

— Mark$detail$,
  'Mark White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_welcome-message-account',
  '2026-06-11',
  'edit welcome messages from Account',
  $body$Director and staff public welcome notes edited from Account → Staff tools.

— Mark$body$,
  $detail$I — Public welcome message (home + reviews)
Staff — Your team message (home + reviews)
Still shown on home carousel and reviews page.

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
