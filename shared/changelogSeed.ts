import { CHANGELOG_AUTHOR_UID } from './changelogAuthor';

export interface SeededAppUpdate {
  id: string;
  date: string;
  title: string;
  body: string;
  detail: string;
  directorName: string;
  directorTitle: string;
  postedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeededHelpAnnouncement {
  id: string;
  date: string;
  title: string;
  body: string;
  detail: string;
  authorName: string;
  authorTitle: string;
  postedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

const DIRECTOR_NAME = 'Markeith White';
const DIRECTOR_TITLE = 'Buy Nothing Director';
const PUBLISHED_AT = '2026-07-26T23:20:00.000Z';
const OUTAGE_PUBLISHED_AT = '2026-08-18T08:20:00.000Z';
const OUTAGE_UPDATED_AT = '2026-08-18T12:00:00.000Z';
const MAP_ROUTE_PUBLISHED_AT = '2026-08-18T09:30:00.000Z';
const FOOTER_APK_PUBLISHED_AT = '2026-08-18T09:40:00.000Z';
const LISTINGS_APK_PUBLISHED_AT = '2026-08-18T10:20:00.000Z';
const STAFF_APPLY_PUBLISHED_AT = '2026-08-18T11:05:00.000Z';
const ANDROID_WWW_PUBLISHED_AT = '2026-08-13T18:00:00.000Z';
const SIGNED_APK_PUBLISHED_AT = '2026-07-29T16:00:00.000Z';
const EVENT_SERIES_PUBLISHED_AT = '2026-07-29T18:00:00.000Z';

function update(
  id: string,
  date: string,
  title: string,
  body: string,
  detail: string,
  publishedAt: string = PUBLISHED_AT,
  updatedAt: string = publishedAt,
): SeededAppUpdate {
  return {
    id,
    date,
    title,
    body,
    detail,
    directorName: DIRECTOR_NAME,
    directorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: publishedAt,
    updatedAt,
  };
}

function news(
  id: string,
  date: string,
  title: string,
  body: string,
  detail: string,
  publishedAt: string = PUBLISHED_AT,
  updatedAt: string = publishedAt,
): SeededHelpAnnouncement {
  return {
    id,
    date,
    title,
    body,
    detail,
    authorName: DIRECTOR_NAME,
    authorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: publishedAt,
    updatedAt,
  };
}

/** Latest Update posts — merged with Supabase so neighbors always see current release notes.
 * Seed rows win on id so a deploy ships copy immediately; live-only posts still appear. */
export const SEEDED_APP_UPDATES: SeededAppUpdate[] = [
  update(
    '2026-08-18_staff-apply-broadcast',
    '2026-08-18',
    'Apply for staff — and Broadcast is the new name',
    'Neighbors can apply for staff from Account. Each role is explained. Staff review one request at a time with Yes, Maybe, or No — and you get notified either way. The old Test all users button is now Broadcast.',
    `WHAT NEIGHBORS SEE
Account now has Join the staff team. Read what Moderator, Administrator, Manager, and Director actually do, then apply for one. Tell us how fast you can respond and if you have been a mod elsewhere. Only one application waits at a time.

Yes, Maybe, and No all send you a notification. Maybe lets you apply again. No blocks applying for every staff role.

Staff see one request at a time on Team. The Alerts button that used to say Test all users is now Broadcast.

— Mark

WHERE TO LOOK IN CODE
- src/components/StaffApplyView.tsx — neighbor apply page.
- src/components/staff/StaffApplicationQueue.tsx — Yes / Maybe / No on Team.
- scripts/supabase-migration-aug-18-2026-staff-applications.sql — run this in Supabase.

HISTORY
2026-08-18 — PR #198.`,
    STAFF_APPLY_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_listings-apk-0013',
    '2026-08-18',
    'Stuff listings are back — new APK',
    'Community Stuff was showing 0 listings even when neighbors had posted. That is fixed. Header and tabs stay put; the rest of the page scrolls. Android beta v0.1.0.0013 is on the Download page.',
    `WHAT NEIGHBORS SEE
If Community Stuff said 0 listings / No listings found while the neighborhood actually had posts, that was a timeout on huge camera photos stored inside a few listings. The feed now loads without those photo dumps.

Header stays at the top. Bottom tabs stay at the bottom. Everything else scrolls. Old screens should stop flashing through after a refresh.

New APK: https://www.sacramentobuynothing.com/download (beta v0.1.0.0013). The app you already have still loads the live website, so reopening it picks up the feed fix too.

— Mark

WHERE TO LOOK IN CODE
- src/supabase.ts — light listing columns; skip data:image descriptions.
- src/lib/listingContent.ts — never keep inlined camera dumps in feed/cache.
- src/index.css — listing and neighbor sheets sit between the header and tab bar.
- public/service-worker.js — no HTML/JS/CSS cache of old deploys.
- android/app/build.gradle + public/android-version.json — beta 0.1.0.0013 (versionCode 13).

HISTORY
2026-08-18 — PR #196, then Android beta 0013.`,
    LISTINGS_APK_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_scroll-footer-apk-0012',
    '2026-08-18',
    'Account footer sits at the bottom — new APK',
    'The legal footer on Account and other short pages no longer floats in the middle of the screen. Top and bottom bars stay put. Android beta v0.1.0.0012 is on the Download page.',
    `WHAT NEIGHBORS SEE
On Account, Stuff, Events, and similar pages, the gray legal strip belongs at the bottom of the page. The header and the Stuff / Events / Map / Messages / Account bar stay pinned while you scroll.

New APK: https://www.sacramentobuynothing.com/download (beta v0.1.0.0012). The app you already have still loads the live website, so reopening it picks up this layout too.

— Mark

WHERE TO LOOK IN CODE
- src/components/PageScrollFooter.tsx — ScrollPage is at least as tall as the viewport; the footer is in the document flow.
- src/components/MobileView.tsx — feed, events, and account use that scroll column.
- android/app/build.gradle + public/android-version.json — beta 0.1.0.0012 (versionCode 12).

HISTORY
2026-08-18 — PR #194, then Android beta 0012.`,
    FOOTER_APK_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_map-route-apk-0011',
    '2026-08-18',
    'Map routes and live updates are smoother — new APK',
    'Tapping a listing on the map no longer flashes a frozen route. Live listing updates stay on screen instead of reloading the page. Android beta v0.1.0.0011 is on the Download page.',
    `WHAT NEIGHBORS SEE
If you tapped a pin and the orange driving line blinked, the distance did not change, or you looked stuck on the map — that is fixed. The line and mileage now update when you pick a different listing, and they stay put while you are standing still.

Live posts should also stop making the whole site blink or jump back to a loading screen while you are looking.

New APK: https://www.sacramentobuynothing.com/download (beta v0.1.0.0011). The app you already have still loads the live website, so reopening it picks up the map fix too.

— Mark

WHERE TO LOOK IN CODE
- src/hooks/usePreviewDrivingRoute.ts — keep the last good route; refetch only when the pin or walker actually moved.
- src/components/SacramentoMapView.tsx + MapNavigationView.tsx — no more clear-then-reload splash; delayed WebView GPS is not dropped.
- src/pwa/appUpdateWatcher.ts + src/hooks/useItemsRealtime.ts — apply live data and deploys without a full-page flash.
- android/app/build.gradle + public/android-version.json — beta 0.1.0.0011 (versionCode 11).

HISTORY
2026-08-18 — Merged outage notes (PR #190), quiet live updates (PR #191), and route-glitch fix (PR #192), then shipped Android beta 0011.`,
    MAP_ROUTE_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_login-crash-fix',
    '2026-08-18',
    'Sign-in is fixed — website and app are back',
    'After login, the website and Android app crashed on “Something went wrong.” That bug is fixed. Sign in again and you should land on the map. A new APK is on the Download page.',
    `WHAT NEIGHBORS SEE
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
    OUTAGE_PUBLISHED_AT,
    OUTAGE_UPDATED_AT,
  ),
  update(
    '2026-08-13_android-www-api',
    '2026-08-13',
    'Android app can reach the site again',
    'Some Android installs showed “Failed to fetch” because the app called the apex domain while the WebView is on www. That origin mismatch is fixed — reopen the app and it should load.',
    `WHAT NEIGHBORS SEE
If the Android app could open but listings, sign-in, or buttons failed with “Failed to fetch,” that was a www vs non-www mismatch. Reopen the app. You do not need a new install for the web fix.

Download page: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- src/lib/appOrigin.ts — native WebView uses window.location.origin so /api/* stays on the same host (www).
- src/lib/apkDownload.ts + capacitor.config.ts — canonical origin is https://www.sacramentobuynothing.com (VITE_APP_URL / CAPACITOR_SERVER_URL).
- docs/android-apk.md — build env must use the www origin, not the apex domain.

HISTORY
2026-08-13 — PR #182 (fabb421). Apex redirects to www, but Capacitor server.url is www, so API calls to the apex host were blocked by CSP connect-src 'self'.`,
    ANDROID_WWW_PUBLISHED_AT,
  ),
  update(
    '2026-07-29_repeat-event-series',
    '2026-07-29',
    'Repeat events show as one series',
    'Recurring community events now group into one card on the feed and map. Posters can add upcoming dates to a series they already posted.',
    `WHAT NEIGHBORS SEE
A weekly or monthly gathering is one event series instead of a pile of duplicate cards. Open it to see upcoming dates. Posters can add more dates from the event screen.

— Mark

WHERE TO LOOK IN CODE
- Event series merge in feed/map (repeat event series work from 2026-07-28 / 2026-07-29).
- Posters: EventDetailView → Add dates for an existing series.
- scripts/seed-lucid-fremont-events-2026.sql — Lucid Winery 2026 schedule seed.

HISTORY
2026-07-28 — Add repeat event series + ability to add upcoming dates (PR #171).
2026-07-29 — Merge series into one card in feed and map (cf359a5).`,
    EVENT_SERIES_PUBLISHED_AT,
  ),
  update(
    '2026-07-29_signed-apk-auto-update',
    '2026-07-29',
    'Android download is a signed app — no unsafe warning',
    'The Download page now serves a signed release APK, so Android should stop calling it an unsafe debug build. The installed app can also pick up website fixes without a new install.',
    `WHAT NEIGHBORS SEE
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
    SIGNED_APK_PUBLISHED_AT,
  ),
  update(
    '2026-07-26_android-apk-1-1-0',
    '2026-07-26',
    'Android APK v1.1.0 — download works from the site',
    'The Android download was broken (private GitHub link 404). APK v1.1.0 now lives on the site — open Download and grab it straight from sacramentobuynothing.com.',
    `What you will notice:
• Home and Download show APK + home-screen install options side by side.
• The Download page compares your installed version with the latest APK.
• Sideload file: https://sacramentobuynothing.com/downloads/sac-buy-nothing.apk

How to install:
• Open sacramentobuynothing.com/download (or Home → Download).
• Tap Download APK and allow install from your browser or Files if Android asks.
• Already on an older APK? Install 1.1.0 over it to get the latest build.

This build includes the latest feed, map, Go Get, and staff tools from today.

— Mark`,
  ),
  update(
    '2026-07-26_feed-loading-fix',
    '2026-07-26',
    'Feed no longer sticks on Loading community listings',
    'A few neighbors hit a hang where the feed never finished loading. That path is fixed — listings show even when the network is slow.',
    `What changed:
• Slow Supabase responses no longer leave the feed on a forever spinner.
• Empty vs still-loading states are clearer on mobile and desktop.
• The mobile footer stays pinned while the feed settles.

If you still see a blank feed, pull to refresh once — you should get listings or a clear empty state.

— Mark`,
  ),
  update(
    '2026-07-26_events-unlock-500',
    '2026-07-26',
    'Community events unlock at 500 neighbors',
    'Events open for the whole community at 500 members now (was 1,000). Staff can still post and browse early.',
    `When we hit 500 neighbors, everyone can post and RSVP to free community gatherings. Until then, staff can still create events so we are ready for launch day.

Find Events in the sidebar / tabs, or filter the map to Events once unlocked.

— Mark`,
  ),
  update(
    '2026-07-26_staff-listings-events',
    '2026-07-26',
    'Staff Listings Management shows events + every listing type',
    'Staff Listings Management now loads giveaways, Looking, Trade, and community events together — with filters, cancel/delete for events, and open-event from the panel.',
    `For staff:
• Open Staff → Listings.
• Filter by type (giveaway, looking, trade, event) or status.
• Cancel or delete community events in the same place you moderate posts.
• View an event or listing without leaving the panel.

Neighbors are not affected — this is a moderation tooling update.

— Mark`,
  ),
  update(
    '2026-07-26_staff-goget-escalation',
    '2026-07-26',
    'Staff can manage live Go Get sessions and escalate violations',
    'Meet Records lets staff cancel, expire, dispute, or complete live pickups — and escalate to a violation in one step. The Violations queue defaults to open reports with accused names and review notes.',
    `For staff:
• Staff → Meet Records → open a live session.
• Cancel, expire, dispute, or mark complete when neighbors need help closing a pickup.
• Escalate to violation closes the session and files the report together.
• Linked violations jump into Go Get Violations; the open queue shows pending reports first.

Neighbors:
• Six confirmed strikes can still lock an account; appeals stay under staff review.
• Meet in well-lit public spots and use in-app chat when you can.

— Mark`,
  ),
  update(
    '2026-07-26_shell-download-home',
    '2026-07-26',
    'New shell layout + Download on the home page',
    'Desktop got a real sidebar workspace, tablet an icon rail, and mobile a cleaner staff/community shell. Home now has clear APK and home-screen download buttons.',
    `What you will notice:
• Desktop: sidebar + dashboard rail instead of the old top-only chrome.
• Tablet: permanent icon rail that is not just a skinny desktop.
• Mobile: role-accent header and a clearer path into staff tools when you have them.
• Home hero: Download APK and Add to home screen without hunting through Account.

— Mark`,
  ),
  update(
    '2026-07-26_goget-app-only',
    '2026-07-26',
    'Go Get & pickup coordination — installed app + notifications required',
    'Go Get, Drop off, Meet up, and claim-at-pin now only work in the installed app (APK or Add to Home Screen) with notifications on. Prefer chat-only? Opt out in Account settings.',
    `What changed:
• Pickup coordination needs the installed app — not a regular browser tab.
• Notifications must be enabled so both neighbors get handoff alerts.
• Account → Go Get & pickup coordination lets you opt out anytime.
• Opted out? You still list and message as usual — just without live tracking and handoff prompts.

Install from sacramentobuynothing.com/download, turn on alerts in the bell, and you are set.

— Mark`,
  ),
];

/** Latest News posts — community-facing announcements. */
export const SEEDED_HELP_ANNOUNCEMENTS: SeededHelpAnnouncement[] = [
  news(
    '2026-08-18_staff-apply',
    '2026-08-18',
    'Want to help run the circle? Apply for staff',
    'Account now has a staff application page. Each role is explained. You get notified for Yes, Maybe, or No.',
    `WHAT NEIGHBORS SEE
Open Account → Join the staff team. Pick one role, tell us how you would show up, and send it.

Yes puts you on the team. Maybe lets you apply again. No blocks later applications. You hear either way.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_staff-apply-broadcast.

HISTORY
2026-08-18 — Staff applications.`,
    STAFF_APPLY_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_listings-feed-apk-0013',
    '2026-08-18',
    'Stuff listings and a new Android download',
    'Community Stuff should show real posts again instead of 0 listings. A new APK (beta v0.1.0.0013) is on the Download page.',
    `WHAT NEIGHBORS SEE
If Stuff said nobody had posted, that was a timeout — not an empty neighborhood. Header and tabs stay locked; the rest of the page scrolls.

Download: https://www.sacramentobuynothing.com/download (beta v0.1.0.0013). Reopening the app you already have also picks up the website fix.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_listings-apk-0013.

HISTORY
2026-08-18 — Listing feed restore and Android beta 0013.`,
    LISTINGS_APK_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_footer-apk-0012',
    '2026-08-18',
    'Page footer and a new Android download',
    'The legal footer now sits at the bottom of Account and other short pages, instead of in the middle of the screen. A new APK (beta v0.1.0.0012) is on the Download page.',
    `WHAT NEIGHBORS SEE
Header stays up top. Bottom tabs stay at the bottom. The gray legal strip is at the end of the page.

Download: https://www.sacramentobuynothing.com/download (beta v0.1.0.0012). Reopening the app you already have also picks up the website fix.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_scroll-footer-apk-0012.

HISTORY
2026-08-18 — Scroll footer layout and Android beta 0012.`,
    FOOTER_APK_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_smoother-map-apk',
    '2026-08-18',
    'Smoother map and a new Android download',
    'Tapping a listing on the map should show a real driving distance now, without the line blinking in place. A new APK (beta v0.1.0.0011) is on the Download page.',
    `WHAT NEIGHBORS SEE
If the orange route on the map flashed, the miles stayed the same, or you looked frozen after tapping a pin — that is fixed. Live listings should also stop making the page blink while you are looking.

Download: https://www.sacramentobuynothing.com/download (beta v0.1.0.0011). Reopening the app you already have also picks up the website fix.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_map-route-apk-0011.

HISTORY
2026-08-18 — Map route glitches, live-update flashes, and Android beta 0011.`,
    MAP_ROUTE_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_we-are-back',
    '2026-08-18',
    'We are back — sorry we were down after login',
    'If you signed in today and only saw “Something went wrong,” that was us, not you. The website and app are fixed. Sign in again — you should get the map, feed, and messages.',
    `WHAT NEIGHBORS SEE
Neighbors,

We were down after login on both the website and the Android app. You could reach the public pages and sign in, then the community froze on an error screen. Refreshing did not help because you were still signed in.

That is fixed. Sign in again. If the error screen is still up, tap Sign out first, then sign back in. You do not need a new app install. New APK: https://www.sacramentobuynothing.com/download

I am sorry we were down. Thank you for hanging in — and for giving freely in Sacramento.

— Mark

WHERE TO LOOK IN CODE
Same notes as Update 2026-08-18_login-crash-fix: ChatSystem.tsx hooks import, AppErrorBoundary Sign out, /updates routing, Android 0010, changelog seeds, and scripts/supabase-migration-aug-18-2026-outage.sql.

HISTORY
2026-08-18 — Same outage as the Update post. News is the director announcement in Notifications → News. Update is the product note in Notifications → Updates. Both stay published so neighbors who only check one tab still see we are back.

Root cause: PR #187 removed ChatSystem React hooks. Fix: PR #189.`,
    OUTAGE_PUBLISHED_AT,
    OUTAGE_UPDATED_AT,
  ),
  news(
    '2026-08-13_android-can-load',
    '2026-08-13',
    'Android app talking to the site again',
    'If the Android app opened but nothing would load (“Failed to fetch”), that is fixed. Reopen the app — it should reach the community on www.sacramentobuynothing.com.',
    `WHAT NEIGHBORS SEE
A few Android neighbors could open the app but not load listings or sign in. The app was calling the wrong hostname. That is fixed. Close the app fully and reopen.

Download: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-13_android-www-api (src/lib/appOrigin.ts, www vs apex).

HISTORY
2026-08-13 — PR #182.`,
    ANDROID_WWW_PUBLISHED_AT,
  ),
  news(
    '2026-07-26_apk-download-fixed',
    '2026-07-26',
    'Android app download is fixed — get APK v1.1.0',
    'If the Download button failed before, it is fixed. Grab the Android APK from sacramentobuynothing.com/download — no private GitHub link required.',
    `Steps:
1. Open https://sacramentobuynothing.com/download
2. Tap Download APK
3. Allow install from your browser or Files if Android asks
4. Sign in and turn on notifications if you want pickup alerts

Home-screen install still works for a lighter option. The APK is best if you want stronger background alerts.

Questions? Message staff from Help & support.

— Mark`,
  ),
  news(
    '2026-07-26_goget-staff-watch',
    '2026-07-26',
    'Go Get pickups — staff can step in when a handoff stalls',
    'If a live pickup gets stuck, city moderators can help close the session or escalate a problem into the violation review queue. Same 6-strike safety model as before.',
    `What this means for neighbors:
• Keep using Go Get as usual — confirm, share location when you choose, and finish in-app when you can.
• If something goes wrong (no-show, unsafe behavior, false claim), report it from the Go Get screen.
• Staff may cancel or close a stalled session and file a review when needed.
• Confirmed violations still count toward the six-strike lock; you can appeal.

Stay kind, meet in public when you can, and thank you for keeping Sacramento Buy Nothing safe.

— Mark`,
  ),
  news(
    '2026-07-26_goget-requires-app',
    '2026-07-26',
    'Go Get needs the installed app + notifications',
    'Live pickup coordination only runs in the Android APK or home-screen app with notifications on. You can opt out in Account settings and keep listing + chatting without it.',
    `To use Go Get / Drop off / Meet up:
1. Install from https://sacramentobuynothing.com/download
2. Enable notifications (bell → Notification settings)
3. Keep “Go Get & pickup coordination” on in Account

Prefer to arrange pickups yourself? Turn coordination off in Account — your listings stay up and neighbors can still message you.

— Mark`,
  ),
];

export function mergeByIdNewestFirst<T extends { id: string; date: string; updatedAt?: string }>(
  seeded: T[],
  live: T[],
): T[] {
  const byId = new Map<string, T>();
  // Live-only rows first; seeded ids overwrite so shared/changelogSeed.ts stays canonical.
  for (const row of live) byId.set(row.id, row);
  for (const row of seeded) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
}
