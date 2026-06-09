-- Seed app_updates for the public Updates page (#/updates)
-- Run in Supabase SQL Editor. Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-09_feed-renamed-to-stuff',
  '2026-06-09',
  'Feed renamed to Stuff',
  'The community listings tab is now called Stuff — same free gifts and requests, friendlier name.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_updates-live-in-the-database',
  '2026-06-09',
  'Updates live in the database',
  'The director can post, edit, and delete changelog entries from Help & support. Neighbors see who posted each update.',
  'Changelog entries now live in the database instead of hard-coded code. Open Help & support → App updates to manage them, or browse them on the public Updates page and vote on what you think.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_test-push-notifications',
  '2026-06-09',
  'Test push notifications',
  'Send yourself a test alert from Account → Push notifications after you subscribe on a device.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_each-staff-member-writes-their-own-message',
  '2026-06-09',
  'Each staff member writes their own message',
  'Team notes are personal now — every staff member publishes their own welcome message on home and reviews.',
  'Instead of one shared city manager note, each moderator, administrator, and city manager can write and save their own message from Help & support. Published messages appear in the home carousel and on the reviews page. The director still has a separate director note.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_vote-on-updates-reviews-team-notes',
  '2026-06-09',
  'Vote on updates, reviews & team notes',
  'Upvote or downvote changelog entries, neighbor reviews, and staff messages. Update votes go to your director.',
  'Tap an update to read the full story, then weigh in with an up or down vote. Reviews and messages from the director or any staff member can be voted on too. Sign in to vote — you cannot vote on your own review.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_gofundme-footer-improvements',
  '2026-06-09',
  'GoFundMe footer improvements',
  'Removed from the map tab. Tap the footer elsewhere for the full breakdown.',
  'The compact GoFundMe strip no longer sits under the map. On every other scrollable page it appears at the very bottom. Tap it to open the full cost page — or a full-screen panel when you are signed in.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_push-notifications',
  '2026-06-09',
  'Push notifications',
  'Optional alerts for messages, claims, and community activity. Turn them on or off in your account settings.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_gofundme-on-its-own-page',
  '2026-06-09',
  'GoFundMe on its own page',
  'Full cost breakdown lives on a dedicated page. Every other screen has a short support link at the bottom.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_updates-reviews-pages',
  '2026-06-09',
  'Updates & Reviews pages',
  'Changelog and neighbor reviews — both in the menu under Community.',
  'The Updates page lists everything we have shipped, oldest to newest. Reviews let neighbors rate the app and read a note from the director. Upvotes and downvotes on updates go straight to your director as feedback.',
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_cleaner-feed-filters',
  '2026-06-09',
  'Cleaner feed filters',
  'Filters and sorting now live in one “Filters & sort” panel so the feed stays easy to scroll.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_smarter-quick-picks',
  '2026-06-09',
  'Smarter quick picks',
  'Tap multiple quick filters at once — Trending, Saved, My area, With photos, and Needs pickup.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_more-ways-to-browse-the-feed',
  '2026-06-09',
  'More ways to browse the feed',
  'Filter by giving vs. looking for, category, neighborhood, status, votes, and comments. Sort by newest, oldest, or most active.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_withdrawn-posts-stay-hidden',
  '2026-06-09',
  'Withdrawn posts stay hidden',
  'If someone removes a listing, it no longer clutters the community feed.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_free-community-events',
  '2026-06-09',
  'Free community events',
  'Post neighborhood gatherings, RSVP (going / maybe / can’t go), and leave comments. Every event must be 100% free.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_a-note-from-your-director',
  '2026-06-09',
  'A note from your director',
  'Markeith White shares why the app exists — free forever, no ads, and your info is never sold.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_star-reviews',
  '2026-06-09',
  'Star reviews',
  'Leave a quick rating for the app. One review per person, updated anytime.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-09_support-the-app-optional',
  '2026-06-09',
  'Support the app (optional)',
  'A GoFundMe link explains what it costs to run Sacramento Buy Nothing — and why we will never charge you or show ads.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-07_save-listings-labor-section',
  '2026-06-07',
  'Save listings & Labor section',
  'Bookmark posts to check later. New Labor section for community help and skills. Added Old Foothill Farms to the area list.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-07_smoother-mobile-home-page',
  '2026-06-07',
  'Smoother mobile home page',
  'Fixed layout quirks on phones so browsing before you sign in feels better.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-02_preview-listings-before-joining',
  '2026-06-02',
  'Preview listings before joining',
  'Guests can browse real community posts on the home page without signing in first.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-02_animated-public-home-page',
  '2026-06-02',
  'Animated public home page',
  'Scroll-driven motion on the welcome page so the site feels alive before you sign in.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-02_tap-photos-to-enlarge',
  '2026-06-02',
  'Tap photos to enlarge',
  'Listing images open in a lightbox so you can see details before you message someone.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-02_delete-your-account',
  '2026-06-02',
  'Delete your account',
  'You can remove your account and data when you no longer want to participate.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-02_staff-safety-tools',
  '2026-06-02',
  'Staff safety tools',
  'Leaders can remove comments, delete accounts, and fully purge data when needed.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-31_clearer-claim-hold-buttons',
  '2026-05-31',
  'Clearer claim & hold buttons',
  'Easier to see when something is available, on hold, or already claimed.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_help-support-tab',
  '2026-05-29',
  'Help & support tab',
  'Report problems, open support tickets, and reach staff from one dedicated place in the app.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_support-tickets-with-photos',
  '2026-05-29',
  'Support tickets with photos',
  'Attach pictures when you report an issue so staff can help faster.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_pick-up-several-items-at-once',
  '2026-05-29',
  'Pick up several items at once',
  'Claim multiple listings in one trip when a neighbor is giving away more than one thing.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_block-report',
  '2026-05-29',
  'Block & report',
  'Block someone who makes you uncomfortable and report serious issues to staff.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_staff-moderation-tools',
  '2026-05-29',
  'Staff moderation tools',
  'Community leaders can review reports, manage accounts, and keep the space safe.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_team-directory',
  '2026-05-29',
  'Team directory',
  'See who helps run the community and what role they play.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_neighbor-profiles-avatars',
  '2026-05-29',
  'Neighbor profiles & avatars',
  'View profiles from the directory and see neighbor photos at a glance.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_message-requests',
  '2026-05-29',
  'Message requests',
  'New chats start as a request so you can accept or decline before talking.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_38-sacramento-neighborhoods',
  '2026-05-29',
  '38 Sacramento neighborhoods',
  'Pick your area from a fuller list that covers more of the region.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_steadier-sign-in-listings',
  '2026-05-29',
  'Steadier sign-in & listings',
  'Stay signed in after refreshing, and posts load reliably once you are logged in.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_pinned-mobile-header-nav',
  '2026-05-29',
  'Pinned mobile header & nav',
  'The top bar and bottom tabs stay put while you scroll so the app feels stable on phones.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_live-updates-everywhere',
  '2026-05-29',
  'Live updates everywhere',
  'New posts, chats, votes, and ticket replies appear without refreshing the page.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_faster-photos',
  '2026-05-29',
  'Faster photos',
  'Images load quicker and upload more smoothly when you post listings.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_listing-detail-page',
  '2026-05-29',
  'Listing detail page',
  'Tap any post for the full story — photos, comments, interest votes, and claim options.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_share-pickup-location-in-chat',
  '2026-05-29',
  'Share pickup location in chat',
  'Send your porch or meetup spot privately when arranging a pickup.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_real-driving-routes-on-the-map',
  '2026-05-29',
  'Real driving routes on the map',
  'Directions to free gifts use real streets instead of straight lines.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_edit-your-own-posts',
  '2026-05-29',
  'Edit your own posts',
  'Update a listing anytime if details change before it is claimed.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_community-stats-bar',
  '2026-05-29',
  'Community stats bar',
  'See live counts of neighbors, posts, and gifts at the top of the feed.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_community-stats-on-public-home',
  '2026-05-29',
  'Community stats on public home',
  'The welcome page shows how active the community is before you join.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_role-badges',
  '2026-05-29',
  'Role badges',
  'Director and staff roles show on profiles so you know who helps run things.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_director-role-management',
  '2026-05-29',
  'Director role management',
  'The director can assign staff roles from neighbor profiles.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_public-welcome-site',
  '2026-05-29',
  'Public welcome site',
  'About, How It Works, Rules, Areas, and Community pages for guests before they sign in.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_fresh-design-system',
  '2026-05-29',
  'Fresh design system',
  'Modern cards, cleaner navigation, better dark/light themes, and a more polished look throughout.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_map-opens-first',
  '2026-05-29',
  'Map opens first',
  'The neighborhood map is the default tab so you see gifts near you right away.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_post-from-the-feed',
  '2026-05-29',
  'Post from the feed',
  'A Post button on the feed view on every screen size — not just the map.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_full-screen-mobile-chat-profile',
  '2026-05-29',
  'Full-screen mobile chat & profile',
  'Chat and account pages use the full phone screen, matching map and feed.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_tab-history-back-button',
  '2026-05-29',
  'Tab history & back button',
  'Your phone back button moves between tabs the way you expect.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_iso-fulfillment-credits',
  '2026-05-29',
  'ISO fulfillment credits',
  'Neighbors who give generously earn credit when they ask for something they need.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-29_map-color-index',
  '2026-05-29',
  'Map color index',
  'A quick legend on the map explains what each pin color means.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-28_everything-saved-online',
  '2026-05-28',
  'Everything saved online',
  'All posts, profiles, and messages now live in the cloud so nothing is lost between devices.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-20_install-on-your-home-screen',
  '2026-05-20',
  'Install on your home screen',
  'Add Sacramento Buy Nothing to your phone like an app — works offline for basic browsing.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-20_neighbor-chat',
  '2026-05-20',
  'Neighbor chat',
  'Message the person giving something away to arrange porch pickup.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-20_user-roles',
  '2026-05-20',
  'User roles',
  'Early staff and director roles so the community can be moderated as it grows.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-20_interactive-sacramento-map',
  '2026-05-20',
  'Interactive Sacramento map',
  'Leaflet map with zoom controls, custom pins, and driving directions to free items.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_photos-on-listings',
  '2026-05-19',
  'Photos on listings',
  'Upload pictures when you post so neighbors know exactly what you are giving away.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_neighborhood-map-feed',
  '2026-05-19',
  'Neighborhood map & feed',
  'Browse free gifts on a map or in a scrollable feed — giving and looking for items.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_sacramento-neighborhood-list',
  '2026-05-19',
  'Sacramento neighborhood list',
  'Pick your area when you join so posts stay local to your part of town.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_works-on-phone-tablet-desktop',
  '2026-05-19',
  'Works on phone, tablet & desktop',
  'Layouts adapt to your screen — one community app wherever you open it.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_offline-friendly',
  '2026-05-19',
  'Offline-friendly',
  'Basic browsing still works if your connection drops for a moment.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_orange-sage-branding',
  '2026-05-19',
  'Orange & sage branding',
  'Warm community colors and a local logo — built to feel like Sacramento, not a generic app.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_sacramento-buy-nothing-launches',
  '2026-05-19',
  'Sacramento Buy Nothing launches',
  'The app goes live — a free place for Sacramento neighbors to give, ask, and connect with no money involved.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-20_hooked-up-to-a-real-database',
  '2026-05-20',
  'Hooked up to a real database',
  'Posts and accounts save online so neighbors see the same community on every visit.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-20_full-screen-mobile-layout',
  '2026-05-20',
  'Full-screen mobile layout',
  'Map, feed, chat, and profile each use the whole phone screen — no cramped nested boxes.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-20_mobile-first-desktop-unchanged',
  '2026-05-20',
  'Mobile-first, desktop unchanged',
  'Reworked the phone experience while keeping the wider desktop layout neighbors already liked.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_the-community-vision',
  '2026-05-19',
  'The community vision',
  'Wrote down what Sacramento Buy Nothing is — free gifting, local neighbors, no selling, ever.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-05-19_where-it-all-started',
  '2026-05-19',
  'Where it all started',
  'First session: build a web app so Sacramento neighbors can give freely and ask kindly — May 19, 2026.',
  NULL,
  'Markeith White',
  'Buy Nothing Director',
  'director'
)
ON CONFLICT (id) DO NOTHING;
