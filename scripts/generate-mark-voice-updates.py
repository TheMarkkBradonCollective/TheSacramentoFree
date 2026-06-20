#!/usr/bin/env python3
"""Generate supabase-sql/rewrite-updates-mark-voice.sql — one row per changelog entry."""

from __future__ import annotations

import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
# Keep in sync with shared/changelogAuthor.ts
CHANGELOG_AUTHOR_UID = "204b071f-100c-401d-b76d-40c594e1f132"
DIRECTOR_NAME_SQL = (
    f'(SELECT "displayName" FROM public.users WHERE uid = \'{CHANGELOG_AUTHOR_UID}\')'
)

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
    "supabase-sql/add-june-20-latest-updates.sql",
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
        "documented the database layout",
        "I wrote down how accounts, posts, and messages are stored online so the community data stays organized as the app grows.",
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
        "2026-06-14_awards-coming-soon",
        "2026-06-14",
        "Awards button — coming soon",
        "There's a glowing Awards button in the header now. Tap it — page just says coming soon while I build it out.\n\n— Mark",
        "Swapped the header theme button for a glowing Awards button. Dark/light theme is under Account now.\n\nTap Awards and you'll get a coming soon page — that's it for now, still building the rest.\n\n— Mark",
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
    (
        "2026-06-14_app-update-comments",
        "2026-06-14",
        "comment on app updates now",
        "Tap any changelog entry to expand it — read and post comments, same as staff announcements.",
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
    "2026-06-14_app-update-comments": (
        "comment on app updates now",
        "Tap any changelog entry to expand it — read and post comments, same as staff announcements.",
    ),
    "2026-06-20_privacy-policy-login": (
        "Privacy policy — read and accept when you sign in",
        "I added a real privacy policy you accept once at login (v2). Your account data lives in Supabase — our online database — not only on your phone. Read it anytime from Home, Account, or the footer.",
    ),
    "2026-06-20_terms-of-use-login": (
        "Terms of use — second acceptance right after privacy",
        "After privacy, you also accept the Terms of use once at login (v1). The page footer now links Privacy and Terms instead of the old GoFundMe strip. GoFundMe is still on Home and in Chat.",
    ),
    "2026-06-20_anonymous-vote-cooldown": (
        "Vote alerts stay anonymous + fair-vote cooldown",
        "Vote notifications no longer name who voted. If someone rapidly votes on many different posts, voting pauses briefly so one person cannot flood the feed — no bans, just a short breather.",
    ),
    "2026-06-20_chat-unsend": (
        "Unsend your own chat messages",
        "Tap the ↩ button on a message you sent to unsend it. The text comes back into the input box so you can fix typos and send again. Staff can still remove others' messages in community chat.",
    ),
    "2026-06-20_support-unsend": (
        "Unsend your own support ticket replies",
        "In an open support ticket, tap ↩ on your own message to unsend it. The text returns to the reply box. Works for you and for staff on their own replies.",
    ),
    "2026-06-20_feed-sort": (
        "Sort Stuff: New, Hot, Top, Active",
        "The Stuff tab has sort chips — New, Hot, Top, and Active — so you can browse trending and busy posts, not only the newest listing first.",
    ),
    "2026-06-20_updates-announcements-reading": (
        "Read full summaries + comment on news",
        "Bell → Updates and News show the entire summary without cutting off. Tap for the full story. On announcements, the comment box is always right there — vote and discuss without extra taps.",
    ),
}

SKIP_SECTION_TITLES = {
    "sql to run",
    "sql i ran",
    "sql setup",
    "database setup",
    "database",
    "under the hood",
    "what changed under the hood",
    "for me (director)",
    "if you're me debugging",
    "what changed",
}

FORBIDDEN_DETAIL_PHRASES = (
    "no sql required",
    "deploy only",
    "deploy the app update",
    "supabase-sql/",
    "paste into supabase",
    "run sections",
    "safe to re-run",
    "on conflict do update",
    "regenerate:",
    "python3 scripts/",
    "node scripts/",
    "files touched",
    "42p01",
)


def should_skip_section(title: str) -> bool:
    t = title.lower().strip().rstrip(":")
    if t in SKIP_SECTION_TITLES:
        return True
    if "sql" in t and any(word in t for word in ("run", "setup", "paste", "editor")):
        return True
    return False


def scrub_neighbor_detail(text: str) -> str:
    """Remove operator/technical lines neighbors should never see."""
    lines_out: list[str] = []
    skip_block = False

    for line in text.split("\n"):
        stripped = line.strip()
        low = stripped.lower()

        if stripped.endswith(":"):
            title = stripped[:-1]
            if should_skip_section(title):
                skip_block = True
                continue
            skip_block = False

        if skip_block:
            continue

        if any(phrase in low for phrase in FORBIDDEN_DETAIL_PHRASES):
            continue
        if "sql editor" in low or low.startswith("database (run"):
            continue
        if re.match(r"^supabase-sql/", low):
            continue
        if re.match(r"^src/", stripped):
            continue
        if re.match(r"^[a-z0-9_./-]+\.(tsx?|sql|mjs)$", stripped, re.I):
            continue

        lines_out.append(line)

    text = "\n".join(lines_out)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return collapse_empty_sections(text.strip())


def collapse_empty_sections(text: str) -> str:
    blocks = re.split(r"\n\s*\n", text.strip())
    kept: list[str] = []
    for block in blocks:
        if not block.strip():
            continue
        if ":" in block.split("\n", 1)[0] and block.split("\n", 1)[0].endswith(":"):
            header, _, body = block.partition(":")
            if not body.strip():
                continue
        kept.append(block)
    return "\n\n".join(kept)


def finalize_summary(entry_id: str, body: str) -> str:
    """Short collapsed read — first person, covers what/where."""
    body = clean_copy(body)
    eid = entry_id.lower()
    if len(body) >= 220:
        return body

    hints: list[str] = []
    if any(k in eid for k in ("bell", "notification", "alert", "inbox", "push")):
        hints.append("Look under the bell (top right) — Notify, News, Updates, or Alerts.")
    if "chat" in eid:
        hints.append("Open the Chat tab to see it in the sidebar.")
    if "map" in eid or "feed" in eid or "stuff" in eid or "listing" in eid:
        hints.append("Browse from Stuff or the Map tab depending on what you're looking for.")
    if "support" in eid or "ticket" in eid:
        hints.append("Chat → Support is where ticket threads live.")
    if "privacy" in eid or "terms" in eid:
        hints.append("You can reread it from Home, Account, or the footer links.")
    if "announcement" in eid or "news" in eid:
        hints.append("Bell → News is where staff posts land.")

    if hints:
        body = body.rstrip(".") + ". " + hints[0]
    return polish_prose(body)


def scrub_summary(text: str) -> str:
    text = clean_copy(text)
    replacements = [
        (r"paste it in Supabase SQL editor to set up tables\.?", "so the online database stays organized."),
        (r"paste it in.*?SQL editor.*?\.", "so the online database stays organized."),
        (r"Run once:?\s*supabase-sql/\S+", ""),
        (r"NO SQL REQUIRED[^.]*\.?", ""),
        (r"Deploy only[^.]*\.?", ""),
        (r"DATABASE \(run in Supabase SQL Editor\)[^.]*", ""),
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text, flags=re.I)
    return polish_prose(re.sub(r"\s{2,}", " ", text).strip())


def narrative_depth(entry_id: str, summary: str) -> str:
    """Extra neighbor-facing paragraphs when source material is thin."""
    eid = entry_id.lower()
    kind = entry_kind(entry_id)
    parts: list[str] = []

    parts.append(
        "I am Markeith White — I build and run Sacramento Buy Nothing in my spare time. "
        "When I post an update here, it is because something in the app actually changed for you, "
        "not because I am ticking boxes on a corporate release calendar."
    )

    if kind == "fix":
        parts.append(
            "This one started because something real was broken or annoying in daily use — white screens, "
            "duplicate alerts, layout glitches, the kind of thing that blocks a normal porch pickup or a "
            "simple chat. I reproduced it, patched it, and I am documenting it so you know it was heard."
        )
    elif kind == "notify":
        parts.append(
            "Push and inbox alerts are how you hear about a free couch before someone else grabs it. "
            "I keep rebuilding pieces of this whenever neighbors tell me they only got test pings, got doubles, "
            "or shared a phone with family and crossed wires. You control categories under Bell → Alerts."
        )
    elif kind == "staff":
        parts.append(
            "Sacramento is growing and I cannot be the only pair of eyes on reports, tickets, and safety. "
            "Staff tools exist so trusted neighbors can help without turning this into a corporate platform."
        )
    elif kind == "mission":
        parts.append(
            "Everything here still comes back to the same promise: free local gifting, no selling, no ads, "
            "no flipping listings for cash. Each layer on top of that is about making generosity easier in Sacramento."
        )
    else:
        parts.append(
            "I test these changes on my own phone and laptop before they land here. If something still feels "
            "wrong after you update, comment on this entry or open a support ticket — I read both."
        )

    if "gofundme" in eid:
        parts.append(
            "Hosting, the database, and push notifications cost real money every month. I will never charge "
            "neighbors to use the app and I will never run ads. The GoFundMe page is optional transparency "
            "about what it takes to keep the lights on."
        )
    if "trade" in eid or "barter" in eid:
        parts.append(
            "Trade posts are still 100% free — item for item, meet locally, no payment apps, no shipping labels. "
            "It is barter inside Buy Nothing rules, not a marketplace."
        )
    if "unsend" in eid:
        parts.append(
            "Unsend means remove for everyone in the thread and put the words back in your typing box so you "
            "can fix mistakes. It is deliberately not a silent delete with no way to recover what you meant to say."
        )
    if "privacy" in eid or "terms" in eid:
        parts.append(
            "Legal acceptance popups only show when the policy version changes. After you accept, you should "
            "not get nagged again until I publish an update that actually changes the terms."
        )

    return polish_prose("\n\n".join(parts))


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


def strip_signoffs(text: str) -> str:
    return re.sub(r"\s*—\s*Mark\s*$", "", text, flags=re.MULTILINE).strip()


def polish_title(title: str) -> str:
    title = title.strip()
    if not title:
        return title
    return title[0].upper() + title[1:]


def polish_prose(text: str) -> str:
    """Light caps/punctuation pass — keep Mark's casual tone."""
    if not text.strip():
        return text.strip()

    blocks: list[str] = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        if not lines:
            continue

        if len(lines) >= 2 and lines[0].endswith(":"):
            header = lines[0]
            rest = lines[1:]
            if all(r.startswith("•") for r in rest):
                blocks.append(header + "\n" + "\n".join(rest))
            else:
                body = _finish_sentence(" ".join(rest))
                blocks.append(f"{header}\n{body}")
            continue

        # Keep intentional short openers like "Hey guys 👋" on their own line.
        if len(lines) == 1 and lines[0].endswith("👋"):
            blocks.append(lines[0])
            continue

        blocks.append(_finish_sentence(" ".join(lines)))

    return "\n\n".join(blocks)


def _finish_sentence(merged: str) -> str:
    if not merged:
        return merged
    if merged and merged[0].islower():
        merged = merged[0].upper() + merged[1:]
    if merged.startswith("i "):
        merged = "I " + merged[2:]
    if merged and merged[-1] not in ".!?…\"')👋":
        merged += "."
    return merged


def clean_copy(text: str) -> str:
    text = strip_signoffs(text)
    # Only flatten inline bullets mid-sentence — keep real list lines intact.
    flattened: list[str] = []
    for line in text.split("\n"):
        if line.strip().startswith("•"):
            flattened.append(line)
        else:
            flattened.append(re.sub(r"\s*•\s*", ". ", line))
    text = "\n".join(flattened)
    text = re.sub(r"\.\s*\.", ".", text)
    return polish_prose(text)


TECH_LINE_RE = re.compile(
    r"^(src/|FILE|API |TABLE |DEFAULT |LABELS |ROLE_|TYPES |STORAGE |ASSETS |UI |TABS |"
    r"COMPONENT|ROUTE|HOOK|SQL |POST |GET |readCached|normalize|canEdit|subscribe|"
    r"siteContent|ASSIGNABLE|LABELS —|PUSH |BELL |CHAT |MOBILE |DESKTOP |"
    r"VISION |ONBOARDING |LAUNCH |NAV |AUTH |LOGIN |SIGNUP |FEED |MAP |"
    r".*\.tsx?\b|.*\.sql\b|.*\.ts\b|Launch date:)",
    re.I,
)


def _humanize_detail_line(line: str) -> str | None:
    line = line.strip()
    if not line or TECH_LINE_RE.match(line):
        return None
    if any(
        needle in line.lower()
        for needle in (
            "supabase-sql/",
            "vercel env",
            "normalizeuserrole",
            "stack: react",
            "origin changelog entry",
            "legacy role slugs",
            "webhook",
            "vapid",
            "cron_secret",
            "install-push",
        )
    ):
        return None

    line = re.sub(r"\bNeighbors\b", "You", line)
    line = re.sub(r"\bneighbors\b", "you", line)
    line = re.sub(r"\bNeighbor\b", "You", line)
    line = re.sub(r"\bWe fixed\b", "I fixed", line)
    line = re.sub(r"\bWe had\b", "I had", line)
    line = re.sub(r"\bWe turned\b", "I turned", line)
    line = re.sub(r"\bWe re-enabled\b", "I re-enabled", line)
    line = re.sub(r"\bWe\b", "I", line)
    line = re.sub(r"\bThe director\b", "I", line, flags=re.I)
    line = line.replace("(OFFER)", "giveaways").replace("ISO requests", "looking-for posts")
    return line


def casualize_detail(text: str) -> str:
    """Turn GitHub changelog detail into readable Mark voice — no signoffs, no file dumps."""
    t = strip_signoffs(text.strip())
    header_map = {
        "WHAT NEIGHBORS SEE": "What you'll notice",
        "WHAT NEIGHBORS SEE (DIRECTOR)": "What you'll notice",
        "WHAT NEIGHBORS SEE (STAFF)": "For staff",
        "WHAT STAFF SEE": "For staff",
        "WHAT WAS BROKEN": "What was broken",
        "WHAT WE FIXED": "What I fixed",
        "WHAT WE CHANGED (CODE)": "What changed",
        "WHAT WE CHANGED": "What changed",
        "WHAT YOU SHOULD DO": "What to do",
        "WHAT YOU NEED TO DO": "What to do",
        "ROOT CAUSES": "Why it broke",
        "ROOT CAUSE": "Why it broke",
        "FILES TOUCHED": "Under the hood",
        "FILES": "Under the hood",
        "PROBLEM": "The problem",
        "PHASE 1 FIX": "First thing I tried",
        "PHASE 2 FIX (current)": "What actually fixed it",
        "PHASE 2 FIX": "What actually fixed it",
        "VERIFICATION": "How to check",
        "HOW IT WORKS": "How it works",
        "HOW TO NOTIFY": "How to spread the word",
        "AFTER THIS DEPLOY": "After you pull the update",
        "AFTER DEPLOY": "After you pull the update",
        "DIRECTOR OPS": "If you're me debugging",
        "NEIGHBOR ACTION": "What to do",
        "REFRESH PUSH": "Refresh push on your phone",
        "TAB ORDER": "Tab order",
        "CHAT SIDEBAR ORDER": "Chat sidebar",
        "MOBILE BOTTOM": "Mobile bottom nav",
        "THE BELL": "The bell menu",
        "PUSH GOT REBUILT": "Push rebuild",
        "PUSH REMINDER": "Push reminder",
        "DATABASE": None,
        "SQL TO RUN": None,
        "SQL SETUP": None,
    }

    paragraphs: list[str] = []
    for raw_block in re.split(r"\n\s*\n", t):
        lines = [ln.strip() for ln in raw_block.split("\n") if ln.strip()]
        if not lines:
            continue

        section_title: str | None = None
        body_lines: list[str] = []

        for line in lines:
            human = _humanize_detail_line(line)
            if human is None:
                continue

            upper_key = human.split(" — ")[0].strip() if " — " in human else human
            if upper_key in header_map:
                if body_lines and section_title:
                    paragraphs.append(_join_section(section_title, body_lines))
                    body_lines = []
                mapped = header_map[upper_key]
                if mapped is None:
                    section_title = None
                    body_lines = []
                    continue
                section_title = mapped
                rest = human.split(" — ", 1)[1].strip() if " — " in human else ""
                if rest and not TECH_LINE_RE.match(rest):
                    body_lines.append(rest)
                continue

            if human.isupper() and len(human) < 60 and human in header_map:
                if body_lines and section_title:
                    paragraphs.append(_join_section(section_title, body_lines))
                    body_lines = []
                mapped = header_map[human]
                if mapped is None:
                    section_title = None
                    body_lines = []
                    continue
                section_title = mapped
                continue

            if " — " in human and human.split(" — ")[0].strip().isupper():
                # e.g. "ONBOARDING — Onboarding.tsx ..."
                continue

            body_lines.append(human)

        if body_lines:
            text = _join_section(section_title, body_lines)
            if text.strip().rstrip(".") not in ("What to do", "How to check"):
                paragraphs.append(text)

    if not paragraphs:
        cleaned = _humanize_detail_line(t)
        return clean_copy(cleaned) if cleaned else clean_copy(t)
    return clean_copy("\n\n".join(paragraphs))


def _join_section(title: str | None, lines: list[str]) -> str:
    if len(lines) == 1:
        body = lines[0]
    elif all(len(ln) < 100 for ln in lines):
        body = "\n".join(f"• {ln.lstrip('• ').strip()}" for ln in lines if ln.strip())
    else:
        body = "\n\n".join(lines)
    if title:
        return f"{title}:\n{body}"
    return body


TECH_TO_PLAIN: list[tuple[str, str]] = [
    (r"MobileView, TabletView, DesktopView shells? in App\.tsx", "The app picks a phone, tablet, or desktop layout automatically."),
    (r"MobileView, TabletView, and DesktopView", "Separate layouts for phone, tablet, and desktop"),
    (r"Responsive breakpoints at 768px and 1024px", "The layout shifts around typical tablet and laptop screen sizes."),
    (r"One codebase, three layouts", "Same community and same account everywhere — just laid out for your screen."),
    (r"readCachedProfile, readCachedItems in App\.tsx initial state", "Your profile and recent listings stay on your device for a moment if the connection drops."),
    (r"Service worker caches static assets", "A lightweight offline cache keeps basic pages from instantly going blank."),
    (r"OpenStreetMap", "OpenStreetMap (real Sacramento streets, not fake straight lines)"),
    (r"help_announcements", "staff announcements"),
    (r"app_updates", "director changelog entries"),
    (r"Leaflet", "the map library"),
]


def humanize_tech_line(line: str) -> str | None:
    line = line.strip()
    if not line:
        return None
    if TECH_LINE_RE.match(line):
        return None
    if re.match(r"^[a-z0-9_./-]+\.(tsx?|sql|mjs|ts)$", line, re.I):
        return None
    if line.startswith("src/") and " " not in line:
        return None
    if re.search(r"\b(INSERT|UPDATE|DELETE|SELECT|\.tsx|\.sql|normalize|subscribe|webhook|vapid)\b", line, re.I):
        return None
    if "→" in line and re.search(r"\b(msg-|targetType|preference key|localStorage|PHASE \d)\b", line, re.I):
        return None

    human = _humanize_detail_line(line)
    if human is None:
        return None

    for pattern, replacement in TECH_TO_PLAIN:
        human = re.sub(pattern, replacement, human, flags=re.I)

    if re.search(r"\b(src/|\.tsx|\.sql|supabase-sql/|webhook|vapid)\b", human, re.I):
        return None
    if human.rstrip().endswith(":") and len(human) < 40:
        return None
    return human


def parse_source_sections(source: str) -> list[tuple[str, str]]:
    """Pull neighbor-readable sections from GitHub/SQL detail text."""
    if not source or not source.strip():
        return []

    header_map = {
        "WHAT NEIGHBORS SEE": "What you'll notice",
        "WHAT NEIGHBORS SEE (DIRECTOR)": "What you'll notice",
        "WHAT NEIGHBORS SEE (STAFF)": "For staff",
        "WHAT STAFF SEE": "For staff",
        "WHAT WAS BROKEN": "What was broken",
        "WHAT WE FIXED": "What I fixed",
        "WHAT WE CHANGED (CODE)": "What changed under the hood",
        "WHAT WE CHANGED": "What changed",
        "WHAT YOU SHOULD DO": "What to do",
        "WHAT YOU NEED TO DO": "What to do",
        "ROOT CAUSES": "Why it broke",
        "ROOT CAUSE": "Why it broke",
        "HOW IT WORKS": "How it works",
        "HOW TO NOTIFY": "How to spread the word",
        "VERIFICATION": "How to check it's working",
        "WHERE TO FIND IT": "Where to find it",
        "TAB 1": "Announcements tab",
        "TAB 2": "Updates tab",
        "TAB 3": "Notifications tab",
        "TAB 4": "Alerts tab",
        "WHY TWO PUSH TABS?": "Why Notify and Alerts are separate",
        "NEIGHBOR ACTION": "What to do",
        "REFRESH PUSH": "Refresh push on your phone",
        "DATABASE": "Database setup",
        "SQL TO RUN": "SQL to run",
        "FOR DIRECTORS": "For me (director)",
        "FOR STAFF": "For staff",
    }

    sections: list[tuple[str, list[str]]] = []
    current_title: str | None = None
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_title, current_lines
        if not current_lines:
            current_title = None
            return
        body_bits = [bit for ln in current_lines if (bit := humanize_tech_line(ln))]
        if not body_bits:
            current_title = None
            current_lines = []
            return
        title = current_title or "How it works"
        if should_skip_section(title):
            current_title = None
            current_lines = []
            return
        sections.append((title, body_bits))
        current_title = None
        current_lines = []

    for raw_block in re.split(r"\n\s*\n", source.strip()):
        for line in raw_block.split("\n"):
            line = line.strip()
            if not line:
                continue

            upper = line.upper().rstrip(":")
            mapped = header_map.get(upper) or header_map.get(upper.split(" — ")[0])
            if mapped or (line.isupper() and len(line) < 70 and " " in line):
                flush()
                current_title = mapped or polish_title(line.lower())
                rest = line.split(" — ", 1)[1].strip() if " — " in line else ""
                if rest:
                    current_lines.append(rest)
                continue

            if line.startswith("•"):
                current_lines.append(line.lstrip("• ").strip())
                continue

            current_lines.append(line)

        flush()

    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for title, lines in sections:
        body = _join_section(None, lines)
        key = f"{title}:{body[:80]}"
        if key in seen or len(body) < 20:
            continue
        seen.add(key)
        out.append((title, body))
    return out


def entry_kind(entry_id: str) -> str:
    eid = entry_id.lower()
    if any(k in eid for k in ("fix", "crash", "white-screen", "duplicate", "wrong", "broken", "no-more")):
        return "fix"
    if any(k in eid for k in ("push", "notification", "alert", "bell")):
        return "notify"
    if any(k in eid for k in ("staff", "director", "moderat", "role")):
        return "staff"
    if any(k in eid for k in ("launch", "started", "vision", "community")):
        return "mission"
    return "feature"


def how_to_use_section(entry_id: str, summary: str) -> str | None:
    eid = entry_id.lower()
    tips: list[str] = []

    if "bell" in eid or "navbar" in eid or "hub" in eid:
        tips.append("Tap the bell (top right). Notify = inbox of alerts you received. News = staff posts. Updates = this changelog. Alerts = every push toggle — last tab on purpose.")
    if "notification" in eid and "inbox" in eid:
        tips.append("Bell → Notify lists what already pinged you — messages, comments on your posts, claims, nearby listings, and more.")
    if "search" in eid and "update" in eid:
        tips.append("Bell → Updates → use the search box to find an old release by keyword.")
    if "map" in eid:
        tips.append("Open Map (center button on phones). Tap a pin for photos, directions, and chat.")
    if "feed" in eid or "stuff" in eid or "listing" in eid or "post-from" in eid:
        tips.append("Stuff tab → scroll or filter. Tap + to post a give, ask, trade, labor offer, or event.")
    if "chat" in eid:
        tips.append("Chat tab → community channel, DMs, and support live in the sidebar. Tap a thread to open it.")
    if "trade" in eid or "barter" in eid:
        tips.append("Tap + → choose Trade/barter → describe what you have and what you want in return. Still no money, ever.")
    if "comment" in eid and "update" in eid:
        tips.append("Bell → Updates (or the public Updates page) → tap an entry → scroll to Discussion. Sign in to post.")
    if "announcement" in eid:
        tips.append("Bell → News → tap a post to expand, vote, and comment.")
    if "theme" in eid:
        tips.append("Account → Appearance → switch light or dark. I moved it out of the header to reduce clutter.")
    if "account" in eid and "delete" in eid:
        tips.append("Account → scroll to Delete account → confirm. This removes your profile and posts from the community.")
    if "push" in eid or "notification" in eid:
        tips.append("Bell → Alerts (last tab) → turn push on for this device, then flip individual categories. Tap Save settings when you're done.")

    if not tips:
        return None
    return "\n".join(f"• {t}" for t in tips[:5])


def why_section(entry_id: str, summary: str) -> str | None:
    eid = entry_id.lower()
    kind = entry_kind(entry_id)

    if kind == "fix":
        return (
            "I ship fast and sometimes break my own stuff — thanks for the screenshots and support tickets. "
            "This patch is me cleaning up so real porch pickups and chats are not blocked by a UI bug."
        )
    if kind == "notify":
        return (
            "Push has to be useful, not noisy. I rebuilt pieces of this when neighbors said they only got test alerts, "
            "got doubles, or shared phones crossed wires. You control every category under Bell → Alerts."
        )
    if "trade" in eid or "barter" in eid:
        return (
            "You asked for item swaps without money or shipping drama. Trade posts follow the same free-gifting rules — "
            "just barter instead of a one-way give."
        )
    if "comment" in eid:
        return (
            "Staff announcements already had discussion threads. Changelog entries deserved the same — "
            "you should be able to ask questions or tell me what landed well."
        )
    if "gofundme" in eid:
        return (
            "Hosting, database, and push cost real money. I will never charge neighbors or run ads — "
            "the GoFundMe page is optional transparency about what it takes to keep this alive."
        )
    if kind == "mission":
        return "This is the foundation — free, local, no selling. Everything else builds on that promise."
    if kind == "staff":
        return "As more neighbors join, I cannot be the only set of eyes. Staff tools keep reports and tickets moving without turning the app corporate."

    if any(k in eid for k in ("mobile", "desktop", "tablet", "layout", "map", "chat")):
        return "I use the app on my own phone every day. If a screen feels cramped or confusing, I rework it until it matches how neighbors actually browse."

    return (
        "I write these entries for you — the people actually giving away couches and coordinating porch pickups. "
        "If anything is unclear, comment here or open a support ticket and I will rewrite it until it makes sense."
    )


def detail_addon(entry_id: str) -> str | None:
    """Optional second paragraph — only when it actually helps. No copy-paste filler."""
    eid = entry_id.lower()
    if any(k in eid for k in ("push", "notification", "alert", "bell")):
        if any(k in eid for k in ("fix", "rebuild", "refresh", "reliab", "duplicate", "stuck")):
            return (
                "If your phone's still quiet: Bell → Alerts → turn everything off → Save → "
                "flip back on → Save again. iPhone folks need the Home Screen app, not Safari."
            )
        return None
    if any(k in eid for k in ("fix", "crash", "white-screen", "wrong", "broken")):
        return "Should be sorted now. If you still see it, hit support and tell me what screen you're on."
    if "login" in eid or "sign-in" in eid:
        return None
    if "map" in eid and "fix" in eid:
        return "Hard refresh or reopen the app if the map looks blank."
    return None


# Hand-tuned expanded stories where heuristics still fall short.
DETAIL_OVERRIDES: dict[str, str] = {
    "2026-05-19_where-it-all-started": (
        "What you'll notice:\n"
        "May 19, 2026 was day one — Sacramento Buy Nothing went from an idea to something you could actually open in a browser.\n\n"
        "How it works:\n"
        "Sign in, post gives and asks, set up a profile, and message neighbors. That was the whole scope on launch night — "
        "no selling, no ads, just local free gifting.\n\n"
        "Why I built it:\n"
        "I wanted a Sacramento-specific home for Buy Nothing culture instead of fighting Facebook groups or apps that "
        "eventually charge money. Everything since has been layers on top of that first version."
    ),
    "2026-05-29_director-role-management": (
        "What you'll notice:\n"
        "I can assign staff roles from a neighbor's profile — moderator, city administrator, city manager, and so on.\n\n"
        "For staff:\n"
        "Each role has a seat limit so the team stays small and accountable. You'll see role badges on profiles so you "
        "know who helps run the community.\n\n"
        "Why I changed it:\n"
        "One person cannot watch every report and ticket as Sacramento grows. Trusted neighbors need tools without "
        "handing everyone the keys."
    ),
    "2026-06-11_navbar-bell-community-hub": (
        "What you'll notice:\n"
        "The bell (top right, next to theme) is now a small hub with four tabs. Each tab has its own title and intro so you "
        "always know what you're looking at.\n\n"
        "The four tabs:\n"
        "• Notify — inbox of alerts about YOUR posts and profile (comments, votes, claims, gifts, status changes)\n"
        "• News — staff announcements; vote and comment\n"
        "• Updates — this director changelog\n"
        "• Alerts — last on purpose; turn push on here and choose every category\n\n"
        "Why Notify and Alerts are separate:\n"
        "Notify is what already happened to your listings. Alerts is what you want your phone to ping you about going forward — "
        "messages, discover, community chat, staff news, pickup reminders, and more.\n\n"
        "What to do after updating:\n"
        "Bell → Alerts → turn off → turn back on → Save once per phone. iPhone neighbors need the Home Screen app, not Safari."
    ),
    "2026-06-11_push-reliability-overhaul": (
        "What you'll notice:\n"
        "Real alerts should reach your phone again — messages, claims, comments, nearby listings — not just the test button.\n\n"
        "What was broken:\n"
        "Background delivery, duplicate filtering, and device preferences were out of sync. Some phones only ever got test pushes. "
        "Shared devices could cross wires between accounts so alerts landed on the wrong person.\n\n"
        "What to do:\n"
        "Bell → Alerts → turn everything off → Save → flip back on → Save again (once per phone). "
        "iPhone neighbors: use the Home Screen app, not a Safari tab.\n\n"
        "Why I rebuilt it:\n"
        "Push is how you hear about a free couch before someone else grabs it. Broken alerts make the whole app feel dead."
    ),
    "2026-06-14_trade-barter-listing-type": (
        "What you'll notice:\n"
        "Hey guys 👋\n\n"
        "You can post item-for-item swaps now — pick Trade/barter when you create a listing.\n\n"
        "How to use it:\n"
        "• Tap + → Trade/barter → describe what you have and what you want back.\n"
        "• Still 100% free — no money, no shipping labels, no payment apps.\n"
        "• Meet locally like any other pickup.\n\n"
        "Why I added it:\n"
        "Neighbors kept asking for swaps that stay inside Buy Nothing rules. This is that — barter, not a marketplace."
    ),
    "2026-06-14_app-update-comments": (
        "What you'll notice:\n"
        "Every changelog entry can now host a real discussion — same idea as staff announcements.\n\n"
        "How to use it:\n"
        "• Bell → Updates (or the public Updates page) → read the summary, tap for the full story if there is one.\n"
        "• Scroll to Discussion — read comments or add your own (sign in required to post).\n"
        "• Vote on the entry if it helped you understand what changed.\n\n"
        "Why I added it:\n"
        "You should be able to ask what something means or tell me a release helped — not just read a wall of text from me."
    ),
}


def _is_messy_detail(text: str) -> bool:
    return bool(
        re.search(r"\bWHERE TO FIND IT\b", text)
        or text.count("Title:") >= 2
        or re.search(r"\bPHASE \d", text)
        or re.search(r"\b(INSERT|UPDATE|DELETE)\b", text)
    )


def _similar(a: str, b: str) -> bool:
    na = re.sub(r"\s+", " ", a.strip().lower())
    nb = re.sub(r"\s+", " ", b.strip().lower())
    if not na or not nb:
        return False
    if na == nb:
        return True
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    return shorter in longer and len(shorter) / len(longer) > 0.82


def build_neighbor_detail(entry: dict, summary: str) -> str:
    """Long neighbor-facing read — always longer and deeper than the collapsed summary."""
    eid = entry["id"]
    source = entry.get("detail") or ""
    min_len = max(900, int(len(summary) * 5))

    if len(source.strip()) > 500:
        parsed = parse_source_sections(source)
        if len(parsed) >= 2:
            sections: list[str] = []
            for title, body in parsed:
                if should_skip_section(title):
                    continue
                sections.append(f"{title}:\n{body}")
            how = how_to_use_section(eid, summary)
            if how:
                sections.append(f"How to use it:\n{how}")
            from_me = narrative_depth(eid, summary)
            if from_me:
                sections.append(f"From me:\n{from_me}")
            detail = scrub_neighbor_detail(clean_copy("\n\n".join(sections)))
            if len(detail) >= min_len:
                return detail

    sections: list[str] = []
    used_titles: set[str] = set()

    parsed = parse_source_sections(source)
    casual = casualize_detail(source) if source else ""

    # Lead with what you'll notice — expand summary, never paste it twice verbatim.
    notice_bits = [summary.rstrip(".") + "."]
    for title, body in parsed:
        if title in ("What you'll notice", "Where to find it"):
            notice_bits.append(body)
    notice = polish_prose("\n\n".join(notice_bits))
    if (
        casual
        and not _similar(casual, summary)
        and len(casual) > len(summary) + 40
        and not _is_messy_detail(casual)
    ):
        if "What you'll notice" not in casual:
            notice = polish_prose(f"{notice}\n\n{casual}")
    sections.append(f"What you'll notice:\n{notice}")
    used_titles.add("What you'll notice")

    for title, body in parsed:
        if should_skip_section(title):
            continue
        if title in used_titles:
            continue
        if title == "How it works" and "How to use it" in used_titles:
            continue
        if _similar(body, summary):
            continue
        sections.append(f"{title}:\n{body}")
        used_titles.add(title)

    how = how_to_use_section(eid, summary)
    if how:
        sections.append(f"How to use it:\n{how}")

    why = why_section(eid, summary)
    if why:
        sections.append(f"Why I changed it:\n{why}")

    from_me = narrative_depth(eid, summary)
    if from_me:
        sections.append(f"From me:\n{from_me}")

    trouble = detail_addon(eid)
    if trouble:
        sections.append(f"If something still looks off:\n{trouble}")

    detail = scrub_neighbor_detail(clean_copy("\n\n".join(sections)))
    min_len = max(900, int(len(summary) * 5))
    if len(detail) < min_len:
        extra_bits: list[str] = []
        if casual and len(casual) > 120 and not _is_messy_detail(casual):
            scrubbed_casual = scrub_neighbor_detail(casual)
            if scrubbed_casual and not _similar(scrubbed_casual, detail):
                extra_bits.append(scrubbed_casual)
        for title, body in parsed:
            if should_skip_section(title):
                continue
            if body not in detail and len(body) > 80:
                extra_bits.append(f"{title}:\n{body}")
        if extra_bits:
            detail = scrub_neighbor_detail(clean_copy(f"{detail}\n\n" + "\n\n".join(extra_bits[:4])))
        if len(detail) < min_len:
            detail = scrub_neighbor_detail(
                clean_copy(
                    f"{detail}\n\n"
                    "What I want you to take away:\n"
                    "This update is live in the app you already have bookmarked or installed on your home screen. "
                    "Pull to refresh or reopen the app if you do not see it immediately. "
                    "When in doubt, comment on this entry — I read neighbor feedback on releases more than almost anything else."
                )
            )

    return detail


def build_detail(entry: dict, casual_body: str) -> str:
    if entry["id"] in DETAIL_OVERRIDES:
        return clean_copy(DETAIL_OVERRIDES[entry["id"]])

    summary = clean_copy(casual_body)
    return build_neighbor_detail(entry, summary)


def fallback_voice(title: str, body: str) -> tuple[str, str]:
    casual_title = polish_title(title)
    casual_body = clean_copy(
        body.replace("Neighbors ", "You ")
        .replace("neighbors ", "you ")
        .replace("The director ", "I ")
    )
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
                "title": polish_title(extra[2]),
                "body": clean_copy(extra[3]),
                "detail": clean_copy(extra[4]) if len(extra) > 4 else None,
            }
        )

    rows = sorted(rows, key=lambda x: (x["date"], x["id"]))

    out: list[str] = [
        "-- =========================================================",
        "-- REWRITE ALL APP UPDATES — Markk's voice (individual entries)",
        "-- Paste into Supabase Dashboard → SQL → New query → Run",
        "--",
        "-- body  = short summary (collapsed card — full text, not truncated in the app)",
        "-- detail = full story (tap to expand — long neighbor-facing write-up from Markeith)",
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
            raw_title, raw_body = VOICE[e["id"]]
            title, body = polish_title(raw_title), clean_copy(raw_body)
        else:
            title, body = fallback_voice(e["title"], e["body"])

        body = scrub_summary(finalize_summary(e["id"], body))
        detail = scrub_neighbor_detail(build_detail(e, body))

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
            f"  {DIRECTOR_NAME_SQL},\n"
            f"  'Buy Nothing Director',\n"
            f"  '{CHANGELOG_AUTHOR_UID}'\n"
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
