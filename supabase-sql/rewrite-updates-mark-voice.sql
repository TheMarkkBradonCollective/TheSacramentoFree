-- =========================================================
-- REWRITE ALL APP UPDATES — Mark's voice (individual entries)
-- Paste into Supabase Dashboard → SQL → New query → Run
--
-- One row per changelog entry (113 from GitHub SQL + 8 from main 6/14).
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
  'Switched to email and password through Supabase — Google popups kept getting blocked.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_landing-page-before-login',
  '2026-05-19',
  'landing page before login',
  'Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_neighborhood-map-feed',
  '2026-05-19',
  'map + feed to browse stuff',
  'You can browse free gifts on a map OR in a scrollable feed — gives and looking-for posts.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_offline-friendly',
  '2026-05-19',
  'still works if connection drops',
  'Basic browsing still works if your connection hiccups for a second.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_orange-sage-branding',
  '2026-05-19',
  'reddit orange + sage green look',
  'Gave it reddit orange and sage green — wanted it to feel like Sacramento, not some random app.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_photos-on-listings',
  '2026-05-19',
  'photos on listings',
  'You can upload pictures when you post so people know what they''re picking up.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_sacramento-buy-nothing-launches',
  '2026-05-19',
  'Sacramento Buy Nothing is live',
  'Site went live — free place for Sacramento neighbors to give, ask, and connect. No money.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_sacramento-neighborhood-list',
  '2026-05-19',
  'pick your neighborhood',
  'When you join you pick your Sacramento area so posts stay local to your part of town.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_supabase-schema-file',
  '2026-05-19',
  'databaseSQL.txt schema file',
  'Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_the-community-vision',
  '2026-05-19',
  'what this is supposed to be',
  'Wrote down the rules: free gifting, local neighbors, no selling ever. That''s the whole point.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_where-it-all-started',
  '2026-05-19',
  'where it all started — May 19',
  'This is day one. I sat down and started building Sacramento Buy Nothing — log in, post gives and asks, profiles, messaging. That''s the whole idea.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-19_works-on-phone-tablet-desktop',
  '2026-05-19',
  'works on phone, tablet, desktop',
  'Layout adapts to whatever screen you''re on — same app everywhere.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_desktop-feed-map-split',
  '2026-05-20',
  'desktop: feed left, map right',
  'Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_device-view-files',
  '2026-05-20',
  'separate layouts per screen size',
  'Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_full-screen-mobile-layout',
  '2026-05-20',
  'full-screen mobile layout',
  'Map, feed, chat, and profile each use the whole phone screen — no tiny nested boxes.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_hooked-up-to-a-real-database',
  '2026-05-20',
  'hooked up Supabase — real data',
  'Posts and accounts save online in Supabase now. Same community every time you visit.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_install-on-your-home-screen',
  '2026-05-20',
  'add to home screen',
  'You can add Sacramento Buy Nothing to your phone like an app — works offline for basic browsing.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_interactive-sacramento-map',
  '2026-05-20',
  'interactive Sacramento map',
  'Map with zoom, custom pins, and driving directions to free items.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_mobile-first-desktop-unchanged',
  '2026-05-20',
  'mobile rebuilt, desktop mostly same',
  'Reworked phones hard while keeping the wider desktop layout you already had.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_mobile-map-category-blips',
  '2026-05-20',
  'mobile got its own full-screen map',
  'Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_neighbor-chat',
  '2026-05-20',
  'neighbor chat',
  'Message whoever posted something to set up porch pickup.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_openstreetmap',
  '2026-05-20',
  'switched to OpenStreetMap',
  'Map uses OpenStreetMap now — real Sacramento streets.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_post-location-picker',
  '2026-05-20',
  'pick your location when posting',
  'When you post you can use your current GPS location OR tap the map and drop a pin for pickup.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-20_user-roles',
  '2026-05-20',
  'director + staff roles',
  'Added early director and staff roles so we can moderate as this grows.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-28_everything-saved-online',
  '2026-05-28',
  'everything saves in the cloud',
  'All posts, profiles, and messages live online — nothing stuck on one device.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_38-sacramento-neighborhoods',
  '2026-05-29',
  '38 neighborhoods now',
  'Expanded the neighborhood list — 38 Sacramento areas to pick from.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_block-report',
  '2026-05-29',
  'block & report',
  'Block someone who makes you uncomfortable. Blocking auto-reports to me.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_bundle-multi-item-posts',
  '2026-05-29',
  'post multiple items in one listing',
  'One post can list several items — people claim separately and you confirm who got what.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_community-stats-bar',
  '2026-05-29',
  'community stats on the feed',
  'Live counts of neighbors, posts, and gifts at the top of the feed.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_community-stats-on-public-home',
  '2026-05-29',
  'stats on the public home page',
  'Welcome page shows how active the community is before you join.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_contactless-self-claim',
  '2026-05-29',
  'contactless self-claim at pickup',
  'At your pickup spot you can claim themselves and pick which items they took — you confirm.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_director-role-management',
  '2026-05-29',
  'I can assign staff roles',
  'I can give people moderator/admin/city manager roles from their profile.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_edit-your-own-posts',
  '2026-05-29',
  'edit your own posts',
  'Update a listing anytime before it''s claimed.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_faster-photos',
  '2026-05-29',
  'faster photo uploads',
  'Images load quicker and upload smoother when you post.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_fresh-design-system',
  '2026-05-29',
  'fresh design pass',
  'New cards, cleaner nav, dark/light themes, polished look throughout.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_full-screen-mobile-chat-profile',
  '2026-05-29',
  'full-screen chat & profile on mobile',
  'Chat and account use the full phone screen like map and feed.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_help-support-tab',
  '2026-05-29',
  'Help & support tab',
  'Report bugs, open tickets, reach staff — all in one place.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_iso-fulfillment-credits',
  '2026-05-29',
  'ISO credits if you give a lot',
  'Give generously and it helps when you post something you''re looking for.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_listing-detail-page',
  '2026-05-29',
  'tap a post for full details',
  'Tap any listing for photos, comments, votes, and claim options.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_live-updates-everywhere',
  '2026-05-29',
  'live updates — no refresh spam',
  'New posts, chats, votes, and ticket replies show up without refreshing.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_map-color-index',
  '2026-05-29',
  'map color legend',
  'Little legend on the map explains what each pin color means.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_map-opens-first',
  '2026-05-29',
  'map opens first',
  'Default tab is the map so you see gifts near you right away.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_message-requests',
  '2026-05-29',
  'DM requests — accept or decline',
  'New chats start as a request. You accept or decline before talking.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_neighbor-profiles-avatars',
  '2026-05-29',
  'neighbor profiles + avatars',
  'View profiles and see neighbor photos.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_pick-up-several-items-at-once',
  '2026-05-29',
  'claim multiple items one trip',
  'Grab several things from the same neighbor in one pickup when they''re giving away a bunch.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_pinned-mobile-header-nav',
  '2026-05-29',
  'pinned header + bottom nav on mobile',
  'Top bar and bottom tabs stay put while you scroll on phones.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_post-from-the-feed',
  '2026-05-29',
  'post button on the feed',
  'Post button on the feed on every screen size — not just the map.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_public-welcome-site',
  '2026-05-29',
  'public pages before login',
  'About, How It Works, Rules, Areas — browse before you sign up.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_real-driving-routes-on-the-map',
  '2026-05-29',
  'real driving routes on map',
  'Directions use actual streets now, not straight lines across the map.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_request-to-dm',
  '2026-05-29',
  'request to DM outside item chats',
  'You can request to DM other users directly — aside from listing chats.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_role-badges',
  '2026-05-29',
  'role badges on profiles',
  'Director and staff badges show on profiles so you know who runs things.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_share-pickup-location-in-chat',
  '2026-05-29',
  'share pickup spot in chat',
  'Send your porch or meetup location privately when arranging pickup.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_staff-moderation-tools',
  '2026-05-29',
  'staff moderation tools',
  'Staff can review reports, manage accounts, and keep the space safe.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_steadier-sign-in-listings',
  '2026-05-29',
  'steadier sign-in',
  'Stay signed in after refresh and posts load reliably once you''re in.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_support-tickets-with-photos',
  '2026-05-29',
  'attach photos to support tickets',
  'Snap a screenshot or photo when you report a problem so I can see what you see.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_tab-history-back-button',
  '2026-05-29',
  'phone back button works between tabs',
  'Your back button moves between tabs the way you''d expect.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-29_team-directory',
  '2026-05-29',
  'team directory',
  'See who helps run the community and what role they have.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-05-31_clearer-claim-hold-buttons',
  '2026-05-31',
  'clearer claim & hold buttons',
  'Easier to see what''s available, on hold, or already claimed.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_animated-public-home-page',
  '2026-06-02',
  'animated welcome page',
  'Home page has some motion so it doesn''t feel dead before you sign in.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_delete-your-account',
  '2026-06-02',
  'delete your account',
  'You can remove your account and data if you want out.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_preview-listings-before-joining',
  '2026-06-02',
  'browse listings before you join',
  'Guests can see real posts on the home page without signing up first.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_staff-safety-tools',
  '2026-06-02',
  'staff safety tools',
  'Leaders can remove comments, delete accounts, and purge data when we have to.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-02_tap-photos-to-enlarge',
  '2026-06-02',
  'tap photos to enlarge',
  'Listing photos open big so you can see details before you message someone.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-07_save-listings-labor-section',
  '2026-06-07',
  'save listings + Labor section',
  'Bookmark posts to check later. New Labor section for free community help and skills.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-07_smoother-mobile-home-page',
  '2026-06-07',
  'smoother mobile home page',
  'Fixed layout quirks on phones before you sign in.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_a-note-from-your-director',
  '2026-06-09',
  'a note from me on the home page',
  'I wrote why this exists — free forever, no ads, I don''t sell your info.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_all-notification-toggles',
  '2026-06-09',
  'every notification toggle works',
  'Every switch in push settings actually delivers — messages, claims, discover, staff inbox, pickup reminders, all of it.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_app-updates-vs-announcements-notifications',
  '2026-06-09',
  'separate toggles: my updates vs staff news',
  'Notification settings split App updates (my changelog) and Announcements (staff posts).

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_cleaner-feed-filters',
  '2026-06-09',
  'filters in one panel',
  'Filters and sorting in one "Filters & sort" panel so the feed isn''t a mess.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_comment-and-saved-listing-alerts',
  '2026-06-09',
  'comment + saved-listing alerts',
  'Get pinged when someone comments on your listing or when a bookmarked post changes.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_director-oversight-alerts',
  '2026-06-09',
  'director oversight alerts for me',
  'I get optional push for joins, reports, moderation, tickets, listings, message requests, claims — each toggleable.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_each-staff-member-writes-their-own-message',
  '2026-06-09',
  'each staff member has their own welcome note',
  'Moderators and admins write their own message for home and reviews — not one shared blurb.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_every-alert-like-new-listings',
  '2026-06-09',
  'every alert type wired up',
  'Messages, comments, votes, pickup reminders, account notices — same pipeline as new listing alerts.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_feed-renamed-to-stuff',
  '2026-06-09',
  'feed is now called "Stuff"',
  'Renamed the listings tab to Stuff — same free gifts and requests, less weird name.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_fewer-duplicate-notifications',
  '2026-06-09',
  'fewer duplicate notifications',
  'Tightened dedup so the same ping doesn''t land twice.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_free-community-events',
  '2026-06-09',
  'free community events',
  'Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_gofundme-footer-improvements',
  '2026-06-09',
  'GoFundMe not stuck on the map',
  'Removed the GoFundMe strip from under the map tab. Still at the bottom elsewhere — tap for full page.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_gofundme-on-its-own-page',
  '2026-06-09',
  'GoFundMe got its own page',
  'Full cost breakdown on a dedicated page. Short support link at the bottom of other screens.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_listing-vote-alerts',
  '2026-06-09',
  'upvote/downvote alerts (optional)',
  'Optional push when someone votes on your listings — each has its own toggle.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_logout-clears-device-push',
  '2026-06-09',
  'logout clears push on this device',
  'Signing out removes this phone''s push subscription so the next account doesn''t get your alerts.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_more-ways-to-browse-the-feed',
  '2026-06-09',
  'more feed filters',
  'Filter by give vs looking, category, neighborhood, status, votes, comments. Sort newest, oldest, most active.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_no-more-double-pings',
  '2026-06-09',
  'no more double pings',
  'Same alert was firing twice — fixed that. Drove me nuts too.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_notification-settings-save-button',
  '2026-06-09',
  'Save button on notification settings',
  'Flip toggles, review, then tap Save settings — they don''t auto-save on every tap anymore.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_notifications-right-account',
  '2026-06-09',
  'alerts go to the right account',
  'Fixed push landing on the wrong person on shared phones. Toggle off then on once while signed in as you.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_push-alerts-in-the-background',
  '2026-06-09',
  'push works when app is closed',
  'Notifications reach your phone when the app isn''t open. iPhone: Add to Home Screen.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_push-notifications',
  '2026-06-09',
  'push notifications (optional)',
  'Optional alerts for messages, claims, and activity. Turn on/off in Account.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_real-notifications-not-just-test',
  '2026-06-09',
  'real alerts work — not just test button',
  'Messages, listings, comments, and other alerts deliver again. Only the test button had been working for a lot of people. Turn notifications off and on once per device.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_saved-bookmarks-sync-online',
  '2026-06-09',
  'saved bookmarks sync online',
  'Bookmarks save to your account so alerts work when the app is closed.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_smarter-quick-picks',
  '2026-06-09',
  'stack quick filters',
  'Tap multiple quick picks at once — Trending, Saved, My area, With photos, Needs pickup.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_stable-after-sign-in',
  '2026-06-09',
  'fixed crash after sign-in',
  'Fixed white screens and "Something went wrong" right after login.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_staff-announcements-in-help',
  '2026-06-09',
  'staff announcements board',
  'Help has a separate Announcements board — staff post news, you vote and comment. Not the same as my changelog.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_star-reviews',
  '2026-06-09',
  'star reviews for the app',
  'Leave a rating — one per person, edit anytime.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_support-the-app-optional',
  '2026-06-09',
  'optional GoFundMe support',
  'GoFundMe link explains what it costs to run this — and why I''ll never charge you or show ads.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_test-push-notifications',
  '2026-06-09',
  'test push button',
  'Send yourself a test alert from Account → Push notifications after you subscribe.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_updates-live-in-the-database',
  '2026-06-09',
  'I can post updates from the app now',
  'Changelog lives in the database — I post, edit, delete from the app instead of buried code.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_updates-reviews-pages',
  '2026-06-09',
  'Updates & Reviews pages',
  'Changelog and neighbor reviews under Community in the menu.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_vote-on-updates-reviews-team-notes',
  '2026-06-09',
  'vote on updates, reviews, team notes',
  'Upvote or downvote changelog entries, reviews, and staff messages. I see the feedback.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-09_withdrawn-posts-stay-hidden',
  '2026-06-09',
  'withdrawn posts stay hidden',
  'If someone removes a listing it doesn''t clutter the feed anymore.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_chat-gofundme-scroll-support-back',
  '2026-06-10',
  'GoFundMe scrolls in chat + support back button',
  'GoFundMe strip scrolls at bottom of chat instead of pinned on screen. Support tickets have a back button.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_community-staff-chat-notifications',
  '2026-06-10',
  'push for community + staff chat',
  'New messages in Community chat and Staff chat send push — each has its own toggle.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_community-staff-chat-support-moved',
  '2026-06-10',
  'community chat + support moved to Chat tab',
  'Chat now has community-wide channel, staff lounge, and support tickets. Help renamed Community hub.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_full-changelog-deep-detail',
  '2026-06-10',
  'tap updates to read full story',
  'Every changelog entry can expand with the full write-up when you tap it.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-10_no-duplicate-announcements',
  '2026-06-10',
  'announcements don''t show twice',
  'Fixed staff announcements appearing twice right after posting.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_bell-tab-order-notifications-before-alerts',
  '2026-06-11',
  'bell tab order: Notify before Alerts',
  'Reorder: Notify → News → Updates → Alerts last so you find your inbox before settings.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_block-self-votes',
  '2026-06-11',
  'can''t vote on your own stuff',
  'Upvotes/downvotes disabled on your own listings, reviews, updates, news, and messages.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_center-map-nav',
  '2026-06-11',
  'map is the big center button',
  'On phones, Map is the round center button in the bottom nav.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-empty-states',
  '2026-06-11',
  'chat empty states match',
  'Support, DMs, and reviews use the same empty layout when there''s nothing yet.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-message-deletion',
  '2026-06-11',
  'delete your chat messages',
  'Delete messages you sent. I/city managers can remove community channel messages.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-reviews-reports',
  '2026-06-11',
  'reviews & reports moved to Chat',
  'Community reviews, Send a report, and (staff) User reports — last section in Chat sidebar.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-sidebar-actions',
  '2026-06-11',
  'Start conversation + new support rows',
  'Quick rows to start a DM or open a new support chat — same style as Send a report.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_chat-sidebar-preview',
  '2026-06-11',
  'chat sidebar: last 3 + View all',
  'Support and DMs show three recent threads with View all to expand.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_community-reviews-layout',
  '2026-06-11',
  'your review on top, neighbors below',
  'Chat → Community reviews: post yours up top, everyone else''s below — yours isn''t duplicated.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_delete-dm-and-post-chats',
  '2026-06-11',
  'delete conversations from Chat',
  'Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn. Delete closed support tickets too.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_hub-removed-staff-on-account',
  '2026-06-11',
  'Hub tab gone — staff tools on Account',
  'Removed Hub tab. Staff/director tools live under Account now. Mobile: Stuff | Events | Map | Chat | Account.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_in-app-dialogs',
  '2026-06-11',
  'no more browser OK/Cancel boxes',
  'Confirmations use in-app dialogs that match the site — not generic browser popups.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_navbar-bell-community-hub',
  '2026-06-11',
  'new bell menu — 4 tabs',
  'Bell (top right): Notify (inbox), News (staff posts), Updates (changelog), Alerts (push toggles — last on purpose).

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_notifications-inbox-alerts-toggles',
  '2026-06-11',
  'Notify = inbox, Alerts = toggles',
  'Notifications tab is your inbox of alerts received. Alerts tab (last) has every push toggle.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_post-announcement-for-push',
  '2026-06-11',
  'staff: post news from bell for push',
  'Staff announcements posted from Bell → News trigger push for neighbors who enabled it.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_push-reliability-overhaul',
  '2026-06-11',
  'push rebuilt — refresh once per device',
  'Fixed webhooks, duplicate alerts, stuck prefs, shared-phone bugs. Bell → Alerts → off → on → Save. iPhone: Home Screen app.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_refresh-push-notifications',
  '2026-06-11',
  'please refresh your push alerts',
  'After the push rebuild: Bell → Alerts → turn off → enable → save settings once per phone.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_searchable-updates',
  '2026-06-11',
  'search the changelog',
  'Bell → Updates has a search field — find past releases by keyword.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_support-inbox-in-messages',
  '2026-06-11',
  'support inbox in Chat',
  'Support tickets live in Chat with the same sidebar style as DMs.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_user-notifications-inbox-table',
  '2026-06-11',
  'inbox logs every alert',
  'Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements. If you''d get a push, it shows in your inbox.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-11_welcome-message-account',
  '2026-06-11',
  'edit welcome messages from Account',
  'Director and staff public welcome notes edited from Account → Staff tools.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_awards-button-coming-soon',
  '2026-06-14',
  'glowing Awards button (coming soon)',
  'Added a glowing Awards button in the header. Full neighbor awards + go-back-in-time history still in progress — button''s a preview of what''s coming.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_chat-sidebar-header-removed',
  '2026-06-14',
  'cleaned up chat sidebar header',
  'Removed the redundant Chat title and count from the chat sidebar — less noise.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_fix-map-crash-leaflet',
  '2026-06-14',
  'fixed map crash',
  'Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_fix-profile-crash',
  '2026-06-14',
  'fixed profile page crash',
  'Profile page crashed after I moved theme settings. Fixed a missing import — should be good now.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_land-on-map-after-login',
  '2026-06-14',
  'you land on the map when you sign in',
  'When you log in you go straight to the map tab now instead of somewhere random.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_theme-moved-to-account',
  '2026-06-14',
  'dark/light theme moved to Account',
  'Theme toggle isn''t in the header anymore — find it under Account now. Less clutter up top.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_trade-barter-listing-type',
  '2026-06-14',
  'trade/barter posts are live',
  'Hey guys 👋

You can post item-for-item swaps now — trade/barter type. Still 100% free, no money involved ever.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),

(
  '2026-06-14_trade-grey-map-pins',
  '2026-06-14',
  'grey map rings for trade posts',
  'Trade listings show a grey ring on the map. Giving stays black, looking stays white.

— Mark',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
)
;
