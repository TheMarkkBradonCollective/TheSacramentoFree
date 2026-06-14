-- =========================================================
-- REWRITE ALL APP UPDATES — Mark's voice
-- Paste into Supabase Dashboard → SQL → New query → Run
--
-- What this does:
--   A) Deletes every row in app_updates (and old update votes)
--   B) Re-inserts the full changelog as fewer, casual posts — like the
--      Facebook updates — written by Mark, not corporate-speak.
--
-- Safe to re-run: DELETE + INSERT (not ON CONFLICT).
-- Does NOT touch announcements, reviews, or other tables.
-- =========================================================

-- Clear old changelog votes (old update ids won't match anymore)
DELETE FROM public.community_content_votes
WHERE "targetType" = 'update';

-- A) Delete all updates
DELETE FROM public.app_updates;

-- B) Re-insert in Mark's voice (oldest → newest in the list below;
--    the app sorts by date DESC so newest shows first)
INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES

-- ─────────────────────────────────────────────────────────
-- May 19 — where it all started
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-05-19-launch',
  '2026-05-19',
  'Sacramento Buy Nothing is live 🎉',
  $body$Hey guys! 👋

So I basically started building this on May 19 because I wanted Sacramento neighbors to have a real place to give stuff away and ask for things — no money, no selling, just neighbors helping neighbors.

What you get right out the gate:

- Map + feed so you can browse free gifts around town
- Pick your Sacramento neighborhood when you join
- Post photos on listings so people know what they're getting
- Works on phone, tablet, and desktop
- Still kinda works if your connection drops for a sec (offline-friendly)
- Orange & sage colors — wanted it to feel like Sacramento, not some random app

That's day one. More coming fast.

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- May 20 — database + mobile + map + chat
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-05-20-real-app',
  '2026-05-20',
  'Hooked it up for real + mobile overhaul',
  $body$Hey guys! 👋

Quick update on what I shipped:

- Everything saves online now (Supabase) — same community on every device, not just your phone
- Interactive Sacramento map with zoom, custom pins, and driving directions
- Neighbor chat so you can message whoever posted something and set up porch pickup
- Add it to your home screen like a real app (works pretty good offline for basic browsing)
- Reworked mobile so map, feed, chat, and profile each use the FULL screen — no more tiny boxes
- Early director/staff roles so we can moderate as this grows

Desktop neighbors — I didn't wreck what you already liked on the wider layout, just made phones way better.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- May 28 — original post energy
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-05-28-born',
  '2026-05-28',
  'So I got bored and turned the subreddit into a website 😅',
  $body$Hey guys! 👋

So I got bored and turned this reddit into a website! I'm still working on it even as we speak but it's to a point where I can share it and take opinions 🙂

Big thing today: posts, profiles, and messages all live in the cloud now — nothing gets lost between devices.

More soon.

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- May 29 — huge feature drop (matches your FB post + more)
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-05-29-huge-drop',
  '2026-05-29',
  '😱 OMG you guys love this site — huge update',
  $body$Hey guys! 👋

😱 OMG! I am in shock how much you guys all love the site. Thank you so much for all your kind words! I added quite a bit and want you all to get used to the way it is now before I make more changes. I want to see what you guys think and watch it be used.

Here's what's new:

NEIGHBORHOODS & MAP
- 38 Sacramento neighborhoods to choose from (was like 29+, I think 37 total at one point — kept adding)
- Map opens first so you see gifts near you right away
- Real driving routes on the map (actual streets, not straight lines)
- Map color index so you know what the pins mean

POSTING & PICKUPS
- Post from the feed on every screen size, not just the map
- Edit your own posts anytime before they're claimed
- Listing detail page — tap any post for photos, comments, votes, claim options
- Post multiple items in one listing — people can claim separately and you confirm who got what
- Contactless pickup: neighbors can claim themselves at your location and pick which items they took
- Pick up several items at once when someone's giving away a bunch
- ISO fulfillment credits — give a lot and it helps when you need something

CHAT & PEOPLE
- Message requests — new DMs start as a request, you accept or decline
- Share pickup location in chat when you're arranging a meetup
- Neighbor profiles with avatars; team directory so you know who runs things
- Role badges on profiles (director, staff, etc.)
- I can assign staff roles from neighbor profiles

SAFETY & SUPPORT
- Block & report — block someone uncomfortable; blocking auto-reports to me
- Help & support tab — report bugs, open tickets, reach staff
- Attach photos to support tickets
- Staff moderation tools to review reports and keep things safe

APP FEEL
- Fresh design, dark/light themes, pinned mobile header & nav
- Full-screen mobile chat & profile
- Phone back button works between tabs like you'd expect
- Live updates — posts, chats, votes, tickets show up without refreshing
- Faster photo uploads
- Community stats on the feed and public home page
- Public welcome pages (About, How It Works, Rules, Areas) before you even sign in

Go poke around and tell me what you think!

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- May 31 — Q&A + claim buttons (matches your FB post)
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-05-31-lets-talk',
  '2026-05-31',
  'Let''s talk — notifications, costs, privacy, staff',
  $body$Hey guys! 👋

I see the app/website is very much in use! I love it and appreciate the feedback I have gotten this far! But let's talk about a few things...

- For now I have to ask that ALL USERS double back and check on your Post/Request/DMs because we don't have notifications pushed through the website yet. I also will be implementing a few more features like pending pickup/hold requests and more to make things more efficient and user friendly!

- Clearer claim & hold buttons so it's easier to see what's available, on hold, or already claimed.

People have asked questions and it's time — let's answer some of them.

- First, YES this cost me. For example to make this a full app and have notifications will definitely cost a bit. But I want to enforce this app being FREE to you all and better still, WITHOUT ADS! I may put up a GoFundMe for donations but otherwise this is 100% FREE AND RUN BY ME!

I have operated game servers for free to play (FiveM/Assetto Corsa) under the same cost so this is nothing different and honestly seems to be more successful so I want to keep this up!

- Software, hosting, and furthermore the database is all run by ME and ME ALONE! I am using third party websites to do so (Cursor/Vercel/Supabase).

- As for your information, I can't speak for the third party websites but as for me, I want nothing to do with your information nor do I have no use for it nor the mindset to sell it for any reason!

Lastly,

- I may be looking for staff — I have implemented spots for moderators, administrators and a city manager (who will act as me as I develop other apps for other cities). I'm weary of who are in these positions for they have controls over the app.

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 1 — 200+ members (matches your FB post)
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-01-200-members',
  '2026-06-01',
  '200+ members — thank you + what''s next',
  $body$Hey guys! 👋

We're now over 200+ members, and I just want to say thank you. Seeing how active the site is and how much it's being used has been amazing.

I've been going through feedback and watching how everything is being used, and I want to share the next step.

I don't want Sacramento Buy Nothing to stay just a local project.

My goal is to build this into a Buy Nothing brand and eventually create similar apps for other cities so more communities can have their own local version of this platform.

I'm still actively improving the site with updates like:

- Better post pickup/hold system
- Improved messaging and DMs
- Future notification system
- Moderation and performance improvements

Everything is still being built and managed by me directly using tools like Cursor, Vercel, and Supabase.

I've set up a GoFundMe for anyone who wants to support the project and help with:

- Hosting and development costs
- New features
- Expanding to other cities
- Keeping the platform free and ad-free

All support is appreciated, but just using and sharing the site already helps a lot.

Thanks again everyone — this is only the beginning.

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 2 — guest preview + account stuff
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-02-browse-before-join',
  '2026-06-02',
  'Browse before you sign up + a few account tools',
  $body$Hey guys! 👋

Few things I pushed:

- You can preview real listings on the home page BEFORE signing up — no account needed to see what's going on
- Animated welcome page so it doesn't feel dead when you first land
- Tap photos to enlarge (lightbox) so you can actually see what you're picking up
- Delete your account if you ever want out — your data goes with it
- Staff safety tools — leaders can remove comments, delete accounts, purge data when we have to

Still building. Still me. Still free.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 7 — bookmarks + labor
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-07-bookmarks-labor',
  '2026-06-07',
  'Save listings + Labor section',
  $body$Hey guys! 👋

Quick one:

- Bookmark/save listings to check later
- New Labor section for community help and skills (still 100% free — no paid gigs)
- Added Old Foothill Farms to the neighborhood list
- Smoother mobile home page before you sign in

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 9 part 1 — community features
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-09-community-stuff',
  '2026-06-09',
  'Events, reviews, Stuff tab, filters, GoFundMe page',
  $body$Hey guys! 👋

Big community update today — a lot of this is stuff you've been asking for:

COMMUNITY PAGES
- Feed is now called "Stuff" (same free gifts & requests, just a friendlier name)
- Free community events — post neighborhood gatherings, RSVP, comment. Has to be 100% free, no exceptions
- Star reviews — leave a rating for the app, one per person, edit anytime
- Updates & Reviews pages under Community — changelog + neighbor reviews
- A note from your director on home (why this exists: free forever, no ads, I don't sell your info)
- Each staff member can write their OWN welcome message now (not one shared blurb)
- Vote on updates, reviews, and team notes — up/down goes to me as feedback

BROWSING STUFF
- Filters & sort in one panel so the feed isn't a mess
- Quick picks: Trending, Saved, My area, With photos, Needs pickup — tap multiple at once
- Filter by giving vs looking, category, neighborhood, status, votes, comments
- Sort by newest, oldest, or most active
- Withdrawn posts stay hidden so the feed isn't cluttered

SUPPORT THE APP (OPTIONAL)
- GoFundMe got its own full page with the real cost breakdown
- Short support link at the bottom of most pages (not stuck on the map anymore)

I can post/edit/delete these changelog entries myself now — they live in the database, not buried in code.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 9 part 2 — notifications (the big one)
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-09-notifications',
  '2026-06-09',
  'Push notifications — finally (please read this one)',
  $body$Hey guys! 👋

OK so notifications. I've been grinding on this because y'all kept asking and I kept breaking it trying to fix it. Here's where we're at:

WHAT WORKS NOW
- Push alerts when the app is CLOSED (not just while you're on the site)
- Messages, claims, new listings, comments, votes, support replies, announcements — the works
- Comment alerts when someone comments on YOUR listing
- Saved listing alerts when you bookmarked a post and it changes
- Upvote/downvote alerts (optional toggles)
- Saved bookmarks sync online so alerts work even when you're not on the app
- Staff announcements in Help — separate board from my changelog; staff post, you vote & comment
- App updates vs announcements are SEPARATE toggles in settings (my changelog ≠ staff news)
- Director oversight alerts for me (joins, reports, moderation, etc.)
- Test push button in Account so you can make sure YOUR phone works
- Save button for notification settings — flip toggles, review, then Save (not auto-save on every tap)
- Logout clears push on THIS device so the next person who signs in doesn't get your alerts
- Fixed double pings (same alert firing twice — annoying, I know)
- Fixed alerts going to the wrong account on shared phones
- Fixed white screen / "Something went wrong" crash after sign-in (that one was on me)

WHAT YOU NEED TO DO (sorry)
On each phone: Account → Push notifications → turn OFF, then ON again once. Tap Save settings. iPhone people: Add to Home Screen — Safari tabs alone won't get background alerts.

Real alerts work again — not just the test button. If something still doesn't ping you, holler through support.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 10 — chat/community hub
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-10-chat-hub',
  '2026-06-10',
  'Community chat + staff lounge + support moved to Chat',
  $body$Hey guys! 👋

Reorganized how chat works — should feel more like one place for everything:

CHAT TAB NOW HAS
- Community chat — all neighbors (global channel)
- Staff chat — staff only, hidden from everyone else
- Support tickets — moved out of Help, lives in Chat now
- Direct messages — same as before

OTHER FIXES
- Announcements don't show twice anymore when staff post (that was a bug)
- GoFundMe strip scrolls at the bottom of chat instead of being pinned on your screen
- Support tickets have a back button so you're not stuck
- Push alerts for community chat & staff chat (each has its own toggle)
- Every changelog entry can expand with the full story if you tap it

Help is now called Community hub — reports, my updates, staff announcements, reviews still there.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 11 — bell + nav redesign
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-11-bell-nav',
  '2026-06-11',
  'New bell menu + simpler mobile tabs',
  $body$Hey guys! 👋

Did a nav cleanup because things were getting buried:

THE BELL (top right)
Tap it — four tabs:
1. Notify — your inbox (alerts you actually received)
2. News — staff announcements
3. Updates — this changelog (searchable now!)
4. Alerts — all your push toggles (last tab on purpose so you find your inbox first)

MOBILE BOTTOM TABS
Stuff | Events | Map (big circle in the middle) | Chat | Account

The old Hub tab is gone. Staff/director tools moved to Account → Staff tools.

CHAT SIDEBAR
- Reviews & reports moved into Chat
- Support inbox same style as DMs
- Sidebar shows last 3 threads + "View all"
- Delete conversations (DMs, post chats — rules apply)
- Delete messages you sent; I/city managers can remove community channel msgs
- No more ugly browser OK/Cancel popups — proper in-app confirm dialogs
- You can't vote on your own stuff anymore (listings, reviews, updates, etc.)

PUSH REMINDER
After updating: Bell → Alerts → Turn off → Enable → Save. iPhone: open from Home Screen, not Safari.

— Mark$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

-- ─────────────────────────────────────────────────────────
-- June 14 — trade, awards, theme, fixes
-- ─────────────────────────────────────────────────────────
(
  'mark-voice-2026-06-14-trade-awards',
  '2026-06-14',
  'Trade/barter posts + Awards button + a few fixes',
  $body$Hey guys! 👋

Latest drop:

TRADE / BARTER
- New post type: trade — item for item swaps, still 100% FREE, no money
- Purple trade badge on listings; grey rings on map pins (giving = black, looking = white, trade = grey)

AWARDS (COMING SOON)
- Glowing Awards button in the header — I'm building neighbor awards & a "go back in time" history of your giving. Not live yet but the button's there so you know it's coming.

THEME
- Dark/light theme moved to Account (not cluttering the header anymore)

FIXES
- Map was crashing for some people — fixed a missing import, sorry about that
- Profile page crash after the theme move — also fixed

Still just me building with Cursor, Vercel, and Supabase. Still free, still no ads.

— Mark White
Sacramento Buy Nothing$body$,
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
);
