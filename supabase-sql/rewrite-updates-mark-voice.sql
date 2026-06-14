-- =========================================================
-- REWRITE ALL APP UPDATES — Mark's voice (from GitHub changelog)
-- Paste into Supabase Dashboard → SQL → New query → Run
--
-- What this does:
--   A) Deletes every row in app_updates (+ old update votes)
--   B) Re-inserts the FULL changelog from supabase-sql/* rewritten
--      how Mark actually talks — not the polished corporate cards.
--
-- Source: all-community-updates.sql + june 9/10/11 SQL + main through 6/14
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
-- MAY 19 — day one
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-05-19-day-one',
  '2026-05-19',
  'I built Sacramento Buy Nothing — day one',
  $body$Hey guys 👋

I started building this May 19. Wanted a real site where Sacramento neighbors can log in, post stuff to give away or stuff they're looking for, have profiles, message each other, and actually find things without money involved.

Day one what I got working:

- Sacramento Buy Nothing goes live — free gifting, no money, neighbors helping neighbors
- Map + feed to browse gives and asks
- Pick your Sacramento neighborhood when you join
- Photos on listings
- Works on phone, tablet, desktop
- Still kinda browsable if your connection hiccups
- Reddit orange + sage green — wanted it to feel local, not generic
- Wrote down what this is supposed to be: free forever, no selling, no flipping, just give and ask kindly

I'm still building it every day. This was just the start.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- MAY 20 — map views, split layouts, database, login
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-05-20-big-rebuild-day',
  '2026-05-20',
  'May 20 — mobile map, desktop split view, real database',
  $body$Hey guys 👋

May 20 I basically didn't sleep. Rebuilt how the whole app looks and works on different screens. Here's what I shipped:

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

TABLET
- Split the app into separate files: MobileView, TabletView, DesktopView
- Tablet is a mix — feed and map side by side like desktop but sized for tablets

POSTING A LOCATION
- When you post you can use your current location OR tap the map and drop a pin where pickup is

MAPS & DATABASE
- Switched the map over to OpenStreetMap (real Sacramento streets)
- Hooked up Supabase — posts and accounts save online, no fake placeholder data
- Updated the database schema (imageUrl on listings and all that)
- Stripped hardcoded mock stuff — site runs on live community data
- Removed the "database active" debug junk from the UI

LOGIN
- Email + password through Supabase (no more Google popup getting blocked)
- Landing page before login so people see what this is first
- Signup errors actually tell you what went wrong now

Also fought through Firebase headaches before I went all-in on Supabase. You're welcome 😅

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
- Block & report
- Help & support tab — bugs, tickets, reach staff
- Attach photos to support tickets
- Staff moderation tools

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
- Messages, claims, new listings, comments, votes, support replies, announcements
- Comment alerts on YOUR listings
- Saved listing alerts when you bookmarked something
- Upvote/downvote alerts (optional)
- Bookmarks sync online so alerts work when you're not in the app
- Staff announcements board in Help — separate from my changelog; vote & comment
- App updates vs announcements = separate toggles
- Director oversight alerts for me (joins, reports, moderation, etc.)
- Test push button in Account
- Save button on notification settings — flip toggles, review, THEN save
- Logout clears push on THIS device so next person doesn't get your alerts

FIXES
- Real alerts work again — not just the test button
- No more double pings (same alert twice, drove me nuts)
- Alerts go to the right account on shared phones
- Fixed white screen / "something went wrong" crash after sign-in

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
- Tap any changelog entry to expand the full story
- Help renamed Community hub — reports, updates, announcements still there

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 11 (all github 6/11 entries)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-11-bell-and-tabs',
  '2026-06-11',
  'new bell menu + cleaned up mobile tabs',
  $body$Hey guys 👋

Nav was getting messy so I cleaned it up:

THE BELL (top right)
Four tabs:
1. Notify — inbox of alerts you actually got
2. News — staff announcements
3. Updates — this changelog (searchable now!)
4. Alerts — all your push toggles (last on purpose)

MOBILE BOTTOM
Stuff | Events | Map (big circle middle) | Chat | Account

Hub tab is gone. Staff/director tools → Account → Staff tools.

CHAT
- Reviews & reports moved into Chat sidebar
- Support inbox same style as DMs
- Sidebar shows last 3 threads + View all
- Delete DMs and post chats (rules apply)
- Delete messages you sent; I/city managers can remove community channel msgs
- Start conversation + open new support chat rows
- Your review on top, neighbors below — not duplicated
- Can't vote on your own stuff anymore
- No more ugly browser OK/Cancel boxes — proper in-app confirms

PUSH REMINDER
Bell → Alerts → off → on → save. iPhone: Home Screen app, not Safari.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ═══════════════════════════════════════════════════════════
-- JUNE 14 — trade, awards, theme, fixes (main through 6/14)
-- ═══════════════════════════════════════════════════════════
(
  'mark-voice-2026-06-14-trade-and-fixes',
  '2026-06-14',
  'trade/barter posts + awards coming + some crash fixes',
  $body$Hey guys 👋

Latest:

TRADE / BARTER
- New post type for item-for-item swaps — still 100% free, no money ever
- Purple trade badge; map pins: giving=black, looking=white, trade=grey

AWARDS
- Glowing Awards button in header — building neighbor awards and a "go back in time" history. Not fully live yet but it's coming.

OTHER
- Dark/light theme moved to Account
- You land on the map when you sign in now
- Map was crashing — fixed, sorry
- Profile page crashed after theme move — also fixed
- Removed redundant Chat title clutter in sidebar

Still just me building and hosting it (Cursor, Vercel, Supabase). Still free. Still no ads.

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
);
