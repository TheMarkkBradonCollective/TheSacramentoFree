-- =========================================================
-- REWRITE ALL APP UPDATES — Markk's voice (individual entries)
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
  $detail$What you'll notice:
Switched to email and password through Supabase — Google popups kept getting blocked.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_landing-page-before-login',
  '2026-05-19',
  'Landing page before login',
  $body$Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.$body$,
  $detail$What you'll notice:
Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
You can browse free gifts on a map OR in a scrollable feed — gives and looking-for posts.

Browse free gifts on a map or scrollable Stuff feed — giveaways giveaways and looking-for posts.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
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
Basic browsing still works if your connection hiccups for a second.

Basic browsing survives brief connection drops — cached profile/items and service worker shell.

How it works:
A lightweight offline cache keeps basic pages from instantly going blank.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Gave it reddit orange and sage green — wanted it to feel like Sacramento, not some random app.

Warm orange + sage community palette and Sacramento Buy Nothing logo — local feel, not a generic template.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
You can upload pictures when you post so people know what they're picking up.

Upload photos when posting so you know exactly what you are giving or seeking.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Site went live — free place for Sacramento neighbors to give, ask, and connect. No money.

Sacramento Buy Nothing goes live — free local gifting, no selling, no bidding, you helping you.

How it works:
100% free rule enforced in post flows and moderation.

Why I changed it:
This is the foundation — free, local, no selling. Everything else builds on that promise.$detail$,
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
When you join you pick your Sacramento area so posts stay local to your part of town.

Pick your neighborhood at onboarding so posts stay local to your part of Sacramento.

How it works:
Used for feed filters, map centering, and profile display.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_supabase-schema-file',
  '2026-05-19',
  'DatabaseSQL.txt schema file',
  $body$Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.$body$,
  $detail$What you'll notice:
Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Wrote down the rules: free gifting, local neighbors, no selling ever. That's the whole point.

Written mission: free gifting, local you, reduce waste, no money ever.

How it works:
Shown on public About and Rules pages.

Why I changed it:
This is the foundation — free, local, no selling. Everything else builds on that promise.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_where-it-all-started',
  '2026-05-19',
  'Where it all started — May 19',
  $body$This is day one. I sat down and started building Sacramento Buy Nothing — log in, post gives and asks, profiles, messaging. That's the whole idea.$body$,
  $detail$What you'll notice:
May 19, 2026 was day one — Sacramento Buy Nothing went from an idea to something you could actually open in a browser.

How it works:
Sign in, post gives and asks, set up a profile, and message neighbors. That was the whole scope on launch night — no selling, no ads, just local free gifting.

Why I built it:
I wanted a Sacramento-specific home for Buy Nothing culture instead of fighting Facebook groups or apps that eventually charge money. Everything since has been layers on top of that first version.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-19_works-on-phone-tablet-desktop',
  '2026-05-19',
  'Works on phone, tablet, desktop',
  $body$Layout adapts to whatever screen you're on — same app everywhere.$body$,
  $detail$What you'll notice:
Layout adapts to whatever screen you're on — same app everywhere.

How it works:
• The layout shifts around typical tablet and laptop screen sizes.
• Same community and same account everywhere — just laid out for your screen.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_desktop-feed-map-split',
  '2026-05-20',
  'Desktop: feed left, map right',
  $body$Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.$body$,
  $detail$What you'll notice:
Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_device-view-files',
  '2026-05-20',
  'Separate layouts per screen size',
  $body$Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.$body$,
  $detail$What you'll notice:
Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Map, feed, chat, and profile each use the whole phone screen — no tiny nested boxes.

Map, Stuff, Chat, and Profile each fill the phone — no double scroll containers.

How it works:
Foundation for modern mobile UX.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
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
Posts and accounts save online in Supabase now. Same community every time you visit.

Posts and accounts persist in Supabase — you see the same listings every visit.

How it works:
Replaced demo/local-only data store.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
You can add Sacramento Buy Nothing to your phone like an app — works offline for basic browsing.

Install Sacramento Buy Nothing like an app — icon on home screen, standalone display mode, basic offline shell.

How it works:
Beforeinstallprompt handling on Android/desktop Chrome.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Map with zoom, custom pins, and driving directions to free items.

The map library map with zoom, custom pins per listing type, and driving directions to items.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
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
Reworked phones hard while keeping the wider desktop layout you already had.

Phone experience rebuilt for touch-first use while desktop you keep the wider layout they already used.

How it works:
Parallel MobileView vs DesktopView components.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_mobile-map-category-blips',
  '2026-05-20',
  'Mobile got its own full-screen map',
  $body$Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.$body$,
  $detail$What you'll notice:
Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
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
Message whoever posted something to set up porch pickup.

Message the person giving something away to arrange porch pickup.

How it works:
TABLES — chats, messages (two-participant DMs, optional itemId context)

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_openstreetmap',
  '2026-05-20',
  'Switched to OpenStreetMap',
  $body$Map uses OpenStreetMap now — real Sacramento streets.$body$,
  $detail$What you'll notice:
Map uses OpenStreetMap now — real Sacramento streets.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-20_post-location-picker',
  '2026-05-20',
  'Pick your location when posting',
  $body$When you post you can use your current GPS location OR tap the map and drop a pin for pickup.$body$,
  $detail$What you'll notice:
When you post you can use your current GPS location OR tap the map and drop a pin for pickup.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Added early director and staff roles so we can moderate as this grows.

Staff and director roles so the growing community can be moderated fairly.

How it works:
Early foundation for StaffModerationPanel and RoleBadge.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
All posts, profiles, and messages live online — nothing stuck on one device.

Posts, profiles, chats, and votes live in Supabase — same community on every device, nothing stuck on one phone.

How it works:
MIGRATION from early local-only prototypes to cloud-backed app.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Expanded the neighborhood list — 38 Sacramento areas to pick from.

Pick from 38 Sacramento-area neighborhoods when joining or posting — better local matching.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Block someone who makes you uncomfortable. Blocking auto-reports to me.

Block a neighbor (hide their posts/chats) or send a one-way report to staff.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_bundle-multi-item-posts',
  '2026-05-29',
  'Post multiple items in one listing',
  $body$One post can list several items — people claim separately and you confirm who got what.$body$,
  $detail$What you'll notice:
One post can list several items — people claim separately and you confirm who got what.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Live counts of neighbors, posts, and gifts at the top of the feed.

Live counts of you, active posts, items given, and requests fulfilled at top of Stuff feed.

Why I changed it:
This is the foundation — free, local, no selling. Everything else builds on that promise.$detail$,
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
Welcome page shows how active the community is before you join.

Welcome page shows community activity before you join — same stats as in-app bar.

How it works:
Builds trust for new visitors.

Why I changed it:
This is the foundation — free, local, no selling. Everything else builds on that promise.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_contactless-self-claim',
  '2026-05-29',
  'Contactless self-claim at pickup',
  $body$At your pickup spot you can claim themselves and pick which items they took — you confirm.$body$,
  $detail$What you'll notice:
At your pickup spot you can claim themselves and pick which items they took — you confirm.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_director-role-management',
  '2026-05-29',
  'I can assign staff roles',
  $body$I can give people moderator/admin/city manager roles from their profile.$body$,
  $detail$What you'll notice:
I can assign staff roles from a neighbor's profile — moderator, city administrator, city manager, and so on.

For staff:
Each role has a seat limit so the team stays small and accountable. You'll see role badges on profiles so you know who helps run the community.

Why I changed it:
One person cannot watch every report and ticket as Sacramento grows. Trusted neighbors need tools without handing everyone the keys.$detail$,
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
Update a listing anytime before it's claimed.

Edit your listing title, description, photos, and category before it is claimed.

How it works:
Saved-item bookmarkers can get push on owner edits (if enabled).

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Images load quicker and upload smoother when you post.

Listing photos load faster and upload more smoothly when posting.

How it works:
ListingImage component with lazy-friendly loading.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
New cards, cleaner nav, dark/light themes, polished look throughout.

Modern cards, cleaner navigation, light/dark themes, consistent buttons and inputs across the app.

How it works:
Mobile/tablet/desktop shells share the same visual language.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_full-screen-mobile-chat-profile',
  '2026-05-29',
  'Full-screen chat & profile on mobile',
  $body$Chat and account use the full phone screen like map and feed.$body$,
  $detail$What you'll notice:
Chat and account use the full phone screen like map and feed.

How it works:
ChatSystem fullBleed mode.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
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
Report bugs, open tickets, reach staff — all in one place.

Dedicated Community hub tab for reports, app updates, announcements, and reviews (support tickets now under Chat).

How it works:
Staff moderation panel on same tab for staff roles.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Give generously and it helps when you post something you're looking for.

When someone helps fulfill your ISO request, they get “items given” credit and you get “items claimed” credit.

How it works:
CLAIM TYPE — request_fulfilled in item_claims.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Tap any listing for photos, comments, votes, and claim options.

Tap any post for full photos, description, comments, votes, bookmark, and claim/message actions.

How it works:
Opened from ItemGrid, map popups, profile listings.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
New posts, chats, votes, and ticket replies show up without refreshing.

New posts, chat messages, votes, ticket replies, and events appear without manual refresh.

How it works:
USED BY — useItemsRealtime, ChatSystem, useEventsEngagement, usePushNotifications, etc.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Little legend on the map explains what each pin color means.

Legend on the map explains pin colors for giveaways, looking-for posts, labor, pending pickup, etc.

How it works:
Category → color mapping in map marker renderer.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_map-opens-first',
  '2026-05-29',
  'Map opens first',
  $body$Default tab is the map so you see gifts near you right away.$body$,
  $detail$What you'll notice:
Default tab is the map so you see gifts near you right away.

WHAT NEIGHBORS SEE Default tab after sign-in is the neighborhood map so you see gifts near you immediately.

DEFAULT TAB — App.tsx initial tab 'map' (localStorage sbn_active_tab_v1)

SacramentoMapView.tsx with category-colored pins.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
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
New chats start as a request. You accept or decline before talking.

Cold DMs from profiles start as a request — accept or decline before chatting. Listing messages skip the gate.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
View profiles and see neighbor photos.

Tap avatars to open neighbor profiles with photo, neighborhood, bio, and listings.

How it works:
Linked from ItemCard, ChatSystem, map pins, comments.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_pick-up-several-items-at-once',
  '2026-05-29',
  'Claim multiple items one trip',
  $body$Grab several things from the same neighbor in one pickup when they're giving away a bunch.$body$,
  $detail$What you'll notice:
Grab several things from the same neighbor in one pickup when they're giving away a bunch.

Multi-item giveaways: claim specific subitems or several things in one trip.

How it works:
TABLES — listing_subitems, item_claims, item_claim_requests.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Top bar and bottom tabs stay put while you scroll on phones.

Top header and bottom tab bar stay fixed while scrolling on phones.

How it works:
Safe-area insets for notched iPhones.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_post-from-the-feed',
  '2026-05-29',
  'Post button on the feed',
  $body$Post button on the feed on every screen size — not just the map.$body$,
  $detail$What you'll notice:
Post button on the feed on every screen size — not just the map.

How it works:
FAB / header buttons in MobileView, DesktopView.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
About, How It Works, Rules, Areas — browse before you sign up.

Public pages before sign-in: Home, About, How It Works, Rules, Areas, Community, Updates, Reviews, GoFundMe.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Directions use actual streets now, not straight lines across the map.

Directions to free gifts use real streets (OSRM) instead of straight lines.

How it works:
Falls back to Haversine line if routing API unavailable.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_request-to-dm',
  '2026-05-29',
  'Request to DM outside item chats',
  $body$You can request to DM other users directly — aside from listing chats.$body$,
  $detail$What you'll notice:
You can request to DM other users directly — aside from listing chats.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Director and staff badges show on profiles so you know who runs things.

Director and staff roles show on profiles and messages so you know who helps run the app.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
Send your porch or meetup location privately when arranging pickup.

Listing owner can send porch/meetup address privately in the coordination chat.

How it works:
Respects showExactLocation privacy flag on items.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-05-29_staff-moderation-tools',
  '2026-05-29',
  'Staff moderation tools',
  $body$Staff can review reports, manage accounts, and keep the space safe.$body$,
  $detail$What you'll notice:
Staff can review reports, manage accounts, and keep the space safe.

For staff:
Review reports, manage support tickets, view directory, suspend/ban, audit log.

How it works:
TABLES — user_reports, support_tickets, moderation_audit_log.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
Stay signed in after refresh and posts load reliably once you're in.

Stay signed in after refresh; listings load reliably once logged in.

How it works:
CACHE — readCachedProfile/readCachedItems for faster first paint.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Snap a screenshot or photo when you report a problem so I can see what you see.

Attach a photo when opening a support ticket so staff can see what you see.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Your back button moves between tabs the way you'd expect.

Android back button and browser back move between app tabs as expected.

How it works:
ParseTabFromHistoryState on popstate.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
See who helps run the community and what role they have.

See who helps run Sacramento Buy Nothing and their role (moderator, administrator, city manager, director).

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
Easier to see what's available, on hold, or already claimed.

Clearer buttons and labels for available, on hold, pending pickup, and claimed states on listings and in chat.

How it works:
STATUSES — active | on_hold | pending_pickup | completed | withdrawn.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Home page has some motion so it doesn't feel dead before you sign in.

Scroll-driven motion on the welcome page — depth layers move at different speeds as you scroll.

How it works:
Respects reduced-motion where possible via CSS.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
You can remove your account and data if you want out.

Remove your account and community data when you no longer want to participate.

How to use it:
• Account → scroll to Delete account → confirm. This removes your profile and posts from the community.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Guests can see real posts on the home page without signing up first.

Guests browse real active listings on the public home page without creating an account first.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-02_staff-safety-tools',
  '2026-06-02',
  'Staff safety tools',
  $body$Leaders can remove comments, delete accounts, and purge data when we have to.$body$,
  $detail$What you'll notice:
Leaders can remove comments, delete accounts, and purge data when we have to.

How it works:
AUDIT — moderation_audit_log table tracks actions.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
Listing photos open big so you can see details before you message someone.

Tap listing photos to open a full-screen lightbox before messaging the giver.

How it works:
Escape or backdrop tap closes overlay.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Bookmark posts to check later. New Labor section for free community help and skills.

Bookmark listings to check later. New Labor categories for community help/skills. Added Old Foothill Farms to neighborhood list.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Fixed layout quirks on phones before you sign in.

Guest home page layout fixed on phones — less horizontal scroll, better spacing before sign-in.

How it works:
Touch-friendly sections and stats bar alignment on narrow screens.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
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
I wrote why this exists — free forever, no ads, I don't sell your info.

Director welcome message on home and reviews — free forever, no ads, your data is not sold.

How it works:
Director can edit from Community hub when signed in as director.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
Every switch in push settings actually delivers — messages, claims, discover, staff inbox, pickup reminders, all of it.

Every switch in Account → Push notifications should deliver when enabled — messages, claims, discover, staff inbox, pickup reminders, listing status, support, announcements, and more.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_app-updates-vs-announcements-notifications',
  '2026-06-09',
  'Separate toggles: my updates vs staff news',
  $body$Notification settings split App updates (my changelog) and Announcements (staff posts).$body$,
  $detail$What you'll notice:
Notification settings split App updates (my changelog) and Announcements (staff posts).

Why we split them:
App updates = director changelog in director changelog entries (technical “what shipped”). Announcements = staff community news in staff announcements (Help board with votes/comments). They must not share one push preference.

How it works:
Account updates → accountUpdates (suspensions, bans, role changes — unchanged)

Database setup:
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS "appUpdates" BOOLEAN DEFAULT true;.

How to use it:
• Bell → News → tap a post to expand, vote, and comment.
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Filters and sorting in one "Filters & sort" panel so the feed isn't a mess.

Filters and sorting moved into one “Filters & sort” panel so the Stuff feed stays easy to scroll.

How it works:
Single panel: type (give/look), category, neighborhood, status, vote/comment filters, sort order.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Get pinged when someone comments on your listing or when a bookmarked post changes.

Listing owners get a push when someone comments on their post. You who bookmark a listing get alerts when that post is edited, commented on, claimed, or changes status (active → pending pickup → completed).

How it works:
• Your listings → Comments
• Saved items → edits, comments, claims, status changes

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_director-oversight-alerts',
  '2026-06-09',
  'Director oversight alerts for me',
  $body$I get optional push for joins, reports, moderation, tickets, listings, message requests, claims — each toggleable.$body$,
  $detail$What you'll notice:
I get optional push for joins, reports, moderation, tickets, listings, message requests, claims — each toggleable.

What neighbors see (directors):
Eight optional oversight categories in push settings: joins, departures, moderation, reports, tickets, listings, message requests, claim requests.

How it works:
Each category has its own toggle — turn off noise you do not need.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Moderators and admins write their own message for home and reviews — not one shared blurb.

Each staff member publishes their own welcome note on home and reviews — not one shared city-manager message.

How it works:
PK userId — one row per staff member.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_every-alert-like-new-listings',
  '2026-06-09',
  'Every alert type wired up',
  $body$Messages, comments, votes, pickup reminders, account notices — same pipeline as new listing alerts.$body$,
  $detail$What you'll notice:
Messages, comments, votes, pickup reminders, account notices — same pipeline as new listing alerts.

How it works:
• item_claim_requests, item_claims, item_comments, item_votes
• moderation_audit_log → account_update pushes
• director changelog entries / staff announcements → changelog vs staff announcements
• support_ticket_messages, user_reports, director changelog entries

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Renamed the listings tab to Stuff — same free gifts and requests, less weird name.

The main listings tab label changed from “Feed” to “Stuff” — same free gifts and looking-for posts, friendlier name.

How it works:
• IN_APP.feedTabLabel = 'Stuff'
• IN_APP.feedTitle = 'Community Stuff'

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Tightened dedup so the same ping doesn't land twice.

The same event should not ping your phone twice when both the open app and the server tried to send at once.

How it works:
ClaimPushDispatch(tag) inserts into push_dispatch_log with UNIQUE(tag) and ~90s window.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
I ship fast and sometimes break my own stuff — thanks for the screenshots and support tickets. This patch is me cleaning up so real porch pickups and chats are not blocked by a UI bug.

If something still looks off:
If your phone's still quiet: Bell → Alerts → turn everything off → Save → flip back on → Save again. iPhone folks need the Home Screen app, not Safari.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_free-community-events',
  '2026-06-09',
  'Free community events',
  $body$Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.$body$,
  $detail$What you'll notice:
Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.

How it works:
CHECK constraint isFree = true.

Why I changed it:
This is the foundation — free, local, no selling. Everything else builds on that promise.

More context:
I write these entries for neighbors using the app — not as developer patch notes. Tap any update to read the full story, vote if it helped, and comment if something needs clarification.$detail$,
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
Removed the GoFundMe strip from under the map tab. Still at the bottom elsewhere — tap for full page.

GoFundMe strip removed from under the map. On other scrollable pages it sits at the bottom; tap for full cost breakdown.

Why I changed it:
Hosting, database, and push cost real money. I will never charge neighbors or run ads — the GoFundMe page is optional transparency about what it takes to keep this alive.$detail$,
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
Full cost breakdown on a dedicated page. Short support link at the bottom of other screens.

Full hosting cost breakdown on a dedicated page; every other screen shows a short optional support link at the bottom.

How it works:
Explains Vercel, Supabase, domain, and why the app stays free with no ads.

Why I changed it:
Hosting, database, and push cost real money. I will never charge neighbors or run ads — the GoFundMe page is optional transparency about what it takes to keep this alive.$detail$,
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
Optional push when someone votes on your listings — each has its own toggle.

Optional push when you upvote or downvote your listings — each direction has its own toggle.

How it works:
TOGGLES — Account → Push notifications → Your listings → Upvotes / Downvotes.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Signing out removes this phone's push subscription so the next account doesn't get your alerts.

After logout, notification toggles reset in the UI until the next account loads its saved preferences from the database. The device is no longer registered to receive pushes for the signed-out account.

What stays in the database:
Per-account notification_preferences remain saved (toggles you tapped Save settings for). Only device push subscription rows and local session state are cleared.

How it works:
1) detachPushSubscriptionForUser(uid) — removes push_subscriptions row for this endpoint and calls subscription.unsubscribe() in the browser.

2) Clears celebration localStorage key sbn_push_celebration_prompt_dismissed_v1.

3) Broadcasts NOTIFICATION_SESSION_CLEARED_EVENT so usePushNotifications resets to CLEARED_NOTIFICATION_PREFERENCES in memory.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Filter by give vs looking, category, neighborhood, status, votes, comments. Sort newest, oldest, most active.

Filter by giving vs looking, category, neighborhood, status, votes, comments. Sort by newest, oldest, or most active.

How it works:
Helps find active looking-for posts or popular giveaways quickly.

How to use it:
• Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_no-more-double-pings',
  '2026-06-09',
  'No more double pings',
  $body$Same alert was firing twice — fixed that. Drove me nuts too.$body$,
  $detail$What you'll notice:
Same alert was firing twice — fixed that. Drove me nuts too.

What actually fixed it:
• Re-enabled client dispatch WITH dedup:
• Bad tags fixed: msg-{chatId} → msg-{messageId}, static community-announcement → announcement-{id}

Removed unauthenticated resubscribe that reassigned endpoints to wrong users.

How it works:
• PHASE 2 FIX (current)
• Bad tags fixed: msg-{chatId} → msg-{messageId}, static community-announcement → announcement-{id}

Why I changed it:
I ship fast and sometimes break my own stuff — thanks for the screenshots and support tickets. This patch is me cleaning up so real porch pickups and chats are not blocked by a UI bug.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_notification-settings-save-button',
  '2026-06-09',
  'Save button on notification settings',
  $body$Flip toggles, review, then tap Save settings — they don't auto-save on every tap anymore.$body$,
  $detail$What you'll notice:
Flip toggles, review, then tap Save settings — they don't auto-save on every tap anymore.

SUMMARY FOR NEIGHBORS.

Your notification choices are stored per account in Supabase, not silently in the browser. Flip toggles, review them, then tap Save settings. Discard reverts to last saved state.

• hasUnsavedChanges banner with Save settings + Discard buttons. • setDraftPreferences() updates local React state only until save.

Preferences vs savedPreferences state, preferencesEqual(), hasUnsavedRef prevents realtime reload from overwriting unsaved edits.

LOGOUT BEHAVIOR.

ClearNotificationDataOnLogout clears device push + in-memory UI; DB prefs for the account remain for next login.

WHY NOT AUTOSAVE.

Prevents accidental toggles and matches “prefs per account, push per device” model documented in Help copy.

Summary for neighbors:
Your notification choices are stored per account in Supabase, not silently in the browser. Flip toggles, review them, then tap Save settings. Discard reverts to last saved state.

How it works:
• hasUnsavedChanges banner with Save settings + Discard buttons.
• setDraftPreferences() updates local React state only until save.

Logout behavior:
ClearNotificationDataOnLogout clears device push + in-memory UI; DB prefs for the account remain for next login.

Why not autosave:
Prevents accidental toggles and matches “prefs per account, push per device” model documented in Help copy.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-09_notifications-right-account',
  '2026-06-09',
  'Alerts go to the right account',
  $body$Fixed push landing on the wrong person on shared phones. Toggle off then on once while signed in as you.$body$,
  $detail$What you'll notice:
Fixed push landing on the wrong person on shared phones. Toggle off then on once while signed in as you.

How it works:
PROBLEM.

Shared devices: browser push endpoint stayed registered to previous user’s row in push_subscriptions.

After deploy:
Each neighbor: notifications off → on once while signed in as themselves.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Notifications reach your phone when the app isn't open. iPhone: Add to Home Screen.

Notifications reach your phone when Sacramento Buy Nothing is closed — not only while the tab is open.

How it works:
• STACK
• public/service-worker.js — push event + notificationclick → deep link

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Optional alerts for messages, claims, and activity. Turn on/off in Account.

Optional browser push for messages, claims, new listings, comments, and more — controlled per account in settings.

How it works:
Enable in Account → Push notifications. iPhone: Add to Home Screen for background delivery.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Messages, listings, comments, and other alerts deliver again. Only the test button had been working for a lot of people. Turn notifications off and on once per device.

After this deploy, alerts for real activity (new messages, listing changes, comments, votes, support replies, etc.) should reach your device again — not only the “Send test notification” button in Account → Push notifications.

How it works:
Export const CLIENT_PUSH_DISPATCH_ENABLED = true;.

What to do:
On each device: Help or Account → Push notifications → turn off, then on again once. Tap Save settings if you changed toggles. Confirm test push still works, then trigger a real event (have someone message you).

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Bookmarks save to your account so alerts work when the app is closed.

Saving a listing now stores the bookmark in your account online — not only on this phone — so the server can alert you when that post changes.

How it works:
• BEFORE
• localStorage key sbn_saved_items_v1 only — server could not notify when app was closed.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Tap multiple quick picks at once — Trending, Saved, My area, With photos, Needs pickup.

Tap multiple quick filters at once — Trending, Saved, My area, With photos, Needs pickup.

How it works:
Trending = recent activity; Saved = useSavedItems hook; My area = your neighborhood; etc.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Fixed white screens and "Something went wrong" right after login.

Signing in should land you on the feed without a blank page or error boundary. Opening Help → notification-related panels should no longer crash the whole app.

How it works:
1) Duplicate Supabase Realtime channels.

How to check it's working:
Sign in on phone and desktop, open Help, expand notification settings, switch accounts — app should remain interactive.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Help has a separate Announcements board — staff post news, you vote and comment. Not the same as my changelog.

Help & support → Announcements. Tap a post to expand it, upvote/downvote, and join the discussion in comments. This is separate from App updates (director changelog).

How it works:
DATABASE (run in Supabase SQL Editor)

How to use it:
• Bell → News → tap a post to expand, vote, and comment.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
Leave a rating — one per person, edit anytime.

Leave a 0.5–5 star rating and optional text. One review per neighbor; edit anytime.

How it works:
VOTES — community_content_votes targetType 'review'

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
GoFundMe link explains what it costs to run this — and why I'll never charge you or show ads.

Optional GoFundMe link explains real monthly costs — app stays 100% free, no ads, no selling data.

How it works:
Never required to participate in the community.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Send yourself a test alert from Account → Push notifications after you subscribe.

After enabling push, tap “Send test notification” in Account → Push notifications to confirm this device receives alerts.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
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
Changelog lives in the database — I post, edit, delete from the app instead of buried code.

How it works:
Columns: id, date, title, body, detail, directorName, postedByUserId.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Changelog and neighbor reviews under Community in the menu.

Public Updates and Reviews pages for guests and you — changelog oldest→newest, star reviews, director note.

How it works:
IN-APP — Community hub tiles mirror same data via UpdatesList and CommunityReviews.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Upvote or downvote changelog entries, reviews, and staff messages. I see the feedback.

How it works:
Used in UpdatesList, CommunityReviews, StaffMessage, DirectorMessage.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
If someone removes a listing it doesn't clutter the feed anymore.

When a neighbor withdraws a listing, it disappears from the community feed and map.

How it works:
• QUERIES — getSupabaseItems filters active statuses for feed/map
• Owner can still see withdrawn posts in profile history where applicable.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-10_chat-gofundme-scroll-support-back',
  '2026-06-10',
  'GoFundMe scrolls in chat + support back button',
  $body$GoFundMe strip scrolls at bottom of chat instead of pinned on screen. Support tickets have a back button.$body$,
  $detail$What you'll notice:
GoFundMe strip scrolls at bottom of chat instead of pinned on screen. Support tickets have a back button.

On mobile, open Chat and scroll the conversation list — the optional GoFundMe support strip is at the bottom of the scrollable content, not stuck under the messenger window. Same idea on support ticket lists.

Open Chat → Support → My support tickets. Tap ← to return to the chat inbox. Inside a ticket thread, ← goes back to your ticket list.

CODE.

Deploy only — no new SQL tables.

Chat → gofundme:
On mobile, open Chat and scroll the conversation list — the optional GoFundMe support strip is at the bottom of the scrollable content, not stuck under the messenger window. Same idea on support ticket lists.

Chat → support → back:
Open Chat → Support → My support tickets. Tap ← to return to the chat inbox. Inside a ticket thread, ← goes back to your ticket list.

How it works:
Deploy only — no new SQL tables.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
Hosting, database, and push cost real money. I will never charge neighbors or run ads — the GoFundMe page is optional transparency about what it takes to keep this alive.$detail$,
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
New messages in Community chat and Staff chat send push — each has its own toggle.

When someone posts in Chat → Community chat, you who enabled Community chat notifications get a push alert. Tap it to open the channel.

For staff:
Staff who enabled Staff chat under Notification settings → Staff moderation get alerts for new messages in the staff-only lounge.

Notification settings:
• Messages & support → Community chat (all you)
• Staff moderation → Staff chat (staff only)

How it works:
• Dedup tags: community-msg-{messageId} and staff-msg-{messageId}
• Deep links: /messages/community-global and /messages/community-staff

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-10_community-staff-chat-support-moved',
  '2026-06-10',
  'Community chat + support moved to Chat tab',
  $body$Chat now has community-wide channel, staff lounge, and support tickets. Help renamed Community hub.$body$,
  $detail$What you'll notice:
Chat now has community-wide channel, staff lounge, and support tickets. Help renamed Community hub.

• Community chat — all you (global channel) • Staff chat — staff only (hidden from you) • Support — personal tickets with staff (moved out of Community hub) • Direct messages — unchanged 1:1 listing/profile chats.

• COMMUNITY HUB (was Help) • App updates, announcements, reviews, and safety reports. Tab label is now Community.

CODE.

Chat tab:
• Community chat — all you (global channel)
• Staff chat — staff only (hidden from you)
• Support — personal tickets with staff (moved out of Community hub)
• Direct messages — unchanged 1:1 listing/profile chats

How it works:
• COMMUNITY HUB (was Help)
• App updates, announcements, reviews, and safety reports. Tab label is now Community.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
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
Every changelog entry can expand with the full write-up when you tap it.

Community hub → App updates → tap an entry. The short summary is still one or two sentences; expand to read the full story (what changed, which files, SQL to run).

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
Fixed staff announcements appearing twice right after posting.

When staff post an announcement under Community hub → Announcements, you should see one card per post — not two identical entries right after publishing.

What was broken:
After posting, the app both (a) added the new row to the screen immediately and (b) refreshed from Supabase realtime a moment later. If realtime finished first, the immediate add ran again and duplicated the same announcement id in the list.

How to use it:
• Bell → News → tap a post to expand, vote, and comment.

Why I changed it:
I ship fast and sometimes break my own stuff — thanks for the screenshots and support tickets. This patch is me cleaning up so real porch pickups and chats are not blocked by a UI bug.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_bell-tab-order-notifications-before-alerts',
  '2026-06-11',
  'Bell tab order: Notify before Alerts',
  $body$Reorder: Notify → News → Updates → Alerts last so you find your inbox before settings.$body$,
  $detail$What you'll notice:
Reorder: Notify → News → Updates → Alerts last so you find your inbox before settings.

How it works:
See 2026-06-11_notifications-inbox-alerts-toggles for full explanation.

How to use it:
• Tap the bell (top right). Notify = inbox of alerts you received. News = staff posts. Updates = this changelog. Alerts = every push toggle — last tab on purpose.
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_block-self-votes',
  '2026-06-11',
  'Can''t vote on your own stuff',
  $body$Upvotes/downvotes disabled on your own listings, reviews, updates, news, and messages.$body$,
  $detail$What you'll notice:
Upvotes/downvotes disabled on your own listings, reviews, updates, news, and messages.

• Applies everywhere you can vote:
• Your listings
• Your review
• Your announcements or changelog entries
• Director and staff messages you authored

How it works:
• Your listings
• Your review
• Your announcements or changelog entries
• Director and staff messages you authored

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_center-map-nav',
  '2026-06-11',
  'Map is the big center button',
  $body$On phones, Map is the round center button in the bottom nav.$body$,
  $detail$What you'll notice:
On phones, Map is the round center button in the bottom nav.

• Bottom nav: Stuff | Events | Map (circle) | Chat | Account • Tap the center circle to open the neighborhood map.

How it works:
• Bottom nav: Stuff | Events | Map (circle) | Chat | Account
• Tap the center circle to open the neighborhood map.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-empty-states',
  '2026-06-11',
  'Chat empty states match',
  $body$Support, DMs, and reviews use the same empty layout when there's nothing yet.$body$,
  $detail$What you'll notice:
Support, DMs, and reviews use the same empty layout when there's nothing yet.

How it works:
Consistent icon, title, and description — sidebar and full inbox match.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-message-deletion',
  '2026-06-11',
  'Delete your chat messages',
  $body$Delete messages you sent. I/city managers can remove community channel messages.$body$,
  $detail$What you'll notice:
Delete messages you sent. I/city managers can remove community channel messages.

Use delete on your own messages in DMs, community chat, staff chat, and support threads. Director and city manager can delete any message in community-global.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-reviews-reports',
  '2026-06-11',
  'Reviews & reports moved to Chat',
  $body$Community reviews, Send a report, and (staff) User reports — last section in Chat sidebar.$body$,
  $detail$What you'll notice:
Community reviews, Send a report, and (staff) User reports — last section in Chat sidebar.

• Direct messages • Group chats (All you, Staff lounge) • Support • Reviews & reports.

• REVIEWS & REPORTS • Community reviews — read and post yours • Send a report — one-way to staff • User reports — staff only.

Group chats replaced the old "Community" label. Public channel is now All you.

How it works:
• Direct messages
• Group chats (All you, Staff lounge)
• Support
• Reviews & reports

Reviews & reports:
• Community reviews — read and post yours
• Send a report — one-way to staff
• User reports — staff only

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-sidebar-actions',
  '2026-06-11',
  'Start conversation + new support rows',
  $body$Quick rows to start a DM or open a new support chat — same style as Send a report.$body$,
  $detail$What you'll notice:
Quick rows to start a DM or open a new support chat — same style as Send a report.

• QUICK ACTIONS (same row style as Send a report) • Start conversation — opens Stuff to message from a listing • Open new support chat — private thread with staff.

• SIDEBAR ORDER • 1. Direct messages • 2. Group chats • 3. Support • 4. Reviews & reports.

How it works:
• QUICK ACTIONS (same row style as Send a report)
• Start conversation — opens Stuff to message from a listing
• Open new support chat — private thread with staff

Sidebar order:
• 1. Direct messages
• 2. Group chats
• 3. Support
• 4. Reviews & reports

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_chat-sidebar-preview',
  '2026-06-11',
  'Chat sidebar: last 3 + View all',
  $body$Support and DMs show three recent threads with View all to expand.$body$,
  $detail$What you'll notice:
Support and DMs show three recent threads with View all to expand.

How it works:
Keeps the chat panel tidy on phones while everything stays one tap away.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_community-reviews-layout',
  '2026-06-11',
  'Your review on top, neighbors below',
  $body$Chat → Community reviews: post yours up top, everyone else's below — yours isn't duplicated.$body$,
  $detail$What you'll notice:
Chat → Community reviews: post yours up top, everyone else's below — yours isn't duplicated.

How it works:
• FROM NEIGHBORS (below)
• Everyone else's reviews — yours is not duplicated in the list.

Why I changed it:
This is the foundation — free, local, no selling. Everything else builds on that promise.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_delete-dm-and-post-chats',
  '2026-06-11',
  'Delete conversations from Chat',
  $body$Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn. Delete closed support tickets too.$body$,
  $detail$What you'll notice:
Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn. Delete closed support tickets too.

How it works:
Profile DMs: either neighbor; new message request required to chat again.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_hub-removed-staff-on-account',
  '2026-06-11',
  'Hub tab gone — staff tools on Account',
  $body$Removed Hub tab. Staff/director tools live under Account now. Mobile: Stuff | Events | Map | Chat | Account.$body$,
  $detail$What you'll notice:
Removed Hub tab. Staff/director tools live under Account now. Mobile: Stuff | Events | Map | Chat | Account.

• STAFF & DIRECTOR • Account tab → Staff tools (directory, audit log, welcome messages, etc.) • Director → site overview on Account too.

• NEIGHBORS • Five tabs on mobile: Stuff | Events | Map (center) | Chat | Account • News and announcements: bell (top right) • Reviews and reports: Chat.

Staff & director:
• Account tab → Staff tools (directory, audit log, welcome messages, etc.)
• Director → site overview on Account too

How it works:
• NEIGHBORS
• Five tabs on mobile: Stuff | Events | Map (center) | Chat | Account
• News and announcements: bell (top right)
• Reviews and reports: Chat

How to use it:
• Tap the bell (top right). Notify = inbox of alerts you received. News = staff posts. Updates = this changelog. Alerts = every push toggle — last tab on purpose.

Why I changed it:
As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_in-app-dialogs',
  '2026-06-11',
  'No more browser OK/Cancel boxes',
  $body$Confirmations use in-app dialogs that match the site — not generic browser popups.$body$,
  $detail$What you'll notice:
Confirmations use in-app dialogs that match the site — not generic browser popups.

Applies to deletes, director broadcast tests, and other sensitive actions — src/contexts/ConfirmContext.tsx, ConfirmDialog.tsx.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'New bell menu — 4 tabs',
  $body$Bell (top right): Notify (inbox), News (staff posts), Updates (changelog), Alerts (push toggles — last on purpose).$body$,
  $detail$What you'll notice:
The bell (top right, next to theme) is now a small hub with four tabs. Each tab has its own title and intro so you always know what you're looking at.

The four tabs:
• Notify — inbox of alerts about YOUR posts and profile (comments, votes, claims, gifts, status changes)
• News — staff announcements; vote and comment
• Updates — this director changelog
• Alerts — last on purpose; turn push on here and choose every category

Why Notify and Alerts are separate:
Notify is what already happened to your listings. Alerts is what you want your phone to ping you about going forward — messages, discover, community chat, staff news, pickup reminders, and more.

What to do after updating:
Bell → Alerts → turn off → turn back on → Save once per phone. iPhone neighbors need the Home Screen app, not Safari.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_notifications-inbox-alerts-toggles',
  '2026-06-11',
  'Notify = inbox, Alerts = toggles',
  $body$Notifications tab is your inbox of alerts received. Alerts tab (last) has every push toggle.$body$,
  $detail$What you'll notice:
Notifications tab is your inbox of alerts received. Alerts tab (last) has every push toggle.

TAB ORDER (left to right)

1. Announcements — staff news.

2. Updates — changelog.

3. Notifications — YOUR INBOX: comments, upvotes, downvotes, claims, claim requests, listing status on posts you made.

4. Alerts (last) — ALL PUSH TOGGLES: turn device on/off, messages, chat, discover, community, AND your-post alerts (comments, votes, claims, gifts, listing status, pickup reminders, account updates)

• KEY IDEA • Notifications = what happened (read it) • Alerts = what you want pushed to your phone (toggle it)

• DEEP LINKS • /notifications → Notifications inbox • /notifications/alerts → Alerts settings.

How it works:
TAB ORDER (left to right)

Key idea:
• Notifications = what happened (read it)
• Alerts = what you want pushed to your phone (toggle it)

Deep links:
• /notifications → Notifications inbox
• /notifications/alerts → Alerts settings

How to use it:
• Bell → Notify lists what already pinged you — messages, comments on your posts, claims, nearby listings, and more.
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_post-announcement-for-push',
  '2026-06-11',
  'Staff: post news from bell for push',
  $body$Staff announcements posted from Bell → News trigger push for neighbors who enabled it.$body$,
  $detail$What you'll notice:
Staff announcements posted from Bell → News trigger push for neighbors who enabled it.

HOW TO NOTIFY EVERYONE ABOUT PUSH REFRESH.

• 1. Deploy this app version • 2. Run this SQL file for Updates tab entries • 3. Bell → Announcements → Post announcement • 4. Use title/summary about refreshing alerts under bell → Alerts tab • 5. Save once — push goes to you with Announcements enabled under Alerts.

How it works:
• 1. Deploy this app version
• 2. Run this SQL file for Updates tab entries
• 3. Bell → Announcements → Post announcement
• 4. Use title/summary about refreshing alerts under bell → Alerts tab
• 5. Save once — push goes to you with Announcements enabled under Alerts

How to use it:
• Bell → News → tap a post to expand, vote, and comment.
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'Push rebuilt — refresh once per device',
  $body$Fixed webhooks, duplicate alerts, stuck prefs, shared-phone bugs. Bell → Alerts → off → on → Save. iPhone: Home Screen app.$body$,
  $detail$What you'll notice:
Real alerts should reach your phone again — messages, claims, comments, nearby listings — not just the test button.

What was broken:
Webhooks, duplicate filtering, and device prefs were out of sync. Some phones only ever got test pushes. Shared devices could cross wires between accounts.

What to do:
Bell → Alerts → turn everything off → Save → flip back on → Save again (once per phone). iPhone neighbors: use the Home Screen app, not a Safari tab.

Why I rebuilt it:
Push is how you hear about a free couch before someone else grabs it. Broken alerts make the whole app feel dead.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_refresh-push-notifications',
  '2026-06-11',
  'Please refresh your push alerts',
  $body$After the push rebuild: Bell → Alerts → turn off → enable → save settings once per phone.$body$,
  $detail$What you'll notice:
After the push rebuild: Bell → Alerts → turn off → enable → save settings once per phone.

Open the bell icon in the top right (next to the theme button) → Alerts tab (last tab) → Turn off alerts, then enable them again.

IPhone you: use Sacramento Buy Nothing from your Home Screen (Add to Home Screen), not a Safari tab — background alerts need the installed app.

After refreshing, you should receive messages, claims, community chat, saved listings, and other alerts reliably. Thank you for your patience!

How it works:
Open the bell icon in the top right (next to the theme button) → Alerts tab (last tab) → Turn off alerts, then enable them again.

How to use it:
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.

If something still looks off:
If your phone's still quiet: Bell → Alerts → turn everything off → Save → flip back on → Save again. iPhone folks need the Home Screen app, not Safari.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_searchable-updates',
  '2026-06-11',
  'Search the changelog',
  $body$Bell → Updates has a search field — find past releases by keyword.$body$,
  $detail$What you'll notice:
Bell → Updates has a search field — find past releases by keyword.

How it works:
Use Search updates… to find past releases quickly. Works on the public updates page too.

How to use it:
• Bell → Updates → use the search box to find an old release by keyword.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_support-inbox-in-messages',
  '2026-06-11',
  'Support inbox in Chat',
  $body$Support tickets live in Chat with the same sidebar style as DMs.$body$,
  $detail$What you'll notice:
Support tickets live in Chat with the same sidebar style as DMs.

You: Chat → Support — open tickets, reply, back button to inbox.

Staff: Chat → Support inbox — ticket list with last-message preview. Removed from Community hub moderation panel.

Push: Alerts tab → Support tickets. Deep links /staff/tickets and /support open Messages support.

How it works:
You: Chat → Support — open tickets, reply, back button to inbox.

Staff: Chat → Support inbox — ticket list with last-message preview. Removed from Community hub moderation panel.

Push: Alerts tab → Support tickets. Deep links /staff/tickets and /support open Messages support.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_user-notifications-inbox-table',
  '2026-06-11',
  'Inbox logs every alert',
  $body$Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements. If you'd get a push, it shows in your inbox.$body$,
  $detail$What you'll notice:
Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements. If you'd get a push, it shows in your inbox.

• TABLE: user_notifications • One row per neighbor per alert (any event type they are eligible to receive) • Written by the server when push is dispatched (service role) • If you would see a push alert, you also see it under bell → Notifications • Toggle what sends push under Alerts (last tab)

After deploy, trigger any alert (message, comment, nearby listing) to see inbox rows.

How it works:
• TABLE: user_notifications
• One row per neighbor per alert (any event type they are eligible to receive)
• Written by the server when push is dispatched (service role)
• If you would see a push alert, you also see it under bell → Notifications
• Toggle what sends push under Alerts (last tab)

How to use it:
• Bell → Notify lists what already pinged you — messages, comments on your posts, claims, nearby listings, and more.
• Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.

Why I changed it:
Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, got doubles, or shared phones crossed wires. You control every category under Bell → Alerts.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-11_welcome-message-account',
  '2026-06-11',
  'Edit welcome messages from Account',
  $body$Director and staff public welcome notes edited from Account → Staff tools.$body$,
  $detail$What you'll notice:
Director and staff public welcome notes edited from Account → Staff tools.

• Director — Public welcome message (home + reviews) • Staff — Your team message (home + reviews) • Still shown on home carousel and reviews page.

How it works:
• Director — Public welcome message (home + reviews)
• Staff — Your team message (home + reviews)
• Still shown on home carousel and reviews page.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_app-update-comments',
  '2026-06-14',
  'Comment on app updates now',
  $body$Tap any changelog entry to expand it — read and post comments, same as staff announcements.$body$,
  $detail$What you'll notice:
Every changelog entry can now host a real discussion — same idea as staff announcements.

How to use it:
• Bell → Updates (or the public Updates page) → tap an entry to expand it.
• Scroll to Discussion — read comments or add your own (sign in required to post).
• Collapsed cards show a comment count when a thread already exists.

SQL to run:
Supabase-sql/app-update-comments.sql — creates the comments table, security rules, and live sync.

Why I added it:
You should be able to ask what something means or tell me a release helped — not just read a wall of text from me.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_awards-coming-soon',
  '2026-06-14',
  'Awards button — coming soon',
  $body$There's a glowing Awards button in the header now. Tap it — page just says coming soon while I build it out.$body$,
  $detail$What you'll notice:
There's a glowing Awards button in the header now. Tap it — page just says coming soon while I build it out.

Swapped the header theme button for a glowing Awards button. Dark/light theme is under Account now.

Tap Awards and you'll get a coming soon page — that's it for now, still building the rest.

How it works:
Swapped the header theme button for a glowing Awards button. Dark/light theme is under Account now.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_chat-sidebar-header-removed',
  '2026-06-14',
  'Cleaned up chat sidebar header',
  $body$Removed the redundant Chat title and count from the chat sidebar — less noise.$body$,
  $detail$What you'll notice:
Removed the redundant Chat title and count from the chat sidebar — less noise.

How to use it:
• Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_fix-map-crash-leaflet',
  '2026-06-14',
  'Fixed map crash',
  $body$Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.$body$,
  $detail$What you'll notice:
Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I ship fast and sometimes break my own stuff — thanks for the screenshots and support tickets. This patch is me cleaning up so real porch pickups and chats are not blocked by a UI bug.

If something still looks off:
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
  $detail$What you'll notice:
Profile page crashed after I moved theme settings. Fixed a missing import — should be good now.

Why I changed it:
I ship fast and sometimes break my own stuff — thanks for the screenshots and support tickets. This patch is me cleaning up so real porch pickups and chats are not blocked by a UI bug.

If something still looks off:
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
  $detail$What you'll notice:
When you log in you go straight to the map tab now instead of somewhere random.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.

Why I changed it:
I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_theme-moved-to-account',
  '2026-06-14',
  'Dark/light theme moved to Account',
  $body$Theme toggle isn't in the header anymore — find it under Account now. Less clutter up top.$body$,
  $detail$What you'll notice:
Theme toggle isn't in the header anymore — find it under Account now. Less clutter up top.

How to use it:
• Account → Appearance → switch light or dark. I moved it out of the header to reduce clutter.

Why I changed it:
I write these updates so you know what changed and why — not as release notes for other developers. If anything here is unclear, comment on the entry or open a support ticket and I'll tighten the wording.$detail$,
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
  $detail$What you'll notice:
Hey guys 👋

You can post item-for-item swaps now — pick Trade/barter when you create a listing.

How to use it:
• Tap + → Trade/barter → describe what you have and what you want back.
• Still 100% free — no money, no shipping labels, no payment apps.
• Meet locally like any other pickup.

Why I added it:
Neighbors kept asking for swaps that stay inside Buy Nothing rules. This is that — barter, not a marketplace.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
),

(
  '2026-06-14_trade-grey-map-pins',
  '2026-06-14',
  'Grey map rings for trade posts',
  $body$Trade listings show a grey ring on the map. Giving stays black, looking stays white.$body$,
  $detail$What you'll notice:
Trade listings show a grey ring on the map. Giving stays black, looking stays white.

How to use it:
• Open Map (center button on phones). Tap a pin for photos, directions, and chat.
• Tap + → choose Trade/barter → describe what you have and what you want in return. Still no money, ever.

Why I changed it:
You asked for item swaps without money or shipping drama. Trade posts follow the same free-gifting rules — just barter instead of a one-way give.$detail$,
  (SELECT "displayName" FROM public.users WHERE uid = '204b071f-100c-401d-b76d-40c594e1f132'),
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132'
)
;
