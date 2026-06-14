#!/usr/bin/env python3
"""Generate supabase-sql/rewrite-updates-mark-voice.sql — one row per changelog entry."""

from __future__ import annotations

import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

SQL_FILES = [
    "supabase-sql/all-community-updates.sql",
    "supabase-sql/expand-all-community-updates-detail.sql",
    "supabase-sql/add-june-10-latest-updates.sql",
    "supabase-sql/add-june-11-complete-updates.sql",
    "supabase-sql/add-june-11-latest-batch.sql",
    "supabase-sql/add-june-11-latest-updates.sql",
    "supabase-sql/add-june-11-notifications-inbox-alerts-toggles.sql",
    "supabase-sql/user-notifications.sql",
    "supabase-sql/post-push-refresh-announcement.sql",
]

ENTRY_RE = re.compile(
    r"\(\s*\n"
    r"\s*'([^']+)',\s*\n"
    r"\s*'(\d{4}-\d{2}-\d{2})',\s*\n"
    r"\s*'((?:[^']|'')*)',\s*\n"
    r"\s*'((?:[^']|'')*)',\s*\n"
    r"\s*(?:NULL|'(?P<detail_quote>(?:[^']|'')*)'|\$detail\$(?P<detail_dollar>.*?)\$detail\$)\s*,\s*\n"
    r"\s*'Markeith White'",
    re.DOTALL,
)

# May 20 session entries not in github app_updates SQL
EXTRA = [
    (
        "2026-05-20_mobile-map-category-blips",
        "2026-05-20",
        "mobile got its own full-screen map",
        "Desktop stayed the same — mobile got a full-screen Sacramento map with colored blips per category and a Map Colors Index to filter.\n\n— Mark",
    ),
    (
        "2026-05-20_desktop-feed-map-split",
        "2026-05-20",
        "desktop: feed left, map right",
        "Desktop shows listings on the left and a live sticky map on the right. Filters sync both sides.\n\n— Mark",
    ),
    (
        "2026-05-20_post-location-picker",
        "2026-05-20",
        "pick your location when posting",
        "When you post you can use your current GPS location OR tap the map and drop a pin for pickup.\n\n— Mark",
    ),
    (
        "2026-05-20_device-view-files",
        "2026-05-20",
        "separate layouts per screen size",
        "Split the app into MobileView, TabletView, and DesktopView — phone, tablet, and desktop each get their own layout file.\n\n— Mark",
    ),
    (
        "2026-05-20_openstreetmap",
        "2026-05-20",
        "switched to OpenStreetMap",
        "Map uses OpenStreetMap now — real Sacramento streets.\n\n— Mark",
    ),
    # May 19 session entries
    (
        "2026-05-19_landing-page-before-login",
        "2026-05-19",
        "landing page before login",
        "Built a public page so you can see what this is, the rules, and neighborhoods before you make an account.\n\n— Mark",
    ),
    (
        "2026-05-19_email-password-login",
        "2026-05-19",
        "email + password login",
        "Switched to email and password through Supabase — Google popups kept getting blocked.\n\n— Mark",
    ),
    (
        "2026-05-19_supabase-schema-file",
        "2026-05-19",
        "databaseSQL.txt schema file",
        "Wrote out the full Supabase schema in databaseSQL.txt — paste it in Supabase SQL editor to set up tables.\n\n— Mark",
    ),
    (
        "2026-05-29_bundle-multi-item-posts",
        "2026-05-29",
        "post multiple items in one listing",
        "One post can list several items — people claim separately and you confirm who got what.\n\n— Mark",
    ),
    (
        "2026-05-29_contactless-self-claim",
        "2026-05-29",
        "contactless self-claim at pickup",
        "At your pickup spot neighbors can claim themselves and pick which items they took — you confirm.\n\n— Mark",
    ),
    (
        "2026-05-29_request-to-dm",
        "2026-05-29",
        "request to DM outside item chats",
        "You can request to DM other users directly — aside from listing chats.\n\n— Mark",
    ),
    # June 14 main commits not yet in github SQL
    (
        "2026-06-14_trade-barter-listing-type",
        "2026-06-14",
        "trade/barter posts are live",
        "Hey guys 👋\n\nYou can post item-for-item swaps now — trade/barter type. Still 100% free, no money involved ever.\n\n— Mark",
    ),
    (
        "2026-06-14_trade-grey-map-pins",
        "2026-06-14",
        "grey map rings for trade posts",
        "Trade listings show a grey ring on the map. Giving stays black, looking stays white.\n\n— Mark",
    ),
    (
        "2026-06-14_theme-moved-to-account",
        "2026-06-14",
        "dark/light theme moved to Account",
        "Theme toggle isn't in the header anymore — find it under Account now. Less clutter up top.\n\n— Mark",
    ),
    (
        "2026-06-14_land-on-map-after-login",
        "2026-06-14",
        "you land on the map when you sign in",
        "When you log in you go straight to the map tab now instead of somewhere random.\n\n— Mark",
    ),
    (
        "2026-06-14_fix-map-crash-leaflet",
        "2026-06-14",
        "fixed map crash",
        "Map was white-screening for some people — I broke a Leaflet import. Fixed, sorry.\n\n— Mark",
    ),
    (
        "2026-06-14_fix-profile-crash",
        "2026-06-14",
        "fixed profile page crash",
        "Profile page crashed after I moved theme settings. Fixed a missing import — should be good now.\n\n— Mark",
    ),
    (
        "2026-06-14_chat-sidebar-header-removed",
        "2026-06-14",
        "cleaned up chat sidebar header",
        "Removed the redundant Chat title and count from the chat sidebar — less noise.\n\n— Mark",
    ),
]

# Casual rewrites: id -> (title, body)
VOICE: dict[str, tuple[str, str]] = {
    "2026-05-19_where-it-all-started": (
        "where it all started — May 19",
        "This is day one. I sat down and started building Sacramento Buy Nothing — log in, post gives and asks, profiles, messaging. That's the whole idea.\n\n— Mark",
    ),
    "2026-05-19_sacramento-buy-nothing-launches": (
        "Sacramento Buy Nothing is live",
        "Site went live — free place for Sacramento neighbors to give, ask, and connect. No money.\n\n— Mark",
    ),
    "2026-05-19_the-community-vision": (
        "what this is supposed to be",
        "Wrote down the rules: free gifting, local neighbors, no selling ever. That's the whole point.\n\n— Mark",
    ),
    "2026-05-19_neighborhood-map-feed": (
        "map + feed to browse stuff",
        "You can browse free gifts on a map OR in a scrollable feed — gives and looking-for posts.\n\n— Mark",
    ),
    "2026-05-19_sacramento-neighborhood-list": (
        "pick your neighborhood",
        "When you join you pick your Sacramento area so posts stay local to your part of town.\n\n— Mark",
    ),
    "2026-05-19_photos-on-listings": (
        "photos on listings",
        "You can upload pictures when you post so people know what they're picking up.\n\n— Mark",
    ),
    "2026-05-19_works-on-phone-tablet-desktop": (
        "works on phone, tablet, desktop",
        "Layout adapts to whatever screen you're on — same app everywhere.\n\n— Mark",
    ),
    "2026-05-19_offline-friendly": (
        "still works if connection drops",
        "Basic browsing still works if your connection hiccups for a second.\n\n— Mark",
    ),
    "2026-05-19_orange-sage-branding": (
        "reddit orange + sage green look",
        "Gave it reddit orange and sage green — wanted it to feel like Sacramento, not some random app.\n\n— Mark",
    ),
    "2026-05-20_hooked-up-to-a-real-database": (
        "hooked up Supabase — real data",
        "Posts and accounts save online in Supabase now. Same community every time you visit.\n\n— Mark",
    ),
    "2026-05-20_full-screen-mobile-layout": (
        "full-screen mobile layout",
        "Map, feed, chat, and profile each use the whole phone screen — no tiny nested boxes.\n\n— Mark",
    ),
    "2026-05-20_mobile-first-desktop-unchanged": (
        "mobile rebuilt, desktop mostly same",
        "Reworked phones hard while keeping the wider desktop layout you already had.\n\n— Mark",
    ),
    "2026-05-20_install-on-your-home-screen": (
        "add to home screen",
        "You can add Sacramento Buy Nothing to your phone like an app — works offline for basic browsing.\n\n— Mark",
    ),
    "2026-05-20_neighbor-chat": (
        "neighbor chat",
        "Message whoever posted something to set up porch pickup.\n\n— Mark",
    ),
    "2026-05-20_interactive-sacramento-map": (
        "interactive Sacramento map",
        "Map with zoom, custom pins, and driving directions to free items.\n\n— Mark",
    ),
    "2026-05-20_user-roles": (
        "director + staff roles",
        "Added early director and staff roles so we can moderate as this grows.\n\n— Mark",
    ),
    "2026-05-28_everything-saved-online": (
        "everything saves in the cloud",
        "All posts, profiles, and messages live online — nothing stuck on one device.\n\n— Mark",
    ),
    "2026-05-29_38-sacramento-neighborhoods": (
        "38 neighborhoods now",
        "Expanded the neighborhood list — 38 Sacramento areas to pick from.\n\n— Mark",
    ),
    "2026-05-29_map-opens-first": (
        "map opens first",
        "Default tab is the map so you see gifts near you right away.\n\n— Mark",
    ),
    "2026-05-29_real-driving-routes-on-the-map": (
        "real driving routes on map",
        "Directions use actual streets now, not straight lines across the map.\n\n— Mark",
    ),
    "2026-05-29_map-color-index": (
        "map color legend",
        "Little legend on the map explains what each pin color means.\n\n— Mark",
    ),
    "2026-05-29_post-from-the-feed": (
        "post button on the feed",
        "Post button on the feed on every screen size — not just the map.\n\n— Mark",
    ),
    "2026-05-29_listing-detail-page": (
        "tap a post for full details",
        "Tap any listing for photos, comments, votes, and claim options.\n\n— Mark",
    ),
    "2026-05-29_edit-your-own-posts": (
        "edit your own posts",
        "Update a listing anytime before it's claimed.\n\n— Mark",
    ),
    "2026-05-29_pick-up-several-items-at-once": (
        "claim multiple items one trip",
        "Grab several things from the same neighbor in one pickup when they're giving away a bunch.\n\n— Mark",
    ),
    "2026-05-29_iso-fulfillment-credits": (
        "ISO credits if you give a lot",
        "Give generously and it helps when you post something you're looking for.\n\n— Mark",
    ),
    "2026-05-29_faster-photos": (
        "faster photo uploads",
        "Images load quicker and upload smoother when you post.\n\n— Mark",
    ),
    "2026-05-29_message-requests": (
        "DM requests — accept or decline",
        "New chats start as a request. You accept or decline before talking.\n\n— Mark",
    ),
    "2026-05-29_share-pickup-location-in-chat": (
        "share pickup spot in chat",
        "Send your porch or meetup location privately when arranging pickup.\n\n— Mark",
    ),
    "2026-05-29_neighbor-profiles-avatars": (
        "neighbor profiles + avatars",
        "View profiles and see neighbor photos.\n\n— Mark",
    ),
    "2026-05-29_team-directory": (
        "team directory",
        "See who helps run the community and what role they have.\n\n— Mark",
    ),
    "2026-05-29_role-badges": (
        "role badges on profiles",
        "Director and staff badges show on profiles so you know who runs things.\n\n— Mark",
    ),
    "2026-05-29_director-role-management": (
        "I can assign staff roles",
        "I can give people moderator/admin/city manager roles from their profile.\n\n— Mark",
    ),
    "2026-05-29_block-report": (
        "block & report",
        "Block someone who makes you uncomfortable. Blocking auto-reports to me.\n\n— Mark",
    ),
    "2026-05-29_help-support-tab": (
        "Help & support tab",
        "Report bugs, open tickets, reach staff — all in one place.\n\n— Mark",
    ),
    "2026-05-29_support-tickets-with-photos": (
        "attach photos to support tickets",
        "Snap a screenshot or photo when you report a problem so I can see what you see.\n\n— Mark",
    ),
    "2026-05-29_staff-moderation-tools": (
        "staff moderation tools",
        "Staff can review reports, manage accounts, and keep the space safe.\n\n— Mark",
    ),
    "2026-05-29_fresh-design-system": (
        "fresh design pass",
        "New cards, cleaner nav, dark/light themes, polished look throughout.\n\n— Mark",
    ),
    "2026-05-29_pinned-mobile-header-nav": (
        "pinned header + bottom nav on mobile",
        "Top bar and bottom tabs stay put while you scroll on phones.\n\n— Mark",
    ),
    "2026-05-29_full-screen-mobile-chat-profile": (
        "full-screen chat & profile on mobile",
        "Chat and account use the full phone screen like map and feed.\n\n— Mark",
    ),
    "2026-05-29_tab-history-back-button": (
        "phone back button works between tabs",
        "Your back button moves between tabs the way you'd expect.\n\n— Mark",
    ),
    "2026-05-29_live-updates-everywhere": (
        "live updates — no refresh spam",
        "New posts, chats, votes, and ticket replies show up without refreshing.\n\n— Mark",
    ),
    "2026-05-29_community-stats-bar": (
        "community stats on the feed",
        "Live counts of neighbors, posts, and gifts at the top of the feed.\n\n— Mark",
    ),
    "2026-05-29_community-stats-on-public-home": (
        "stats on the public home page",
        "Welcome page shows how active the community is before you join.\n\n— Mark",
    ),
    "2026-05-29_public-welcome-site": (
        "public pages before login",
        "About, How It Works, Rules, Areas — browse before you sign up.\n\n— Mark",
    ),
    "2026-05-29_steadier-sign-in-listings": (
        "steadier sign-in",
        "Stay signed in after refresh and posts load reliably once you're in.\n\n— Mark",
    ),
    "2026-05-31_clearer-claim-hold-buttons": (
        "clearer claim & hold buttons",
        "Easier to see what's available, on hold, or already claimed.\n\n— Mark",
    ),
    "2026-06-02_preview-listings-before-joining": (
        "browse listings before you join",
        "Guests can see real posts on the home page without signing up first.\n\n— Mark",
    ),
    "2026-06-02_animated-public-home-page": (
        "animated welcome page",
        "Home page has some motion so it doesn't feel dead before you sign in.\n\n— Mark",
    ),
    "2026-06-02_tap-photos-to-enlarge": (
        "tap photos to enlarge",
        "Listing photos open big so you can see details before you message someone.\n\n— Mark",
    ),
    "2026-06-02_delete-your-account": (
        "delete your account",
        "You can remove your account and data if you want out.\n\n— Mark",
    ),
    "2026-06-02_staff-safety-tools": (
        "staff safety tools",
        "Leaders can remove comments, delete accounts, and purge data when we have to.\n\n— Mark",
    ),
    "2026-06-07_save-listings-labor-section": (
        "save listings + Labor section",
        "Bookmark posts to check later. New Labor section for free community help and skills.\n\n— Mark",
    ),
    "2026-06-07_smoother-mobile-home-page": (
        "smoother mobile home page",
        "Fixed layout quirks on phones before you sign in.\n\n— Mark",
    ),
    "2026-06-09_feed-renamed-to-stuff": (
        'feed is now called "Stuff"',
        'Renamed the listings tab to Stuff — same free gifts and requests, less weird name.\n\n— Mark',
    ),
    "2026-06-09_free-community-events": (
        "free community events",
        "Post neighborhood gatherings, RSVP, comment. Every event has to be 100% free.\n\n— Mark",
    ),
    "2026-06-09_star-reviews": (
        "star reviews for the app",
        "Leave a rating — one per person, edit anytime.\n\n— Mark",
    ),
    "2026-06-09_updates-reviews-pages": (
        "Updates & Reviews pages",
        "Changelog and neighbor reviews under Community in the menu.\n\n— Mark",
    ),
    "2026-06-09_a-note-from-your-director": (
        "a note from me on the home page",
        "I wrote why this exists — free forever, no ads, I don't sell your info.\n\n— Mark",
    ),
    "2026-06-09_each-staff-member-writes-their-own-message": (
        "each staff member has their own welcome note",
        "Moderators and admins write their own message for home and reviews — not one shared blurb.\n\n— Mark",
    ),
    "2026-06-09_vote-on-updates-reviews-team-notes": (
        "vote on updates, reviews, team notes",
        "Upvote or downvote changelog entries, reviews, and staff messages. I see the feedback.\n\n— Mark",
    ),
    "2026-06-09_updates-live-in-the-database": (
        "I can post updates from the app now",
        "Changelog lives in the database — I post, edit, delete from the app instead of buried code.\n\n— Mark",
    ),
    "2026-06-09_cleaner-feed-filters": (
        "filters in one panel",
        'Filters and sorting in one "Filters & sort" panel so the feed isn\'t a mess.\n\n— Mark',
    ),
    "2026-06-09_smarter-quick-picks": (
        "stack quick filters",
        "Tap multiple quick picks at once — Trending, Saved, My area, With photos, Needs pickup.\n\n— Mark",
    ),
    "2026-06-09_more-ways-to-browse-the-feed": (
        "more feed filters",
        "Filter by give vs looking, category, neighborhood, status, votes, comments. Sort newest, oldest, most active.\n\n— Mark",
    ),
    "2026-06-09_withdrawn-posts-stay-hidden": (
        "withdrawn posts stay hidden",
        "If someone removes a listing it doesn't clutter the feed anymore.\n\n— Mark",
    ),
    "2026-06-09_gofundme-on-its-own-page": (
        "GoFundMe got its own page",
        "Full cost breakdown on a dedicated page. Short support link at the bottom of other screens.\n\n— Mark",
    ),
    "2026-06-09_gofundme-footer-improvements": (
        "GoFundMe not stuck on the map",
        "Removed the GoFundMe strip from under the map tab. Still at the bottom elsewhere — tap for full page.\n\n— Mark",
    ),
    "2026-06-09_support-the-app-optional": (
        "optional GoFundMe support",
        "GoFundMe link explains what it costs to run this — and why I'll never charge you or show ads.\n\n— Mark",
    ),
    "2026-06-09_push-notifications": (
        "push notifications (optional)",
        "Optional alerts for messages, claims, and activity. Turn on/off in Account.\n\n— Mark",
    ),
    "2026-06-09_push-alerts-in-the-background": (
        "push works when app is closed",
        "Notifications reach your phone when the app isn't open. iPhone: Add to Home Screen.\n\n— Mark",
    ),
    "2026-06-09_all-notification-toggles": (
        "every notification toggle works",
        "Every switch in push settings actually delivers — messages, claims, discover, staff inbox, pickup reminders, all of it.\n\n— Mark",
    ),
    "2026-06-09_real-notifications-not-just-test": (
        "real alerts work — not just test button",
        "Messages, listings, comments, and other alerts deliver again. Only the test button had been working for a lot of people. Turn notifications off and on once per device.\n\n— Mark",
    ),
    "2026-06-09_stable-after-sign-in": (
        "fixed crash after sign-in",
        'Fixed white screens and "Something went wrong" right after login.\n\n— Mark',
    ),
    "2026-06-09_staff-announcements-in-help": (
        "staff announcements board",
        "Help has a separate Announcements board — staff post news, you vote and comment. Not the same as my changelog.\n\n— Mark",
    ),
    "2026-06-09_app-updates-vs-announcements-notifications": (
        "separate toggles: my updates vs staff news",
        "Notification settings split App updates (my changelog) and Announcements (staff posts).\n\n— Mark",
    ),
    "2026-06-09_logout-clears-device-push": (
        "logout clears push on this device",
        "Signing out removes this phone's push subscription so the next account doesn't get your alerts.\n\n— Mark",
    ),
    "2026-06-09_notification-settings-save-button": (
        "Save button on notification settings",
        "Flip toggles, review, then tap Save settings — they don't auto-save on every tap anymore.\n\n— Mark",
    ),
    "2026-06-09_every-alert-like-new-listings": (
        "every alert type wired up",
        "Messages, comments, votes, pickup reminders, account notices — same pipeline as new listing alerts.\n\n— Mark",
    ),
    "2026-06-09_no-more-double-pings": (
        "no more double pings",
        "Same alert was firing twice — fixed that. Drove me nuts too.\n\n— Mark",
    ),
    "2026-06-09_notifications-right-account": (
        "alerts go to the right account",
        "Fixed push landing on the wrong person on shared phones. Toggle off then on once while signed in as you.\n\n— Mark",
    ),
    "2026-06-09_comment-and-saved-listing-alerts": (
        "comment + saved-listing alerts",
        "Get pinged when someone comments on your listing or when a bookmarked post changes.\n\n— Mark",
    ),
    "2026-06-09_listing-vote-alerts": (
        "upvote/downvote alerts (optional)",
        "Optional push when someone votes on your listings — each has its own toggle.\n\n— Mark",
    ),
    "2026-06-09_saved-bookmarks-sync-online": (
        "saved bookmarks sync online",
        "Bookmarks save to your account so alerts work when the app is closed.\n\n— Mark",
    ),
    "2026-06-09_fewer-duplicate-notifications": (
        "fewer duplicate notifications",
        "Tightened dedup so the same ping doesn't land twice.\n\n— Mark",
    ),
    "2026-06-09_director-oversight-alerts": (
        "director oversight alerts for me",
        "I get optional push for joins, reports, moderation, tickets, listings, message requests, claims — each toggleable.\n\n— Mark",
    ),
    "2026-06-09_test-push-notifications": (
        "test push button",
        "Send yourself a test alert from Account → Push notifications after you subscribe.\n\n— Mark",
    ),
    "2026-06-10_no-duplicate-announcements": (
        "announcements don't show twice",
        "Fixed staff announcements appearing twice right after posting.\n\n— Mark",
    ),
    "2026-06-10_chat-gofundme-scroll-support-back": (
        "GoFundMe scrolls in chat + support back button",
        "GoFundMe strip scrolls at bottom of chat instead of pinned on screen. Support tickets have a back button.\n\n— Mark",
    ),
    "2026-06-10_community-staff-chat-support-moved": (
        "community chat + support moved to Chat tab",
        "Chat now has community-wide channel, staff lounge, and support tickets. Help renamed Community hub.\n\n— Mark",
    ),
    "2026-06-10_full-changelog-deep-detail": (
        "tap updates to read full story",
        "Every changelog entry can expand with the full write-up when you tap it.\n\n— Mark",
    ),
    "2026-06-10_community-staff-chat-notifications": (
        "push for community + staff chat",
        "New messages in Community chat and Staff chat send push — each has its own toggle.\n\n— Mark",
    ),
    "2026-06-11_navbar-bell-community-hub": (
        "new bell menu — 4 tabs",
        "Bell (top right): Notify (inbox), News (staff posts), Updates (changelog), Alerts (push toggles — last on purpose).\n\n— Mark",
    ),
    "2026-06-11_notifications-inbox-alerts-toggles": (
        "Notify = inbox, Alerts = toggles",
        "Notifications tab is your inbox of alerts received. Alerts tab (last) has every push toggle.\n\n— Mark",
    ),
    "2026-06-11_bell-tab-order-notifications-before-alerts": (
        "bell tab order: Notify before Alerts",
        "Reorder: Notify → News → Updates → Alerts last so you find your inbox before settings.\n\n— Mark",
    ),
    "2026-06-11_user-notifications-inbox-table": (
        "inbox logs every alert",
        "Bell → Notify mirrors push — messages, comments, claims, nearby listings, chat, announcements. If you'd get a push, it shows in your inbox.\n\n— Mark",
    ),
    "2026-06-11_push-reliability-overhaul": (
        "push rebuilt — refresh once per device",
        "Fixed webhooks, duplicate alerts, stuck prefs, shared-phone bugs. Bell → Alerts → off → on → Save. iPhone: Home Screen app.\n\n— Mark",
    ),
    "2026-06-11_refresh-push-notifications": (
        "please refresh your push alerts",
        "After the push rebuild: Bell → Alerts → turn off → enable → save settings once per phone.\n\n— Mark",
    ),
    "2026-06-11_searchable-updates": (
        "search the changelog",
        "Bell → Updates has a search field — find past releases by keyword.\n\n— Mark",
    ),
    "2026-06-11_hub-removed-staff-on-account": (
        "Hub tab gone — staff tools on Account",
        "Removed Hub tab. Staff/director tools live under Account now. Mobile: Stuff | Events | Map | Chat | Account.\n\n— Mark",
    ),
    "2026-06-11_center-map-nav": (
        "map is the big center button",
        "On phones, Map is the round center button in the bottom nav.\n\n— Mark",
    ),
    "2026-06-11_welcome-message-account": (
        "edit welcome messages from Account",
        "Director and staff public welcome notes edited from Account → Staff tools.\n\n— Mark",
    ),
    "2026-06-11_support-inbox-in-messages": (
        "support inbox in Chat",
        "Support tickets live in Chat with the same sidebar style as DMs.\n\n— Mark",
    ),
    "2026-06-11_chat-reviews-reports": (
        "reviews & reports moved to Chat",
        "Community reviews, Send a report, and (staff) User reports — last section in Chat sidebar.\n\n— Mark",
    ),
    "2026-06-11_community-reviews-layout": (
        "your review on top, neighbors below",
        "Chat → Community reviews: post yours up top, everyone else's below — yours isn't duplicated.\n\n— Mark",
    ),
    "2026-06-11_chat-sidebar-preview": (
        "chat sidebar: last 3 + View all",
        "Support and DMs show three recent threads with View all to expand.\n\n— Mark",
    ),
    "2026-06-11_chat-sidebar-actions": (
        "Start conversation + new support rows",
        "Quick rows to start a DM or open a new support chat — same style as Send a report.\n\n— Mark",
    ),
    "2026-06-11_chat-empty-states": (
        "chat empty states match",
        "Support, DMs, and reviews use the same empty layout when there's nothing yet.\n\n— Mark",
    ),
    "2026-06-11_delete-dm-and-post-chats": (
        "delete conversations from Chat",
        "Remove profile DMs or post chats. Poster can delete post chats only after gifted or withdrawn. Delete closed support tickets too.\n\n— Mark",
    ),
    "2026-06-11_chat-message-deletion": (
        "delete your chat messages",
        "Delete messages you sent. I/city managers can remove community channel messages.\n\n— Mark",
    ),
    "2026-06-11_in-app-dialogs": (
        "no more browser OK/Cancel boxes",
        "Confirmations use in-app dialogs that match the site — not generic browser popups.\n\n— Mark",
    ),
    "2026-06-11_block-self-votes": (
        "can't vote on your own stuff",
        "Upvotes/downvotes disabled on your own listings, reviews, updates, news, and messages.\n\n— Mark",
    ),
    "2026-06-11_post-announcement-for-push": (
        "staff: post news from bell for push",
        "Staff announcements posted from Bell → News trigger push for neighbors who enabled it.\n\n— Mark",
    ),
}


def parse_inserts(text: str) -> list[dict]:
    entries = []
    for m in ENTRY_RE.finditer(text):
        if m.group("detail_dollar") is not None:
            detail_raw = m.group("detail_dollar")
        elif m.group("detail_quote") is not None:
            detail_raw = m.group("detail_quote").replace("''", "'")
        else:
            detail_raw = None
        entries.append(
            {
                "id": m.group(1),
                "date": m.group(2),
                "title": m.group(3).replace("''", "'"),
                "body": m.group(4).replace("''", "'"),
                "detail": detail_raw.strip() if detail_raw else None,
            }
        )
    return entries


def sql_dollar(tag: str, content: str) -> str:
    """Pick a dollar-quote delimiter that does not appear in content."""
    for n in ("", "d", "dt", "body", "detail"):
        delim = f"${tag}{n}$"
        if delim not in content:
            return f"{delim}{content}{delim}"
    raise ValueError("Could not find safe dollar-quote delimiter")


def casualize_detail(text: str) -> str:
    """Rewrite GitHub detail blocks in Mark's voice — still informative when expanded."""
    t = text.strip()
    replacements = [
        ("WHAT NEIGHBORS SEE", "What you'll notice"),
        ("WHAT STAFF SEE", "What staff see"),
        ("WHAT WAS BROKEN", "What was broken"),
        ("WHAT WE FIXED", "What I fixed"),
        ("WHAT WE CHANGED (CODE)", "What I changed"),
        ("WHAT WE CHANGED", "What I changed"),
        ("WHAT YOU SHOULD DO", "What you should do"),
        ("WHAT YOU NEED TO DO", "What you need to do"),
        ("ROOT CAUSES", "Why it broke"),
        ("ROOT CAUSE", "Why it broke"),
        ("FILES TOUCHED", "Behind the scenes (files I touched)"),
        ("FILES", "Behind the scenes"),
        ("PROBLEM", "The problem"),
        ("PHASE 1 FIX", "First fix I tried"),
        ("PHASE 2 FIX (current)", "What actually fixed it"),
        ("PHASE 2 FIX", "What actually fixed it"),
        ("VERIFICATION", "How to check it"),
        ("HOW IT WORKS", "How it works"),
        ("HOW TO NOTIFY", "How to notify everyone"),
        ("AFTER THIS DEPLOY", "After this update"),
        ("AFTER DEPLOY", "After this update"),
        ("DIRECTOR OPS", "If you're me and it's still broken"),
        ("NEIGHBOR ACTION", "What you should do"),
        ("REFRESH PUSH", "Refresh push on your phone"),
        ("TAB ORDER", "Tab order"),
        ("CHAT SIDEBAR ORDER", "Chat sidebar order"),
        ("MOBILE BOTTOM", "Mobile bottom tabs"),
        ("THE BELL", "The bell menu"),
        ("PUSH GOT REBUILT", "Push got rebuilt"),
        ("PUSH REMINDER", "Push reminder"),
        ("DATABASE", "Database stuff"),
        ("SQL TO RUN", "SQL I ran in Supabase"),
        ("SQL SETUP", "SQL setup"),
        ("Neighbors ", "You "),
        ("neighbors ", "you "),
        ("Neighbor ", "You "),
        ("neighbor ", "you "),
        ("We had", "I had"),
        ("We fixed", "I fixed"),
        ("We turned", "I turned"),
        ("We re-enabled", "I re-enabled"),
        ("We ", "I "),
        ("Director ", "I "),
        ("the director", "me"),
    ]
    for old, new in replacements:
        t = t.replace(old, new)
    if not t.endswith("— Mark"):
        t = f"{t}\n\n— Mark"
    return t


def expand_summary_to_detail(summary: str) -> str:
    """Fallback detail for entries without a GitHub detail block."""
    core = summary.replace("\n\n— Mark", "").replace("— Mark", "").strip()
    return (
        f"{core}\n\n"
        "That's the quick version. Poke around the app and you should see it — "
        "if something looks off, hit support and tell me what screen you're on.\n\n"
        "— Mark"
    )


def pick_detail(entry: dict, casual_body: str) -> str | None:
    if entry.get("detail"):
        return casualize_detail(entry["detail"])
    prof_body = entry.get("body", "")
    if len(prof_body) > len(casual_body) + 40:
        return casualize_detail(prof_body)
    return expand_summary_to_detail(casual_body)


def fallback_voice(title: str, body: str) -> tuple[str, str]:
    casual_title = title[0].lower() + title[1:] if title else title
    casual_body = (
        body.replace("Neighbors ", "You ")
        .replace("neighbors ", "you ")
        .replace("The director ", "I ")
        .replace("Director ", "I ")
    )
    if not casual_body.endswith("— Mark"):
        casual_body = f"{casual_body}\n\n— Mark"
    return casual_title, casual_body


def main() -> None:
    by_id: dict[str, dict] = {}
    for rel in SQL_FILES:
        path = ROOT / rel
        if not path.exists():
            continue
        for e in parse_inserts(path.read_text()):
            prev = by_id.get(e["id"])
            if not prev:
                by_id[e["id"]] = e
                continue
            # Prefer longest detail; keep professional body for fallback detail text
            merged = {**prev, **e}
            # Always keep the longest detail text available
            prev_detail = prev.get("detail") or ""
            new_detail = e.get("detail") or ""
            merged["detail"] = new_detail if len(new_detail) >= len(prev_detail) else prev_detail
            merged["body"] = e["body"] if len(e["body"]) >= len(prev.get("body", "")) else prev["body"]
            by_id[e["id"]] = merged

    rows = sorted(by_id.values(), key=lambda x: (x["date"], x["id"]))

    for extra in EXTRA:
        rows.append(
            {
                "id": extra[0],
                "date": extra[1],
                "title": extra[2],
                "body": extra[3],
                "detail": extra[4] if len(extra) > 4 else None,
            }
        )

    rows = sorted(rows, key=lambda x: (x["date"], x["id"]))

    out: list[str] = [
        "-- =========================================================",
        "-- REWRITE ALL APP UPDATES — Mark's voice (individual entries)",
        "-- Paste into Supabase Dashboard → SQL → New query → Run",
        "--",
        "-- body  = short summary (collapsed)",
        "-- detail = full story (expanded on tap)",
        "-- Regenerate: python3 scripts/generate-mark-voice-updates.py",
        "-- =========================================================",
        "",
        "DELETE FROM public.community_content_votes",
        "WHERE \"targetType\" = 'update';",
        "",
        "DELETE FROM public.app_updates;",
        "",
        "INSERT INTO public.app_updates (",
        "  id, date, title, body, detail, \"directorName\", \"directorTitle\", \"postedByUserId\"",
        ") VALUES",
    ]

    tuples = []
    with_detail = 0
    for e in rows:
        if e["id"] in VOICE:
            title, body = VOICE[e["id"]]
        else:
            title, body = fallback_voice(e["title"], e["body"])

        detail = pick_detail(e, body)

        if detail:
            with_detail += 1

        body_sql = sql_dollar("body", body)
        detail_sql = sql_dollar("detail", detail) if detail else "NULL"

        tuples.append(
            "(\n"
            f"  '{e['id']}',\n"
            f"  '{e['date']}',\n"
            f"  '{title.replace(chr(39), chr(39) + chr(39))}',\n"
            f"  {body_sql},\n"
            f"  {detail_sql},\n"
            f"  'Markeith White',\n"
            f"  'Buy Nothing Director',\n"
            f"  'director'\n"
            ")"
        )

    out.append(",\n\n".join(tuples))
    out.append(";")
    out.append("")

    target = ROOT / "supabase-sql/rewrite-updates-mark-voice.sql"
    target.write_text("\n".join(out))
    print(f"Wrote {len(rows)} entries ({with_detail} with detail) to {target}")


if __name__ == "__main__":
    main()
