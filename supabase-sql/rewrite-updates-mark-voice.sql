-- =========================================================
-- REWRITE ALL APP UPDATES — Mark's voice (from GitHub changelog)
-- Paste into Supabase Dashboard → SQL → New query → Run
--
-- What this does:
--   A) Deletes every row in app_updates (+ old update votes)
--   B) Re-inserts the FULL changelog from supabase-sql/* rewritten
--      how Mark actually talks — not the polished corporate cards.
--
-- Source: all supabase-sql app_updates (113 entries) + main branch through 6/14
-- Voice: casual, first-person, honest — Mark built it, Mark runs it
--
-- Safe to re-run: DELETE + INSERT
-- =========================================================

DELETE FROM public.community_content_votes
WHERE "targetType" = 'update';

DELETE FROM public.app_updates;

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES

-- ═══════════════════════════════════════════════════════════
-- MAY 19 — day one (full build session)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-05-19-day-one',
  '2026-05-19',
  'Day one — I built Sacramento Buy Nothing from scratch',
  $body$Hey guys 👋

May 19 is when I actually sat down and built this. The goal was simple: Sacramento Buy Nothing — log in, post stuff you wanna give away or stuff you're looking for, profiles, messaging, easy to search and navigate. All free. No selling.

WHAT I GOT WORKING DAY ONE
- Sign up, pick your Sacramento neighborhood (Midtown, East Sac, Curtis Park, Pocket, etc.)
- Neighborhood map + scrollable feed — browse gives and asks two ways
- Post gives and asks with categories and search
- Photos on listings
- Message neighbors about a specific listing so you know what you're talking about
- Mark your post completed, withdrawn, or relist it
- User profiles with name, photo, neighborhood, bio
- Works on phone, tablet, desktop
- Still kinda browsable if your connection drops for a sec

PUBLIC PAGE BEFORE LOGIN
- Built a landing page so you can see what this is BEFORE making an account
- What Sacramento Buy Nothing is, how it works, the rules (free only — no selling, no flipping)
- Common stuff people share (furniture, clothes, baby items, etc.)
- Neighborhood explorer — browse areas like Midtown, Land Park, Natomas, Pocket
- Sign up / log in right from there

LOOK & FEEL
- Went through a few design passes — frosted glass, then clean high-contrast minimal
- Landed on reddit orange + sage green. Wanted it sharp and local, not generic
- Fixed the browser tab — says SacramentoBuyNothing now, not some placeholder name

DATABASE & LOGIN
- Hooked up Supabase — users, items, chats, messages tables
- Wrote out the full databaseSQL.txt schema you paste into Supabase to set it up
- Switched to email + password login (Google popups kept getting blocked)
- Signup errors actually tell you what went wrong now — not useless "detour failed" text
- If you need to verify email it tells you to check your inbox
- Stripped hardcoded fake listings — site runs on real community data
- Removed the "database active" debug banner from the UI
- Better messages when the database is unreachable instead of raw "Failed to fetch"

Also fought through Firebase/Firestore headaches that day before I went all-in on Supabase. Long day.

This was just the start. May 20 I rebuilt the maps.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- MAY 20 — map views, split layouts, device-specific views
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-05-20-big-rebuild-day',
  '2026-05-20',
  'May 20 — mobile map, desktop split view, pick your pin',
  $body$Hey guys 👋

May 20 I basically didn't sleep. Rebuilt how the map and layouts work on different screens:

MOBILE MAP (its own thing)
- Desktop stayed how it was — mobile got its own full-screen map view
- Sacramento map with blips for every post — each category its own color
- Map Colors Index — tap a color to filter what's on the map
- Filters right on the map: search, give vs ask, categories, neighborhoods
- Feels like a real phone app — full screen map, bottom tab bar (Map, Stuff, Chat, Account)

DESKTOP MAP TOO
- Added the map to desktop — feed on the left, live map on the right
- Scroll the listings, map stays put and syncs with your filters
- Map tab in nav works on all screen sizes now

TABLET & DEVICE FILES
- Split the app into MobileView, TabletView, and DesktopView — each screen size gets its own layout
- Tablet is a mix — feed and map side by side like desktop but sized for tablets

POSTING A LOCATION
- When you post you can use your current location OR tap the map and drop a pin where pickup is

MAPS
- Switched the map over to OpenStreetMap (real Sacramento streets)
- Interactive Sacramento map — zoom, pins, driving directions
- Updated database schema — imageUrl on listings and other fixes in databaseSQL.txt

ALSO SHIPPED
- Neighbor chat — message whoever posted to set up porch pickup
- Add to home screen like a real app (PWA)
- Early director/staff user roles so we can moderate as this grows
- Full-screen mobile layout — map, feed, chat, profile each own the whole phone
- Desktop layout mostly stayed how it was while phones got rebuilt

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- MAY 28
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-05-28-cloud',
  '2026-05-28',
  'everything saves online now',
  $body$Hey guys 👋

Quick one — all posts, profiles, and messages live in the cloud now. Nothing stuck on one device. Sign in anywhere and it's the same community.

Still tweaking stuff daily but it's shareable now.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- MAY 29 — massive feature day (all github 5/29 entries)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-05-29-everything-at-once',
  '2026-05-29',
  'y''all went nuts on the site so I shipped a TON',
  $body$Hey guys 👋

I am honestly shocked how fast this blew up. Thank you. I dumped a huge update and wanna let it sit so you can use it before I change more.

MAP & BROWSING
- 38 Sacramento neighborhoods
- Map opens first — see gifts near you right away
- Real driving routes (actual streets, not straight lines)
- Map color legend for pin types
- Community stats bar on feed + public home page

POSTING & CLAIMING
- Post button on feed on every screen size
- Listing detail page — tap for full photos, comments, votes, claims
- Edit your own posts before they're claimed
- Post multiple items in one listing — people claim separately, you confirm who got what
- Contactless pickup — neighbors can claim at your location and pick which items they took
- Pick up several items in one trip
- ISO fulfillment credits if you give a lot
- Faster photo uploads

CHAT & PEOPLE
- Message requests — accept or decline before chatting
- Share pickup location in chat
- Neighbor profiles with avatars
- Team directory + role badges (director, staff, etc.)
- I can assign staff roles from profiles

SAFETY & SUPPORT
- Block & report — blocking auto-reports to me
- Report and support system in the app — bugs and help go straight to me
- Help & support tab — bugs, tickets, reach staff
- Attach photos to support tickets
- Staff moderation tools — review reports, manage accounts, keep it safe

APP POLISH
- Fresh design, dark/light themes
- Pinned mobile header & bottom nav
- Full-screen mobile chat & profile
- Phone back button works between tabs
- Live updates — no refresh spam
- Public welcome pages before sign-in (About, Rules, Areas, etc.)
- Steadier sign-in after refresh

Go break it and tell me what sucks.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- MAY 31
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-05-31-claims-and-real-talk',
  '2026-05-31',
  'clearer claim buttons + real talk about how this runs',
  $body$Hey guys 👋

Few things:

CLAIMS
- Claim & hold buttons are clearer — easier to see available vs on hold vs already claimed

REAL TALK (people keep asking)
- Please double-check your posts, requests, and DMs — notifications aren't fully pushed yet so don't assume you'll get pinged
- YES this costs me money. Hosting, database, making it a real app with alerts — it adds up
- Still 100% FREE for you, NO ADS, run by me
- I use Cursor, Vercel, and Supabase to build and host — I'm not selling your info, I don't want it, I have no use for it
- Looking for moderators, admins, and eventually city managers for other cities — being careful who gets controls

I ran free game servers for years (FiveM, Assetto Corsa) so I'm used to eating the cost. This one's actually working better so I'm keeping it up.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 2
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-02-guest-stuff',
  '2026-06-02',
  'browse before you sign up + delete your account',
  $body$Hey guys 👋

- Preview real listings on the home page before you make an account
- Animated welcome page so it doesn't feel dead
- Tap photos to enlarge
- Delete your account if you want out — your data goes with it
- Staff safety tools — leaders can remove comments, delete accounts, purge data when we have to

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 7
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-07-saves-labor',
  '2026-06-07',
  'save listings + labor section',
  $body$Hey guys 👋

- Bookmark listings to check later
- Labor section for community help and skills (still free — no paid gigs)
- Added Old Foothill Farms to neighborhoods
- Smoother mobile home page before login

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 9 — community pages & feed (github 6/9 non-notification)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-09-community-pages',
  '2026-06-09',
  'events, reviews, Stuff tab, filters, GoFundMe page',
  $body$Hey guys 👋

Big community update:

PAGES & STUFF
- Feed renamed to "Stuff" — same listings, less weird name
- Free community events — post gatherings, RSVP, comment (has to be 100% free)
- Star reviews — rate the app, one per person
- Updates & Reviews under Community menu
- My director note on home — why this exists, free forever, no ads, I don't sell your data
- Each staff member writes their OWN welcome message now
- Vote on updates, reviews, and team notes — feedback comes to me
- Changelog lives in the database now — I can post/edit from the app, not buried in code

BROWSING STUFF
- Filters & sort in one panel
- Quick picks: Trending, Saved, My area, With photos, Needs pickup — stack multiple
- Filter by give vs looking, category, neighborhood, status, votes, comments
- Sort newest, oldest, most active
- Withdrawn posts stay hidden

SUPPORT (OPTIONAL)
- GoFundMe got its own page with real cost breakdown
- Short support link at bottom of pages — not stuck on the map anymore

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 9 — notifications (all github 6/9 notification entries)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-09-notifications-grind',
  '2026-06-09',
  'notifications — I''ve been fighting this for days (read this)',
  $body$Hey guys 👋

OK notifications. I've been grinding on this because everyone keeps asking and I keep breaking it fixing it. Here's the deal:

WHAT SHOULD WORK
- Push when the app is CLOSED, not just while you're on the site
- Every alert type wired up like new listings — messages, comments, votes, pickup reminders, account notices, the works
- Messages, claims, new listings, comments, votes, support replies, announcements
- Comment alerts on YOUR listings
- Saved listing alerts when you bookmarked something
- Upvote/downvote alerts (optional)
- Bookmarks sync online so alerts work when you're not in the app
- Staff announcements board in Help — separate from my changelog; vote & comment
- App updates vs announcements = separate toggles
- Director oversight alerts for me (joins, departures, reports, moderation, tickets, listings, message requests, claim requests — each its own toggle)
- Test push button in Account
- Save button for notification settings — flip toggles, review, THEN save
- Logout clears push on THIS device so next person doesn't get your alerts
- Every toggle in push settings actually does something now

FIXES
- Real alerts work again — not just the test button
- No more double pings (same alert twice, drove me nuts)
- Fewer duplicate notifications in general
- Alerts go to the right account on shared phones
- Fixed white screen / "something went wrong" crash after sign-in
- App stays open after you sign in now

WHAT YOU NEED TO DO (sorry)
Each phone: Account → Push notifications → OFF then ON once. Save settings. iPhone: Add to Home Screen — Safari tabs alone won't background alert you.

If it still doesn't ping you, hit support and tell me your phone.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 10 (all github 6/10 entries)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-10-chat-reorg',
  '2026-06-10',
  'moved community chat + support into Chat tab',
  $body$Hey guys 👋

Reorganized chat because stuff was scattered:

CHAT TAB NOW
- Community chat — all neighbors
- Staff chat — staff only
- Support tickets — moved here from Help
- Direct messages — same as before

OTHER FIXES
- Announcements don't show twice when staff post (bug on my end)
- GoFundMe strip scrolls at bottom of chat instead of pinned on screen
- Support tickets have a back button
- Push for community chat & staff chat (own toggles)
- Tap any changelog entry to expand the full story — every update has a write-up now
- Help renamed Community hub — reports, updates, announcements still there

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 11 — bell hub, inbox, nav (all github 6/11 entries)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-11-bell-and-tabs',
  '2026-06-11',
  'new bell menu + notifications inbox + cleaned up tabs',
  $body$Hey guys 👋

Nav was getting messy so I cleaned it up:

THE BELL (top right) — four tabs, left to right:
1. Notify — your inbox. Every alert you'd get as a push also shows here (messages, comments, claims, nearby listings, chat, announcements, all of it)
2. News — staff announcements (vote & comment)
3. Updates — this changelog (searchable now!)
4. Alerts — all your push toggles (last on purpose so you find your inbox first)

PUSH GOT REBUILT
- Fixed webhooks, duplicate alerts, stuck preference rows, shared-phone bugs
- After updating: Bell → Alerts → turn OFF → ON → Save settings
- iPhone: open from Home Screen, not Safari
- Staff news posted from Bell → News triggers push for neighbors who enabled it

MOBILE BOTTOM
Stuff | Events | Map (big circle middle) | Chat | Account

Hub tab is gone. Staff/director tools → Account → Staff tools.
Director and staff welcome messages edited from Account → Staff tools too.

CHAT
- Reviews & reports moved into Chat sidebar (DMs → Groups → Support → Reviews)
- Support inbox same style as DMs
- Sidebar shows last 3 threads + View all
- Delete DMs, post chats, and closed support tickets (rules apply)
- Delete messages you sent; I/city managers can remove community channel msgs
- Start conversation + open new support chat rows
- Your review on top, neighbors below — not duplicated
- Empty states match across Support, DMs, and reviews — same look when there's nothing yet
- Can't vote on your own stuff anymore
- No more ugly browser OK/Cancel boxes — proper in-app confirms

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 14 — trade, awards, theme, fixes (main HEAD)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-14-trade-and-fixes',
  '2026-06-14',
  'trade/barter + awards coming + crash fixes',
  $body$Hey guys 👋

Latest shipped to the live site:

TRADE / BARTER
- New post type for item-for-item swaps — still 100% free, no money ever
- Purple trade badge on listings
- Map pin rings: giving=black, looking=white, trade=grey

AWARDS (COMING SOON)
- Glowing Awards button in the header — working on neighbor awards and a "go back in time" history of your giving. Button's there, full thing still in progress.

NAV & THEME
- Dark/light theme moved to Account (out of the header)
- You land on the map when you sign in now
- Removed redundant Chat title/count clutter in the sidebar

CRASH FIXES (sorry)
- Map was white-screening — missing import, fixed
- Profile page crashed after I moved theme settings — also fixed

Still just me building and hosting it (Cursor, Vercel, Supabase). Still free. Still no ads.

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
);
