/**
 * Generates supabase-sql/expand-all-community-updates-detail.sql
 * Run: node scripts/expand-changelog-details.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ALL_SQL = fs.readFileSync(path.join(ROOT, 'supabase-sql/all-community-updates.sql'), 'utf8');
const DETAIL_SQL_FILES = [
  'supabase-sql/add-june-9-latest-community-updates.sql',
  'supabase-sql/add-june-10-latest-updates.sql',
];

/** Parse $detail$ blocks from supplemental update SQL files */
function parseSupplementDetails() {
  const map = new Map();
  const re =
    /\(\s*'([^']+)',\s*'[^']+',\s*'[^']+',\s*'[^']*',\s*\$detail\$([\s\S]*?)\$detail\$/g;
  for (const rel of DETAIL_SQL_FILES) {
    const sql = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    let m;
    while ((m = re.exec(sql))) {
      map.set(m[1], m[2].trim());
    }
  }
  return map;
}

/** Parse id, date, title, body from app_updates INSERT only */
function parseAllEntries() {
  const start = ALL_SQL.indexOf('INSERT INTO public.app_updates (');
  const end = ALL_SQL.indexOf('ON CONFLICT (id) DO NOTHING;', start);
  if (start < 0 || end < 0) throw new Error('Could not find app_updates INSERT block');
  const block = ALL_SQL.slice(start, end);

  const entries = [];
  const rowRe =
    /\(\s*'(\d{4}-\d{2}-\d{2}_[^']+)',\s*'(\d{4}-\d{2}-\d{2})',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*(?:NULL|'((?:[^'\\]|\\.)*)')/g;
  let m;
  while ((m = rowRe.exec(block))) {
    entries.push({
      id: m[1],
      date: m[2],
      title: m[3].replace(/\\'/g, "'"),
      body: m[4].replace(/\\'/g, "'"),
      existingDetail: m[5]?.replace(/\\'/g, "'") ?? null,
    });
  }
  return entries;
}

function escSql(s) {
  return s.replace(/'/g, "''");
}

// ─── Detail content keyed by app_updates.id ───────────────────────────────
const RAW_DETAILS = {
  '2026-08-18_login-crash-fix': `WHAT NEIGHBORS SEE
If you signed in this morning and saw “Something went wrong,” that was on us. Sign-in is working again on the website and in the Android app.

You can keep using the same app you already have. Open it again, or refresh the website, then sign in as usual. If the error is still sitting on the screen, tap Sign out, then sign back in. New APK: https://www.sacramentobuynothing.com/download

Sorry for the scare. Thank you for staying with Sacramento Buy Nothing.

— Mark

WHERE TO LOOK IN CODE
- src/components/ChatSystem.tsx — restore the React hooks import (useState, useEffect, useRef, useCallback, useMemo). ChatSystem still mounts after login even when you are on Map or Stuff, so a missing hook name crashes the whole signed-in app.
- src/components/AppErrorBoundary.tsx — Sign out clears the cached session, calls supabase.auth.signOut(), then sends people home. Without that, a crash after login loops because the session is still saved.
- src/App.tsx — /updates, /news, and /announcements keep the Notifications hub instead of being overwritten by the last Map/Events tab.
- src/lib/pushDeepLink.ts — /news, /announcements, and /notifications/updates aliases for the in-app tabs.
- android/app/build.gradle + public/android-version.json — beta 0.1.0.0010 (versionCode 10). Existing Capacitor APKs still load the live site, so reopening the old app also picks up the web fix.
- shared/changelogSeed.ts + complete-schema.sql — this neighbor note and the matching News post. Cron /api/cron/publish-changelog upserts seeds (schedule 40 23 * * *).
- scripts/supabase-migration-aug-18-2026-outage.sql — paste into the Supabase SQL editor if you need the rows immediately instead of waiting for cron.

HISTORY
2026-08-18 — After login, both the website and Android app showed the error screen. Public pages still worked. Login itself succeeded; the crash happened on the first signed-in render. Production JS was index-BHuwUyoa.js after the fix (PR #189, merge 9bedf63). Play review account used to reproduce: playstore-review@sacramentobuynothing.com.

Root cause: PR #187 (commit 7c0e3d0, “Hide Give and Chat for browse-only guests”) replaced the ChatSystem React hooks import with useBrowseOnly and never put the hooks back. Render threw ReferenceError: useState is not defined.

Fix: restore the hooks import, keep useBrowseOnly, add Sign out on the error screen, bump the Android beta to 0010, and post this Update plus News so neighbors see we are back.`,

  '2026-08-13_android-www-api': `WHAT NEIGHBORS SEE
If the Android app could open but listings, sign-in, or buttons failed with “Failed to fetch,” that was a www vs non-www mismatch. Reopen the app. You do not need a new install for the web fix.

Download page: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- src/lib/appOrigin.ts — native WebView uses window.location.origin so /api/* stays on the same host (www).
- src/lib/apkDownload.ts + capacitor.config.ts — canonical origin is https://www.sacramentobuynothing.com (VITE_APP_URL / CAPACITOR_SERVER_URL).
- docs/android-apk.md — build env must use the www origin, not the apex domain.

HISTORY
2026-08-13 — PR #182 (fabb421). Apex redirects to www, but Capacitor server.url is www, so API calls to the apex host were blocked by CSP connect-src 'self'.`,

  '2026-07-29_repeat-event-series': `WHAT NEIGHBORS SEE
A weekly or monthly gathering is one event series instead of a pile of duplicate cards. Open it to see upcoming dates. Posters can add more dates from the event screen.

— Mark

WHERE TO LOOK IN CODE
- Event series merge in feed/map (repeat event series work from 2026-07-28 / 2026-07-29).
- Posters: EventDetailView → Add dates for an existing series.
- scripts/seed-lucid-fremont-events-2026.sql — Lucid Winery 2026 schedule seed.

HISTORY
2026-07-28 — Add repeat event series + ability to add upcoming dates (PR #171).
2026-07-29 — Merge series into one card in feed and map (cf359a5).`,

  '2026-07-29_signed-apk-auto-update': `WHAT NEIGHBORS SEE
Install from https://www.sacramentobuynothing.com/download. Use the signed release APK (not an old debug file). After install, many website fixes arrive the next time you open the app because the APK loads the live site.

— Mark

WHERE TO LOOK IN CODE
- npm run android:apk — signed release via android/keystore.properties.
- public/android-version.json + public/downloads/ — versioned sideload files.
- PWA/APK auto-update splash (86b3732, 2026-07-28).
- Status bar overlap + push-permission reload, build 6 (41f23cc, 2026-07-29).

HISTORY
2026-07-28 — Instant PWA/APK auto-updates and beta version on boot splash.
2026-07-29 — Signed release instead of debug (unsafe Play Protect warning); versioned APK filenames; status bar fix.`,

  '2026-06-09_comment-and-saved-listing-alerts': `WHAT NEIGHBORS SEE
Listing owners get a push when someone comments on their post. Neighbors who bookmark a listing get alerts when that post is edited, commented on, claimed, or changes status (active → pending pickup → completed).

NOTIFICATION TOGGLES — src/components/NotificationSettings.tsx
• Your listings → Comments
• Saved items → edits, comments, claims, status changes

SERVER — api/push/_server/neighborNotify.ts + webhookDispatch.ts
item_comments INSERT → comment push to owner + saved-item bookmarkers.
items UPDATE → listingStatus / saved-item paths with dedup tags.

CLIENT — src/hooks/useSavedItemPushAlerts.ts watches saved listing IDs for changes when app is open.

DATA — saved_items table (synced from local bookmarks via migrateLocalSavedItemsToDb in src/supabase.ts).

SETUP
Each comment is its own alert (not bundled). Toggle Saved items if you only want alerts on bookmarked posts.`,

  '2026-06-09_listing-vote-alerts': `WHAT NEIGHBORS SEE
Optional push when neighbors upvote or downvote your listings — each direction has its own toggle.

TOGGLES — Account → Push notifications → Your listings → Upvotes / Downvotes

SERVER — item_votes INSERT/UPDATE webhook → api/push/_server/neighborNotify.ts
Respects listingUpvotes and listingDownvotes preference keys.

UI — src/components/ListingEngagement.tsx records votes; ItemDetailView shows counts.

WORKS IN BACKGROUND when push is enabled and device subscription is valid (Add to Home Screen on iPhone).`,

  '2026-06-09_saved-bookmarks-sync-online': `WHAT NEIGHBORS SEE
Saving a listing now stores the bookmark in your account online — not only on this phone — so the server can alert you when that post changes.

BEFORE
localStorage key sbn_saved_items_v1 only — server could not notify when app was closed.

AFTER — src/hooks/useSavedItems.ts + src/supabase.ts
syncSavedItemBookmark(userId, itemId, saved) writes saved_items rows.
migrateLocalSavedItemsToDb() on login imports old local bookmarks.

PUSH — src/hooks/useSavedItemPushAlerts.ts + webhooks on items/item_comments/item_claims.

UI — bookmark button on ItemCard.tsx and ItemDetailView.tsx; “Saved” quick pick in ItemGrid.tsx.`,

  '2026-06-09_fewer-duplicate-notifications': `WHAT NEIGHBORS SEE
The same event should not ping your phone twice when both the open app and the server tried to send at once.

FIX — api/push/_server/pushDedup.ts
claimPushDispatch(tag) inserts into push_dispatch_log with UNIQUE(tag) and ~90s window.

TAGS — src/lib/pushEvents.ts aligns client tags with api/push/_server/neighborNotify.ts (msg-{messageId}, etc.).

SUBSCRIBE HARDENING — api/push/_server/pushSubscribe.ts + api/push/resubscribe.ts keep endpoint rows valid after deploys.

SQL
CREATE UNIQUE INDEX IF NOT EXISTS push_dispatch_log_tag_unique ON push_dispatch_log (tag);`,

  '2026-06-09_director-oversight-alerts': `WHAT NEIGHBORS SEE (DIRECTORS)
Eight optional oversight categories in push settings: joins, departures, moderation, reports, tickets, listings, message requests, claim requests.

UI — src/components/NotificationSettings.tsx → Director oversight section

SERVER — api/push/_server/directorNotify.ts + webhookDispatch.ts
users INSERT/DELETE, moderation_audit_log, user_reports, support_tickets, items, message_requests, item_claim_requests.

DEEP LINK — /director/overview → DirectorSiteOverview.tsx

Each category has its own toggle — turn off noise you do not need.`,

  '2026-06-09_push-alerts-in-the-background': `WHAT NEIGHBORS SEE
Notifications reach your phone when Sacramento Buy Nothing is closed — not only while the tab is open.

STACK
• public/service-worker.js — push event + notificationclick → deep link
• Supabase webhooks → api/webhooks/supabase-push → runPushSend
• VAPID keys in Vercel env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

IPHONE
Safari tabs alone do not get background push. Add to Home Screen (iOS 16.4+). InstallPrompt.tsx explains steps.

CLIENT — src/lib/pushNotifications.ts subscribe flow + src/pwa/registerServiceWorker.ts`,

  '2026-06-09_all-notification-toggles': `WHAT NEIGHBORS SEE
Every switch in Account → Push notifications should deliver when enabled — messages, claims, discover, staff inbox, pickup reminders, listing status, support, announcements, and more.

PREFS TABLE — notification_preferences (supabase-sql/notifications-complete.sql)

SERVER MAP — api/push/_server/pushDelivery.ts EVENT_PREF_MAP filters each eventType

WEBHOOKS — supabase-sql/supabase-push-webhook.sql (15 handlers documented)

CRON — api/cron/notification-jobs.ts for listing expiry + pickup reminders

AFTER DEPLOY
Run notifications SQL, confirm webhooks, toggle notifications off → on once per device.`,

  '2026-06-09_feed-renamed-to-stuff': `WHAT NEIGHBORS SEE
The main listings tab label changed from “Feed” to “Stuff” — same free gifts and ISO requests, friendlier name.

COPY — src/siteContent.ts
IN_APP.feedTabLabel = 'Stuff'
IN_APP.feedTitle = 'Community Stuff'

NAV — src/components/MobileView.tsx, TabletView.tsx, Navbar.tsx use IN_APP.feedTabLabel

No database changes — display copy only.`,

  '2026-06-09_updates-live-in-the-database': `WHAT NEIGHBORS SEE
Director changelog entries live in Supabase, not hard-coded. Neighbors read them under Community hub → App updates; director can post, edit, delete.

TABLE — app_updates (supabase-sql/app-updates.sql)
Columns: id, date, title, body, detail, directorName, postedByUserId

UI — src/components/UpdatesList.tsx, AppUpdateEditModal.tsx
API — src/supabase.ts getSupabaseAppUpdates, create/update/delete

PUBLIC — src/components/public/pages/UpdatesPage.tsx (#/updates)

VOTES — community_content_votes targetType 'update'`,

  '2026-06-09_test-push-notifications': `WHAT NEIGHBORS SEE
After enabling push, tap “Send test notification” in Account → Push notifications to confirm this device receives alerts.

ENDPOINT — api/push/test.ts (bypasses preference checks — always sends to your subscription)

CLIENT — src/lib/pushNotifications.ts sendTestPush()

USE THIS to verify VAPID keys and service worker before debugging “real” alerts that depend on prefs + webhooks.`,

  '2026-06-09_each-staff-member-writes-their-own-message': `WHAT NEIGHBORS SEE
Each staff member publishes their own welcome note on home and reviews — not one shared city-manager message.

TABLE — staff_messages (supabase-sql/staff-messages.sql)
PK userId — one row per staff member

UI — src/components/StaffMessage.tsx, PublishedStaffMessages.tsx, LeadershipMessagesCarousel.tsx
HOOKS — useStaffMessage.ts, usePublishedStaffMessages.ts

PERMS — canEditOwnStaffMessage() in src/lib/roles.ts
Director note remains separate in director_message table.`,

  '2026-06-09_vote-on-updates-reviews-team-notes': `WHAT NEIGHBORS SEE
Upvote or downvote changelog entries, neighbor app reviews, and staff/director welcome messages. Update votes go to the director as product feedback.

TABLE — community_content_votes (supabase-sql/community-content-votes.sql)
targetType: update | review | leader_message | announcement

UI — ContentVoteButtons.tsx + useCommunityContentVotes.ts
Used in UpdatesList, CommunityReviews, StaffMessage, DirectorMessage

Cannot vote on your own review. Sign in required.`,

  '2026-06-09_gofundme-footer-improvements': `WHAT NEIGHBORS SEE
GoFundMe strip removed from under the map. On other scrollable pages it sits at the bottom; tap for full cost breakdown.

COMPONENTS — GoFundMeFooter.tsx, PageScrollFooter.tsx, GoFundMeSupport.tsx
PUBLIC PAGE — src/components/public/pages/GoFundMePage.tsx

SIGNED-IN — tap footer opens full-screen GoFundMe panel from App.tsx

COPY — src/siteContent.ts GOFUNDME constants`,

  '2026-06-09_push-notifications': `WHAT NEIGHBORS SEE
Optional browser push for messages, claims, new listings, comments, and more — controlled per account in settings.

TABLES — push_subscriptions, notification_preferences (supabase-sql/push-notifications.sql, notifications-complete.sql)

CLIENT — src/lib/pushNotifications.ts, usePushNotifications.ts, NotificationSettings.tsx
SERVER — api/push/* routes, server/push.ts, public/service-worker.js

Enable in Account → Push notifications. iPhone: Add to Home Screen for background delivery.`,

  '2026-06-09_gofundme-on-its-own-page': `WHAT NEIGHBORS SEE
Full hosting cost breakdown on a dedicated page; every other screen shows a short optional support link at the bottom.

ROUTE — #/gofundme via src/public/routes.ts
PAGE — GoFundMePage.tsx renders GoFundMeSupport.tsx

Explains Vercel, Supabase, domain, and why the app stays free with no ads.`,

  '2026-06-09_updates-reviews-pages': `WHAT NEIGHBORS SEE
Public Updates and Reviews pages for guests and neighbors — changelog oldest→newest, star reviews, director note.

ROUTES — #/updates, #/reviews in src/public/routes.ts
PAGES — UpdatesPage.tsx, ReviewsPage.tsx (public shell PublicSite.tsx)

IN-APP — Community hub tiles mirror same data via UpdatesList and CommunityReviews

Update votes feed back to director.`,

  '2026-06-09_cleaner-feed-filters': `WHAT NEIGHBORS SEE
Filters and sorting moved into one “Filters & sort” panel so the Stuff feed stays easy to scroll.

UI — src/components/ItemGrid.tsx
Single panel: type (give/look), category, neighborhood, status, vote/comment filters, sort order

Mobile-friendly sheet instead of many inline controls.`,

  '2026-06-09_smarter-quick-picks': `WHAT NEIGHBORS SEE
Tap multiple quick filters at once — Trending, Saved, My area, With photos, Needs pickup.

LOGIC — ItemGrid.tsx quickPicks state (multi-select)
Trending = recent activity; Saved = useSavedItems hook; My area = your neighborhood; etc.

Combines with full Filters & sort panel.`,

  '2026-06-09_more-ways-to-browse-the-feed': `WHAT NEIGHBORS SEE
Filter by giving vs looking, category, neighborhood, status, votes, comments. Sort by newest, oldest, or most active.

ENGAGEMENT DATA — useItemsEngagement.ts loads item_votes + item_comments for filter predicates

UI — ItemGrid.tsx filter state persisted in component session

Helps find active ISO requests or popular giveaways quickly.`,

  '2026-06-09_withdrawn-posts-stay-hidden': `WHAT NEIGHBORS SEE
When a neighbor withdraws a listing, it disappears from the community feed and map.

STATUS — items.status = 'withdrawn' (src/types.ts PostStatus)

QUERIES — getSupabaseItems filters active statuses for feed/map
Owner can still see withdrawn posts in profile history where applicable.`,

  '2026-06-09_free-community-events': `WHAT NEIGHBORS SEE
Post free neighborhood gatherings, RSVP (going/maybe/can't go), comment on events. Paid/ticketed events are blocked.

TABLES — community_events, event_rsvps, event_comments (supabase-sql/all-community-updates.sql + supabase-setup.sql)
CHECK constraint isFree = true

UI — EventsView.tsx, EventCard.tsx, EventDetailView.tsx, PostEventModal.tsx
REALTIME — useEventsRealtime.ts, useEventsEngagement.ts`,

  '2026-06-09_a-note-from-your-director': `WHAT NEIGHBORS SEE
Director welcome message on home and reviews — free forever, no ads, your data is not sold.

TABLE — director_message (id 'main')
DEFAULT COPY — src/siteContent.ts DIRECTOR_MESSAGE_DEFAULT

UI — DirectorMessage.tsx, LeadershipMessagesCarousel.tsx
HOOK — useDirectorMessage.ts with realtime sync

Director can edit from Community hub when signed in as director.`,

  '2026-06-09_star-reviews': `WHAT NEIGHBORS SEE
Leave a 0.5–5 star rating and optional text. One review per neighbor; edit anytime.

TABLE — app_reviews (supabase-sql/all-community-updates.sql)
UNIQUE userId

UI — CommunityReviews.tsx (in-app), public ReviewsPage.tsx
VOTES — community_content_votes targetType 'review'`,

  '2026-06-09_support-the-app-optional': `WHAT NEIGHBORS SEE
Optional GoFundMe link explains real monthly costs — app stays 100% free, no ads, no selling data.

COPY — src/siteContent.ts GOFUNDME section
UI — GoFundMeFooter.tsx, GoFundMeSupport.tsx, GoFundMePage.tsx

Never required to participate in the community.`,

  '2026-06-07_save-listings-labor-section': `WHAT NEIGHBORS SEE
Bookmark listings to check later. New Labor categories for community help/skills. Added Old Foothill Farms to neighborhood list.

SAVED — useSavedItems.ts + saved_items sync (see saved-bookmarks update)

LABOR — src/types.ts categories: Labor & Services, Labor & Services Needed, Help / Labor Request
PostItemModal.tsx category picker; map pin colors in SacramentoMapView.tsx

NEIGHBORHOODS — SACRAMENTO_NEIGHBORHOODS in src/types.ts`,

  '2026-06-07_smoother-mobile-home-page': `WHAT NEIGHBORS SEE
Guest home page layout fixed on phones — less horizontal scroll, better spacing before sign-in.

FILES — src/components/public/pages/HomePage.tsx, HomeScrollStage.tsx, public layout CSS in src/index.css

Touch-friendly sections and stats bar alignment on narrow screens.`,

  '2026-06-02_preview-listings-before-joining': `WHAT NEIGHBORS SEE
Guests browse real active listings on the public home page without creating an account first.

COMPONENT — GuestListingPreview.tsx
Read-only cards; tap opens GuestItemDetailView.tsx with sign-in CTA to message

DATA — App.tsx passes visibleItems subset to PublicSite`,

  '2026-06-02_animated-public-home-page': `WHAT NEIGHBORS SEE
Scroll-driven motion on the welcome page — depth layers move at different speeds as you scroll.

COMPONENT — HomeScrollStage.tsx
Used by HomePage.tsx for pre-login marketing experience

Respects reduced-motion where possible via CSS.`,

  '2026-06-02_tap-photos-to-enlarge': `WHAT NEIGHBORS SEE
Tap listing photos to open a full-screen lightbox before messaging the giver.

COMPONENTS — ImageLightbox.tsx, ListingPhotoGallery.tsx
Used in ItemDetailView.tsx and listing cards

Escape or backdrop tap closes overlay.`,

  '2026-06-02_delete-your-account': `WHAT NEIGHBORS SEE
Remove your account and community data when you no longer want to participate.

UI — UserProfileView.tsx delete section
SERVER — deleteOwnAccount() in src/supabase.ts

SQL — supabase-sql/account-deletion.sql (delete_own_account RPC + cascades)

Staff can also delete accounts from StaffModerationPanel.tsx (higher permission).`,

  '2026-06-02_staff-safety-tools': `WHAT NEIGHBORS SEE (STAFF)
Leaders can remove comments, suspend/ban neighbors, delete accounts, and purge data when safety requires it.

PANEL — StaffModerationPanel.tsx
ROLES — src/lib/roles.ts canStaffSuspend, canStaffBan, canStaffDeleteAccount

AUDIT — moderation_audit_log table tracks actions
API — src/supabase.ts staff moderation helpers`,

  '2026-05-31_clearer-claim-hold-buttons': `WHAT NEIGHBORS SEE
Clearer buttons and labels for available, on hold, pending pickup, and claimed states on listings and in chat.

UI — ItemDetailView.tsx status actions, ChatSystem.tsx hold/pending pickup buttons
STATUSES — active | on_hold | pending_pickup | completed | withdrawn

ChatClaimActions.tsx for giveaway claim confirm flow.`,

  '2026-05-29_help-support-tab': `WHAT NEIGHBORS SEE
Dedicated Community hub tab for reports, app updates, announcements, and reviews (support tickets now under Chat).

UI — AccountHelpSection.tsx in CommunityMenuView.tsx
TAB — app tab 'menu' labeled Community (src/siteContent.ts)

Staff moderation panel on same tab for staff roles.`,

  '2026-05-29_support-tickets-with-photos': `WHAT NEIGHBORS SEE
Attach a photo when opening a support ticket so staff can see what you see.

UI — ChatSupportSection.tsx (Chat tab), SupportTicketThread.tsx
STORAGE — upload to Supabase storage; support_ticket_messages.imageUrl column

API — createSupportTicket, addSupportTicketMessage in src/supabase.ts`,

  '2026-05-29_pick-up-several-items-at-once': `WHAT NEIGHBORS SEE
Multi-item giveaways: claim specific subitems or several things in one trip.

TABLES — listing_subitems, item_claims, item_claim_requests
UI — SubItemPicker.tsx, ClaimAtPickupButton.tsx, ChatClaimActions.tsx

MESSAGES — formatSelfClaimRequestMessage in src/lib/claims.ts`,

  '2026-05-29_block-report': `WHAT NEIGHBORS SEE
Block a neighbor (hide their posts/chats) or send a one-way report to staff.

BLOCK — BlockNeighborModal.tsx, user_blocks table, useBlockedUsers.ts
REPORT — ReportNeighborModal.tsx, user_reports table, AccountHelpSection report form

Blocked neighbors cannot DM you; chats hidden via filterChatsByBlocked in src/supabase.ts.`,

  '2026-05-29_staff-moderation-tools': `WHAT NEIGHBORS SEE (STAFF)
Review reports, manage support tickets, view directory, suspend/ban, audit log.

PANEL — StaffModerationPanel.tsx
PERMS — src/lib/roles.ts staff rank system

TABLES — user_reports, support_tickets, moderation_audit_log`,

  '2026-05-29_team-directory': `WHAT NEIGHBORS SEE
See who helps run Sacramento Buy Nothing and their role (moderator, administrator, city manager, director).

UI — staff directory section in StaffModerationPanel.tsx
BADGES — RoleBadge.tsx + roleLabel() from src/lib/roles.ts`,

  '2026-05-29_neighbor-profiles-avatars': `WHAT NEIGHBORS SEE
Tap avatars to open neighbor profiles with photo, neighborhood, bio, and listings.

UI — NeighborProfileView.tsx
Linked from ItemCard, ChatSystem, map pins, comments

Avatars from Google sign-in photoURL or dicebear fallback.`,

  '2026-05-29_message-requests': `WHAT NEIGHBORS SEE
Cold DMs from profiles start as a request — accept or decline before chatting. Listing messages skip the gate.

TABLE — message_requests (status pending|accepted|declined)
UI — ChatSystem incoming requests section, NeighborProfileView send/accept

API — sendMessageRequest, acceptMessageRequest in src/supabase.ts`,

  '2026-05-29_38-sacramento-neighborhoods': `WHAT NEIGHBORS SEE
Pick from 38 Sacramento-area neighborhoods when joining or posting — better local matching.

CONST — SACRAMENTO_NEIGHBORHOODS in src/types.ts
MAP — NEIGHBORHOOD_COORDS for pin placement
PUBLIC — NeighborhoodsPage.tsx lists all areas`,

  '2026-05-29_steadier-sign-in-listings': `WHAT NEIGHBORS SEE
Stay signed in after refresh; listings load reliably once logged in.

AUTH — Supabase auth session in App.tsx
CACHE — readCachedProfile/readCachedItems for faster first paint
FIXES — profile + items fetch retries in src/supabase.ts`,

  '2026-05-29_pinned-mobile-header-nav': `WHAT NEIGHBORS SEE
Top header and bottom tab bar stay fixed while scrolling on phones.

CSS — sbn-mobile-shell, sbn-mobile-header, bottom nav in MobileView.tsx
safe-area insets for notched iPhones`,

  '2026-05-29_live-updates-everywhere': `WHAT NEIGHBORS SEE
New posts, chat messages, votes, ticket replies, and events appear without manual refresh.

HELPER — src/lib/supabaseRealtime.ts subscribePostgresChanges()
USED BY — useItemsRealtime, ChatSystem, useEventsEngagement, usePushNotifications, etc.

Supabase Realtime publication on public tables (supabase-setup.sql).`,

  '2026-05-29_faster-photos': `WHAT NEIGHBORS SEE
Listing photos load faster and upload more smoothly when posting.

CLIENT — src/lib/imageUrl.ts compressImageIfNeeded before upload
STORAGE — Supabase storage buckets for listing images

ListingImage component with lazy-friendly loading.`,

  '2026-05-29_listing-detail-page': `WHAT NEIGHBORS SEE
Tap any post for full photos, description, comments, votes, bookmark, and claim/message actions.

UI — ItemDetailView.tsx + ListingEngagement.tsx
Opened from ItemGrid, map popups, profile listings`,

  '2026-05-29_share-pickup-location-in-chat': `WHAT NEIGHBORS SEE
Listing owner can send porch/meetup address privately in the coordination chat.

BUTTON — ChatSystem.tsx “Send pickup location”
FORMAT — formatPickupLocationMessage() in src/lib/itemLocation.ts
Respects showExactLocation privacy flag on items.`,

  '2026-05-29_real-driving-routes-on-the-map': `WHAT NEIGHBORS SEE
Directions to free gifts use real streets (OSRM) instead of straight lines.

MODULE — src/lib/mapRoute.ts fetchRoute(), openDrivingDirections()
MAP — SacramentoMapView.tsx draws polyline overlay

Falls back to Haversine line if routing API unavailable.`,

  '2026-05-29_edit-your-own-posts': `WHAT NEIGHBORS SEE
Edit your listing title, description, photos, and category before it is claimed.

UI — PostItemModal.tsx in edit mode from ItemDetailView
API — updateSupabaseItem in src/supabase.ts

Saved-item bookmarkers can get push on owner edits (if enabled).`,

  '2026-05-29_community-stats-bar': `WHAT NEIGHBORS SEE
Live counts of neighbors, active posts, items given, and requests fulfilled at top of Stuff feed.

COMPONENT — CommunityStatsBar.tsx
DATA — getCommunityStats() in src/supabase.ts aggregates users/items/claims`,

  '2026-05-29_community-stats-on-public-home': `WHAT NEIGHBORS SEE
Welcome page shows community activity before you join — same stats as in-app bar.

HomePage.tsx embeds CommunityStatsBar (compact variant)
Builds trust for new visitors.`,

  '2026-05-29_role-badges': `WHAT NEIGHBORS SEE
Director and staff roles show on profiles and messages so you know who helps run the app.

COMPONENT — RoleBadge.tsx
LABELS — ROLE_LABELS in src/lib/roles.ts (city_moderator, city_administrator, city_manager, director)`,

  '2026-05-29_director-role-management': `WHAT NEIGHBORS SEE (DIRECTOR)
Director assigns staff roles from neighbor profiles — neighbor → moderator → administrator → manager → director.

UI — role picker on NeighborProfileView / staff tools
API — updateUserRole in src/supabase.ts

Legacy role slugs normalized in normalizeUserRole().`,

  '2026-05-29_public-welcome-site': `WHAT NEIGHBORS SEE
Public pages before sign-in: Home, About, How It Works, Rules, Areas, Community, Updates, Reviews, GoFundMe.

ROUTER — src/components/public/PublicSite.tsx hash routes (#/home, etc.)
CONFIG — src/public/routes.ts

App.tsx shows PublicSite until userProfile exists.`,

  '2026-05-29_fresh-design-system': `WHAT NEIGHBORS SEE
Modern cards, cleaner navigation, light/dark themes, consistent buttons and inputs across the app.

CSS — src/index.css design tokens (--color-accent, sbn-btn, sbn-card, item-feed-card)
ThemeToggle.tsx persists preference

Mobile/tablet/desktop shells share the same visual language.`,

  '2026-05-29_map-opens-first': `WHAT NEIGHBORS SEE
Default tab after sign-in is the neighborhood map so you see gifts near you immediately.

DEFAULT TAB — App.tsx initial tab 'map' (localStorage sbn_active_tab_v1)

SacramentoMapView.tsx with category-colored pins.`,

  '2026-05-29_post-from-the-feed': `WHAT NEIGHBORS SEE
Post button on Stuff feed and events — create giveaway or ISO from any screen size.

FAB / header buttons in MobileView, DesktopView
PostItemModal.tsx, PostEventModal.tsx`,

  '2026-05-29_full-screen-mobile-chat-profile': `WHAT NEIGHBORS SEE
Chat and Account tabs use the full phone screen like Map and Stuff — no cramped nested boxes.

LAYOUT — MobileView.tsx tab panes with min-h-0 flex columns
ChatSystem fullBleed mode`,

  '2026-05-29_tab-history-back-button': `WHAT NEIGHBORS SEE
Android back button and browser back move between app tabs as expected.

HISTORY — App.tsx TAB_HISTORY_KEY sbnTab in window.history state
parseTabFromHistoryState on popstate`,

  '2026-05-29_iso-fulfillment-credits': `WHAT NEIGHBORS SEE
When someone helps fulfill your ISO request, they get “items given” credit and you get “items claimed” credit.

FLOW — ChatSystem “Mark request fulfilled” → markItemFulfilledFromChat() in src/supabase.ts
CLAIM TYPE — request_fulfilled in item_claims

STATS — getNeighborStats() on NeighborProfileView / UserProfileView`,

  '2026-05-29_map-color-index': `WHAT NEIGHBORS SEE
Legend on the map explains pin colors for giveaways, ISO requests, labor, pending pickup, etc.

UI — SacramentoMapView.tsx color guide toggle / index
Category → color mapping in map marker renderer`,

  '2026-05-28_everything-saved-online': `WHAT NEIGHBORS SEE
Posts, profiles, chats, and votes live in Supabase — same community on every device, nothing stuck on one phone.

MIGRATION from early local-only prototypes to cloud-backed app
CORE — src/supabase.ts + supabase-setup.sql schema

Realtime sync across sessions.`,

  '2026-05-20_install-on-your-home-screen': `WHAT NEIGHBORS SEE
Install Sacramento Buy Nothing like an app — icon on home screen, standalone display mode, basic offline shell.

PWA — public/manifest.json, InstallPrompt.tsx, registerServiceWorker.ts
beforeinstallprompt handling on Android/desktop Chrome`,

  '2026-05-20_neighbor-chat': `WHAT NEIGHBORS SEE
Message the person giving something away to arrange porch pickup.

TABLES — chats, messages (two-participant DMs, optional itemId context)
UI — ChatSystem.tsx

Start from listing Message button or accepted profile request.`,

  '2026-05-20_user-roles': `WHAT NEIGHBORS SEE
Staff and director roles so the growing community can be moderated fairly.

ROLES — users.role column, src/lib/roles.ts
Early foundation for StaffModerationPanel and RoleBadge.`,

  '2026-05-20_interactive-sacramento-map': `WHAT NEIGHBORS SEE
Leaflet map with zoom, custom pins per listing type, and driving directions to items.

COMPONENT — SacramentoMapView.tsx (react-leaflet)
ROUTE — src/lib/mapRoute.ts`,

  '2026-05-19_photos-on-listings': `WHAT NEIGHBORS SEE
Upload photos when posting so neighbors know exactly what you are giving or seeking.

STORAGE — Supabase storage upload from PostItemModal.tsx
normalizeItemMedia in src/lib/listingContent.ts`,

  '2026-05-19_neighborhood-map-feed': `WHAT NEIGHBORS SEE
Browse free gifts on a map or scrollable Stuff feed — giveaways (OFFER) and ISO requests.

TABS — map + feed (now Stuff) in app navigation
TYPES — PostType giveaway | looking in src/types.ts`,

  '2026-05-19_sacramento-neighborhood-list': `WHAT NEIGHBORS SEE
Pick your neighborhood at onboarding so posts stay local to your part of Sacramento.

ONBOARDING — Onboarding.tsx neighborhood select
Used for feed filters, map centering, and profile display.`,

  '2026-05-19_works-on-phone-tablet-desktop': `WHAT NEIGHBORS SEE
Layouts adapt to screen size — MobileView, TabletView, DesktopView shells in App.tsx.

Responsive breakpoints at 768px and 1024px
One codebase, three layouts.`,

  '2026-05-19_offline-friendly': `WHAT NEIGHBORS SEE
Basic browsing survives brief connection drops — cached profile/items and service worker shell.

readCachedProfile, readCachedItems in App.tsx initial state
Service worker caches static assets.`,

  '2026-05-19_orange-sage-branding': `WHAT NEIGHBORS SEE
Warm orange + sage community palette and Sacramento Buy Nothing logo — local feel, not a generic template.

ASSETS — public/Logo.jpeg, CSS variables in src/index.css
siteContent.ts SITE branding copy`,

  '2026-05-19_sacramento-buy-nothing-launches': `WHAT NEIGHBORS SEE
Sacramento Buy Nothing goes live — free local gifting, no selling, no bidding, neighbors helping neighbors.

VISION — src/siteContent.ts ABOUT, RULES, HOW_IT_WORKS
100% free rule enforced in post flows and moderation.

Launch date: May 19, 2026.`,

  '2026-05-20_hooked-up-to-a-real-database': `WHAT NEIGHBORS SEE
Posts and accounts persist in Supabase — neighbors see the same listings every visit.

CLIENT — @supabase/supabase-js in src/supabase.ts
SCHEMA — supabase-setup.sql (users, items, chats, messages, …)

Replaced demo/local-only data store.`,

  '2026-05-20_full-screen-mobile-layout': `WHAT NEIGHBORS SEE
Map, Stuff, Chat, and Profile each fill the phone — no double scroll containers.

Mobile shell refactor — sbn-mobile-shell CSS, flex min-h-0 children
Foundation for modern mobile UX.`,

  '2026-05-20_mobile-first-desktop-unchanged': `WHAT NEIGHBORS SEE
Phone experience rebuilt for touch-first use while desktop neighbors keep the wider layout they already used.

Parallel MobileView vs DesktopView components
Shared business logic in hooks + supabase.ts.`,

  '2026-05-19_the-community-vision': `WHAT NEIGHBORS SEE
Written mission: free gifting, local neighbors, reduce waste, no money ever.

CONTENT — src/siteContent.ts SITE, ABOUT, RULES, principles array
Shown on public About and Rules pages.`,

  '2026-05-19_where-it-all-started': `WHAT NEIGHBORS SEE
First build session — May 19, 2026 — web app for Sacramento neighbors to give freely and ask kindly.

Origin changelog entry documenting project start
Stack: React + Vite + Supabase + Vercel.`,
};

const DETAILS = Object.fromEntries(
  Object.entries(RAW_DETAILS).map(([k, v]) => [k, v.trim()]),
);

/** Fallback if an entry is missing from both June 9 SQL and RAW_DETAILS */
function detailForEntry(entry) {
  const { title, body, date } = entry;
  const D = DETAILS[entry.id];
  if (D) return D;

  return `WHAT NEIGHBORS SEE
${body}

WHAT WE BUILT
${title} — part of the Sacramento Buy Nothing community app at sacramentobuynothing.com.

WHERE TO LOOK IN CODE
Search the repo for keywords from this update title, or browse src/components/, src/supabase.ts, and supabase-sql/ for related tables and UI.

HISTORY
This entry documents shipped work on ${date}. Tap to expand anytime for the full story behind the summary above.`;
}

// ─── Generate SQL ─────────────────────────────────────────────────────────

const supplementDetails = parseSupplementDetails();
const entries = parseAllEntries();

const lines = [
  '-- =========================================================',
  '-- EXPAND ALL COMMUNITY UPDATES — full detail for every row',
  '-- Run once in Supabase SQL Editor.',
  '-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.',
  '-- Generated by: node scripts/expand-changelog-details.mjs',
  '-- =========================================================',
  '',
  'INSERT INTO public.app_updates (',
  '  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"',
  ') VALUES',
];

const valueRows = entries.map((entry, i) => {
  const detail =
    supplementDetails.get(entry.id) ??
    DETAILS[entry.id] ??
    detailForEntry(entry);
  const detailSql = `$detail$${detail}$detail$`;
  const comma = i < entries.length - 1 ? ',' : '';
  return `(
  '${escSql(entry.id)}',
  '${escSql(entry.date)}',
  '${escSql(entry.title)}',
  '${escSql(entry.body)}',
  ${detailSql},
  'Markeith White',
  'Buy Nothing Director',
  'director'
)${comma}`;
});

lines.push(...valueRows);
lines.push(
  '',
  'ON CONFLICT (id) DO UPDATE SET',
  '  date = EXCLUDED.date,',
  '  title = EXCLUDED.title,',
  '  body = EXCLUDED.body,',
  '  detail = EXCLUDED.detail,',
  '  "updatedAt" = NOW();',
  '',
);

const outPath = path.join(ROOT, 'supabase-sql/expand-all-community-updates-detail.sql');
fs.writeFileSync(outPath, lines.join('\n'));

const missing = entries.filter((e) => !supplementDetails.has(e.id) && !DETAILS[e.id]);
console.log(`Wrote ${entries.length} entries to ${outPath}`);
console.log(`Supplement file overrides: ${supplementDetails.size}`);
console.log(`Hand-authored overrides: ${Object.keys(DETAILS).length}`);
if (missing.length) {
  console.log(`Fallback template used for ${missing.length} entries (still structured).`);
}
