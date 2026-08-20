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
const STAFF_APPLY_APK_PUBLISHED_AT = '2026-08-18T11:45:00.000Z';
const STAFF_SEAT_FILLED_PUBLISHED_AT = '2026-08-18T11:55:00.000Z';
const FEED_HIDE_COMPLETED_PUBLISHED_AT = '2026-08-18T12:10:00.000Z';
const FEED_APK_PUBLISHED_AT = '2026-08-18T12:15:00.000Z';
const APK_0015_ANNOUNCE_PUBLISHED_AT = '2026-08-18T12:20:00.000Z';
const FEED_SWITCHES_APK_PUBLISHED_AT = '2026-08-18T13:10:00.000Z';
const APK_0017_PUBLISHED_AT = '2026-08-18T13:30:00.000Z';
const APK_0018_PUBLISHED_AT = '2026-08-18T14:00:00.000Z';
const APK_0019_PUBLISHED_AT = '2026-08-18T14:15:00.000Z';
const LISTING_PHOTOS_URGE_PUBLISHED_AT = '2026-08-18T14:30:00.000Z';
const APK_0020_PUBLISHED_AT = '2026-08-18T21:35:00.000Z';
const PHOTO_UPLOAD_FIX_PUBLISHED_AT = '2026-08-20T03:30:00.000Z';
const APK_0022_PUBLISHED_AT = '2026-08-20T03:35:00.000Z';
const APK_0023_PUBLISHED_AT = '2026-08-20T07:30:00.000Z';
const EVENT_RECURRENCE_PUBLISHED_AT = '2026-08-20T07:45:00.000Z';
const APK_0024_PUBLISHED_AT = '2026-08-20T08:00:00.000Z';
const APK_0026_PUBLISHED_AT = '2026-08-20T09:30:00.000Z';
const APK_0027_PUBLISHED_AT = '2026-08-20T09:45:00.000Z';
const APK_0028_PUBLISHED_AT = '2026-08-20T10:20:00.000Z';
const APK_0029_PUBLISHED_AT = '2026-08-20T10:40:00.000Z';
const APK_0030_PUBLISHED_AT = '2026-08-20T11:05:00.000Z';
const APK_0031_PUBLISHED_AT = '2026-08-20T13:10:00.000Z';
const APK_0032_PUBLISHED_AT = '2026-08-20T13:28:00.000Z';
const APK_0034_PUBLISHED_AT = '2026-08-20T14:10:00.000Z';
const APK_0035_PUBLISHED_AT = '2026-08-20T14:55:00.000Z';
const APK_0036_PUBLISHED_AT = '2026-08-20T15:40:00.000Z';
const APK_0037_PUBLISHED_AT = '2026-08-20T16:10:00.000Z';
const APK_0038_PUBLISHED_AT = '2026-08-20T16:35:00.000Z';
const APK_0033_PUBLISHED_AT = '2026-08-20T13:32:00.000Z';
const FEED_GRID_UI_PUBLISHED_AT = '2026-08-20T10:15:00.000Z';
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

/** Latest Update posts — product changes only (no Android release/download posts; those live in News). */
export const SEEDED_APP_UPDATES: SeededAppUpdate[] = [
  update(
    '2026-08-20_apk-0038',
    '2026-08-20',
    'New Android download — beta v0.1.0.0038',
    'Feed & Chat style parity with Stuff/Events, legal footer below the fold, compact Looking tags on grid.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0038 (versionCode 38).

Since 0037:
• Feed & Chat — same toolbar/card style as Stuff and Events
• Legal footer (privacy/terms) only appears when you scroll down on short pages
• Stuff grid — type badges say "Looking" in a compact pill (not huge "Looking for")

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0038.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 38
- play-store-assets/release-notes-v0.1.0-0038.txt
- src/components/FeedView.tsx, ChatInboxHeader.tsx — page style parity
- src/components/PageScrollFooter.tsx — footer below fold
- src/lib/postType.ts — getPostTypeGridBadgeLabel

HISTORY
2026-08-20 — /runit release (PR #275); Android beta 0038 built.`,
    APK_0038_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0037',
    '2026-08-20',
    'New Android download — beta v0.1.0.0037',
    'Live neighbor Feed, Chat makeover, map route zoom-to-fit, lower map controls.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0037 (versionCode 37).

Since 0036:
• Neighbor Feed — posts (text/photos), nested comments, emoji reactions, votes, report/delete
• Chat tab (was Messages) — messenger-style inbox header and bubbles
• Map — route line zooms to fit when you select a listing; GPS/+ buttons sit lower
• Square Map button centered in footer

Supabase: run scripts/supabase-migration-aug-20-2026-neighbor-feed.sql for Feed tables.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0037.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 37
- play-store-assets/release-notes-v0.1.0-0037.txt
- src/components/FeedView.tsx — live neighbor feed
- src/components/SacramentoMapView.tsx — route fit + control placement

HISTORY
2026-08-20 — /runit release; Android beta 0037 built.`,
    APK_0037_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0036',
    '2026-08-20',
    'New Android download — beta v0.1.0.0036',
    'Feed tab shell, Stuff listings split, account in header, 5-tab footer, orange Looking/Trade badges.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0036 (versionCode 36).

Since 0035:
• Feed tab placeholder (neighbor wall coming soon); Stuff tab = listings grid
• Header: logo, bell (badges inside), profile avatar for account/settings
• Footer: Feed | Stuff | Map | Events | Messages
• Bell panel — no duplicate Notifications title bar
• Looking for and Trade tags use orange shades like Giving

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0036.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 36
- play-store-assets/release-notes-v0.1.0-0036.txt
- src/lib/appTabs.ts — feed/stuff tab split
- src/components/FeedView.tsx — community feed placeholder

HISTORY
2026-08-20 — /runit release merging open PRs; Android beta 0036 built.`,
    APK_0036_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0035',
    '2026-08-20',
    'New Android download — beta v0.1.0.0035',
    'Events toolbar + scoped New modals, filter master toggles, Everything/Giving/Looking/Trading, News vs Updates split.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0035 (versionCode 35).

Since 0034:
• Events page toolbar — New, Nearest/Newest, All/Upcoming/Past, filters, grid/list
• New on Map opens Stuff or Event; Stuff feed = stuff only; Events feed = event only
• Filter drawer master toggles expand/collapse each group
• Feed type cycle: Everything / Giving / Looking / Trading (before Nearest/Newest)
• News tab = releases + director posts; Updates tab = product changes only

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0035.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 35
- play-store-assets/release-notes-v0.1.0-0035.txt
- src/components/CollapsibleFilterSection.tsx — master filter toggles
- src/components/EventsView.tsx — events toolbar

HISTORY
2026-08-20 — /runit release merging PRs #266, #269, #270; Android beta 0035 built.`,
    APK_0035_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0034',
    '2026-08-20',
    'New Android download — beta v0.1.0.0034',
    'Map + New for Stuff or Events; DMs compose back; 30-day listing expiry.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0034 (versionCode 34).

Since 0033:
• Map + New — post Stuff or Events with GPS pin
• Messages compose and message requests restored
• Listings expire after 30 days

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0034.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 34
- play-store-assets/release-notes-v0.1.0-0034.txt
- src/components/NewListingModal.tsx — Stuff/Event toggle

HISTORY
2026-08-20 — /runit release merging PRs #258–#262; Android beta 0034 built.`,
    APK_0034_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0033',
    '2026-08-20',
    'New Android download — beta v0.1.0.0033',
    'Staff mode box title follows the toggle; location permission switch now shows Allowed when GPS works.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0033 (versionCode 33).

Since 0032:
• Staff mode settings card title switches between Staff mode and User mode
• Location permission toggle correctly shows Allowed after GPS is granted on Android

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0033.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 33
- play-store-assets/release-notes-v0.1.0-0033.txt

HISTORY
2026-08-20 — /runit release merging PRs #256–#257; Android beta 0033 built.`,
    APK_0033_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0032',
    '2026-08-20',
    'New Android download — beta v0.1.0.0032',
    'Staff/User mode now gates staff notifications; listing and event detail headers scroll with the page.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0032 (versionCode 32).

Since 0031:
• Staff/User mode switch also controls staff and director push alerts
• Listing and event detail toolbars scroll with content — no pinned header or bottom Back button

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0032.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 32
- play-store-assets/release-notes-v0.1.0-0032.txt

HISTORY
2026-08-20 — /runit release merging PRs #254–#255; Android beta 0032 built.`,
    APK_0032_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0031',
    '2026-08-20',
    'New Android download — beta v0.1.0.0031',
    'Launcher icon fix plus nav banner pinned to top, chat listing/event previews, profile stats layout, and listing type badges.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0031 (versionCode 31).

Since 0030:
• Nav banner stays pinned to the top; map camera keeps you centered
• Coordination chats show the listing or event preview at the top
• Profile stats: three cards on top, two below
• Listing cards show only the type badge (Given / Looking / Trade)
• Listing detail header scrolls correctly

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0031.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 31
- play-store-assets/release-notes-v0.1.0-0031.txt

HISTORY
2026-08-20 — /runit release merging PRs #245–#252; Android beta 0031 built.`,
    APK_0031_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0030',
    '2026-08-20',
    'New Android download — beta v0.1.0.0030',
    'Launcher icon now matches the PWA — full-bleed orange with no white ring around the edges.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0030 (versionCode 30).

Since 0029:
• Home-screen launcher icon is full-bleed orange like the PWA — no white ring around the artwork

Already on 0029? Reopening the app still loads the live site for web fixes, but install 0030 for the corrected launcher icon.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0030.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 30
- scripts/generate-android-assets.mjs — full-bleed launcher icon generation
- play-store-assets/release-notes-v0.1.0-0030.txt

HISTORY
2026-08-20 — Android launcher icon white-edge fix (PR #246); Android beta 0030 built.`,
    APK_0030_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0029',
    '2026-08-20',
    'New Android download — beta v0.1.0.0029',
    'Turn-by-turn navigation now has heading-up, real lanes, walk/bike/drive, and voice that reads the same details as the screen.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0029 (versionCode 29).

Since 0028:
• Heading-up map that follows you, with a Compass heading you can trust
• Real lane guidance from the road data — not a fake two-lane guess
• Walk, bike, or drive: walking and biking ignore car one-ways
• Voice reads the same turn, distance, street, then-next, and lanes as the banner
• Recenter announces the next turn
• Navigation settings in Account and the in-nav gear (theme follows the app)

Android app only: in-app Navigate and Go Get. Website stays message + mark.

Already on an older install? Reopening the app still loads the live site for web fixes, but install 0029 for the latest native shell.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0029.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 29
- src/components/MapNavigationView.tsx — banner + voice share one instruction card
- play-store-assets/release-notes-v0.1.0-0029.txt

HISTORY
2026-08-20 — Navigation rework merged (PR #240); Android beta 0029 built.`,
    APK_0029_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0028',
    '2026-08-20',
    'New Android download — beta v0.1.0.0028',
    'App-style feed and events: default photo grid, collapsible filters, and a cleaner Messages inbox.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0028 (versionCode 28).

Since 0027:
• Community Stuff opens in photo grid view by default
• Filters hide behind one button; tap Nearest first to switch to Newest
• Events tab matches Stuff — grid/list toggle, filters, compact tiles
• Messages inbox drops the duplicate title block
• Listing cards show Given / Looking / Trade under votes

Already on an older install? Reopening the app still loads the live site for web fixes, but install 0028 for the latest native shell.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0028.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 28
- src/components/ItemGrid.tsx + EventsView.tsx — grid/list toolbar and filters
- play-store-assets/release-notes-v0.1.0-0028.txt

HISTORY
2026-08-20 — Feed grid UI polish merged (PR #239); Android beta 0028 built.`,
    APK_0028_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_feed-grid-ui',
    '2026-08-20',
    'Cleaner app-style feed and events',
    'Photo grid by default, filters behind one button, and Events matches Stuff.',
    `WHAT NEIGHBORS SEE
Community Stuff and Events now feel more like a native app:

• Photo grid is the default view — list view is one tap away
• Filters stay hidden until you tap Filters
• In grid view, tap Nearest first to switch to Newest
• Events has the same toolbar and compact photo tiles
• Messages no longer repeats the page title inside the inbox
• Listing cards show Given / Looking / Trade in a row under votes

Reopen the app or refresh the website to pick this up — no install required for web-only neighbors.

— Mark

WHERE TO LOOK IN CODE
- src/components/ItemGrid.tsx, EventsView.tsx, ChatInboxHeader.tsx, ItemCard.tsx

HISTORY
2026-08-20 — PR #239.`,
    FEED_GRID_UI_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0027',
    '2026-08-20',
    'New Android download — beta v0.1.0.0027',
    'Same app features as 0026, plus a fix so navigation and Go Get stay Android-only (website is message + mark).',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0027 (versionCode 27).

Since 0026:
• Navigation and Go Get gated to the Android app only — website stays message + mark

Android app only (unchanged from 0026):
• Staff Navigate on Stuff and Events
• Go Get ring + pickup availability (opt-in in Account)
• List/grid feed toggle

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0027.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 27
- src/lib/goGetCoordinationGating.ts — supportsInAppNavigation()
- play-store-assets/release-notes-v0.1.0-0027.txt

HISTORY
2026-08-20 — Native-only navigation gating; Android beta 0027 for Play upload after 0026.`,
    APK_0027_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0026',
    '2026-08-20',
    'New Android download — beta v0.1.0.0026',
    'Android app: Staff Navigate, Go Get ring, list/grid feed. Website stays message + mark only.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0026 (versionCode 26).

Android app only:
• Staff Navigate on Stuff and Events
• Go Get ring + pickup availability (coordination opt-in in Account)
• List/grid feed toggle

Website (browser): message neighbors and mark listings — no in-app navigation or Go Get.

Already on an older install? Reopening the app still loads the live site for web fixes, but install 0026 for the latest native shell.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0026.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 26
- play-store-assets/release-notes-v0.1.0-0026.txt — Play Console release notes
- Merged PRs #237–#238, #223–#222, #229, #188, #221 (changelog), partial #157

HISTORY
2026-08-20 — Merged open PR stack; Android beta 0026 built.`,
    APK_0026_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0024',
    '2026-08-20',
    'New Android download — beta v0.1.0.0024',
    'Event posters can schedule repeats by month day, weekday position, or weekly — plus Laundry Love and City of Refuge community events.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0024 (versionCode 24).

Since 0023:
• Post Event → Repeat on a schedule: month days (4th, 20th), weekday of month (4th Saturday), or every week (Thursday)
• Live preview shows how many dates will be created before you post
• Laundry Love (4th Saturdays) and City of Refuge (Thursdays) community resource events added

Already on an older install? Reopening the app still loads the live site for web fixes, but install 0024 for the latest native shell.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0024.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 24
- src/lib/eventRecurrence.ts + src/components/EventRecurrenceEditor.tsx — schedule builder
- scripts/seed-laundry-love-city-of-refuge-events-2026.sql — flyer event seeds
- play-store-assets/release-notes-v0.1.0-0024.txt — Play Console release notes

HISTORY
2026-08-20 — Event recurrence + community resource seeds merged with staff mode (PR #234), Android beta 0024 built.`,
    APK_0024_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_event-recurrence-scheduling',
    '2026-08-20',
    'Schedule repeat events by month day or weekday',
    'When posting a free event, turn on Repeat on a schedule to auto-fill dates — every 4th and 20th, every 4th Saturday, every Thursday, and more.',
    `WHAT NEIGHBORS SEE
Posting a community event? Under Repeat on a schedule you can now:

• Pick days of the month (e.g. 4th and 20th every month)
• Pick weekday positions (e.g. 4th Saturday, or 1st/2nd/3rd Monday)
• Pick weekly days (e.g. every Thursday)
• Combine multiple rules and preview the dates before posting

Same place, same time — neighbors still RSVP per day.

New community resource events from flyers:
• Laundry Love — 4th Saturdays at Stockridge Launderland (City Church of Sacramento)
• City of Refuge — Thursdays, free showers, laundry, and meals

— Mark

WHERE TO LOOK IN CODE
- src/lib/eventRecurrence.ts — date generation
- src/components/EventRecurrenceEditor.tsx + PostEventModal.tsx — UI
- scripts/seed-laundry-love-city-of-refuge-events-2026.sql

HISTORY
2026-08-20 — PR #234.`,
    EVENT_RECURRENCE_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0023',
    '2026-08-20',
    'New Android download — beta v0.1.0.0023',
    'Staff can now switch between Staff mode and Neighbor mode in Account settings — participate officially or like a regular neighbor.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0023 (versionCode 23).

Since 0022:
• Account → Staff participation mode: Staff mode vs Neighbor mode
• Staff mode: comments show your title, Staff chat on listings/events, no private neighbor DMs or Go Get
• Neighbor mode: message, navigate, claim, and Go Get like any neighbor; comments post without staff badge
• Moderation sidebar and staff tools stay available in both modes

Already on an older install? Reopening the app still loads the live site for web fixes, but install 0023 for the latest native shell.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0023.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- src/components/StaffModeSettings.tsx — Account settings toggle
- src/lib/staffInteractionMode.ts — staff vs neighbor acting helpers
- scripts/supabase-migration-aug-20-2026-staff-interaction-mode.sql — DB columns
- android/app/build.gradle — versionCode 23
- play-store-assets/release-notes-v0.1.0-0023.txt — Play Console release notes

HISTORY
2026-08-20 — Staff participation mode toggle shipped in web + Android beta 0023.`,
    APK_0023_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_apk-0022',
    '2026-08-20',
    'New Android download — beta v0.1.0.0022',
    'Photo uploads when posting are fixed on Android. Grab the new Play Store bundle or sideload APK if you install outside Google Play.',
    `WHAT NEIGHBORS SEE
Play Store testers and sideload installs: beta v0.1.0.0022 (versionCode 22).

Since 0021:
• Photo uploads work when posting listings, events, and profile photos
• Android gallery picks no longer fail on missing file types
• Report and support ticket screenshots upload reliably
• Download page points neighbors to Google Play first

Already on an older install? Reopening the app still loads the live site for web fixes, but install 0022 for the latest native shell.

Play Console upload: public/downloads/sac-buy-nothing-beta-v0.1.0.0022.aab
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- android/app/build.gradle — versionCode 22
- play-store-assets/release-notes-v0.1.0-0022.txt — Play Console release notes
- src/supabase.ts + src/lib/imageUrl.ts — photo upload fix (PR #232)

HISTORY
2026-08-20 — Photo upload fix merged (PR #232), then Android beta 0022 AAB built for Play Console.`,
    APK_0022_PUBLISHED_AT,
  ),
  update(
    '2026-08-20_photo-upload-fix',
    '2026-08-20',
    'Photo uploads work again on Android and the website',
    'Posting a listing with photos failed for some neighbors on the Play Store app and website. That is fixed — reopen the app and try adding photos when you post.',
    `WHAT NEIGHBORS SEE
If you could sign in but got "Could not upload photos" when posting a giveaway, event, or profile photo, that is fixed now.

Reopen the Sacramento Buy Nothing app or refresh the website, then try posting with photos again. You do not need a new install from the Play Store — the app loads the live site.

This also fixes screenshot uploads on reports and support tickets.

— Mark

WHERE TO LOOK IN CODE
- src/supabase.ts — listing, event, profile, report, and ticket uploads now use auth-scoped storage paths ({userId}/...).
- src/lib/imageUrl.ts — Android gallery picks with missing MIME types are accepted by file extension.
- scripts/verify-photo-upload-paths.mjs — static audit for all eight upload surfaces.

HISTORY
2026-08-20 — PR #232. Storage RLS required user-scoped paths; uploads used flat filenames. Android WebView often omits image MIME types from gallery picks.`,
    PHOTO_UPLOAD_FIX_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_apk-0020',
    '2026-08-18',
    'New Android download — beta v0.1.0.0020',
    'Staff overview adds Events, Downloads, and Installs. Staff accounts now use support threads instead of neighbor pickup/DM flows, with safety prompts on sensitive chats.',
    `WHAT NEIGHBORS SEE
Grab beta v0.1.0.0020 from https://www.sacramentobuynothing.com/download

Since 0019:
• Staff Console overview pairs Events with Listings and tracks unique APK/AAB downloads and app installs
• Staff on listings/events: upvote, comment with staff badge, staff actions — no navigate, go get, pickup, or private DM
• Staff Message opens a shared support thread with a clickable listing/event preview at the top
• Confirmations before staff open outreach or neighbor coordination chats
• Feed listing photos fixed for legacy image storage

Already on 0019? Reopening the app still loads the live site, but install 0020 for the latest native shell.

— Mark

WHERE TO LOOK IN CODE
- src/components/DirectorSiteOverview.tsx — overview metrics grid
- src/lib/staffChatSafety.ts + StaffListingActions / StaffEventActions
- scripts/supabase-migration-aug-18-2026-app-device-stats.sql
- scripts/supabase-migration-aug-18-2026-staff-outreach-tickets.sql
- android/app/build.gradle — versionCode 20

HISTORY
2026-08-18 — APK 0020 ships staff overview + staff neighbor-action restrictions.`,
    APK_0020_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_listing-feed-photos',
    '2026-08-18',
    'Listing photos load again on the feed',
    'Older posts that stored camera data inside the listing could show a gray box instead of a photo. That is fixed for most listings. When you post or edit, add a picture so neighbors can see what you are sharing.',
    `WHAT NEIGHBORS SEE
Some Community Stuff cards showed a gray tag instead of a photo — including older giveaways and requests, not just today’s posts.

We fixed how the feed reads photo URLs from legacy listings. Many thumbnails are back without you doing anything.

If a listing of yours still has no photo:
• Open it → Edit → Add photo → Save.

Going forward, please add at least one photo when you post. It helps neighbors decide faster and keeps the feed healthy for everyone.

— Mark

WHERE TO LOOK IN CODE
- scripts/supabase-migration-aug-18-2026-listing-feed-image-urls.sql — item_feed_image_url_map() RPC + imageUrl backfill.
- src/supabase.ts — feed calls the RPC with a short cache.
- src/lib/listingContent.ts — [PHOTOS:] extraction from long descriptions.
- src/components/ListingImage.tsx + ItemCard.tsx — fallback chain and gray placeholder on failure.

HISTORY
2026-08-18 — Feed photo recovery (PR #220) + director note in News.`,
    LISTING_PHOTOS_URGE_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_apk-0019',
    '2026-08-18',
    'New Android download — beta v0.1.0.0019',
    'Account download buttons work in-app, mobile download page fits better, and new toggles for notification + location permissions on Account.',
    `WHAT NEIGHBORS SEE
Grab beta v0.1.0.0019 from https://www.sacramentobuynothing.com/download

Since 0018:
• Account → Install app opens the in-app download page (Back to app works)
• Direct Download latest APK button on Account
• Device permissions toggles for Notifications and Location
• Download page fits mobile screens with safe-area padding

Already on 0018? Reopening the app still loads the live site, but install 0019 for the latest native shell.

— Mark

WHERE TO LOOK IN CODE
- src/components/SystemPermissionsSettings.tsx + src/lib/systemPermissions.ts
- src/components/UserProfileView.tsx — Account download + permissions
- android/app/build.gradle — versionCode 19

HISTORY
2026-08-18 — APK 0019 ships Account download fix + permission toggles.`,
    APK_0019_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_apk-0018',
    '2026-08-18',
    'New Android download — beta v0.1.0.0018',
    'Staff sidebar slides in smoothly, mobile headers now show theme + notifications + badges for everyone, and nav labels fit inside the drawer.',
    `WHAT NEIGHBORS SEE
Grab beta v0.1.0.0018 from https://www.sacramentobuynothing.com/download

Since 0017:
• Staff mobile sidebar slides in/out instead of popping open
• Long staff nav labels (like Go Get Violations) wrap cleanly inside the drawer
• Every mobile user gets theme, notifications, and badges in the header — not just staff
• Staff drawer header stays clean (avatar, role pill, close) while the top bar hides behind the menu

Already on 0017? Reopening the app still loads the live site, but install 0018 for the latest native shell.

— Mark

WHERE TO LOOK IN CODE
- src/components/AppSidebar.tsx + src/index.css — slide drawer animation
- src/components/TopbarActions.tsx + MobileView.tsx — unified mobile header actions
- android/app/build.gradle — versionCode 18

HISTORY
2026-08-18 — APK 0018 ships staff sidebar slide + unified mobile header actions.`,
    APK_0018_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_apk-0017',
    '2026-08-18',
    'New Android download — beta v0.1.0.0017',
    'Compact filter toggles, collapsible sort panels, brand name in the header, staff safe-area fix, and Events filters — fresh APK on the Download page.',
    `WHAT NEIGHBORS SEE
Grab beta v0.1.0.0017 from https://www.sacramentobuynothing.com/download

Since 0016:
• Filter toggles show ON/OFF inside the thumb circle — compact rows, not a long list
• Sort & filters panel collapses to save space (Stuff + Events)
• Header shows SacramentoBuyNothing + tagline beside the logo
• Staff mobile layout respects status bar and navigation buttons
• Events get the same toggle filters (sort, when, quick picks)
• Filters & sort no longer crashes when opened

Already on 0016? Reopening the app still loads the live site, but install 0017 for the latest native shell and safe-area fixes baked in.

— Mark

WHERE TO LOOK IN CODE
- src/components/FilterLabeledSwitch.tsx + CollapsibleFilterSection.tsx
- src/components/BrandLogo.tsx + EventsView.tsx + ItemGrid.tsx
- android/app/build.gradle — versionCode 17

HISTORY
2026-08-18 — APK 0017 ships filter UI polish + staff safe area + header branding.`,
    APK_0017_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_feed-switches-apk-0016',
    '2026-08-18',
    'Labeled feed switches and stronger system bar spacing — beta v0.1.0.0016',
    'Community Stuff filters are now orange ON/OFF switches, and the app keeps header, tabs, and feed content clear of the status bar and navigation buttons.',
    `WHAT NEIGHBORS SEE
On Community Stuff, sort, listing type, quick picks, and hide-completed options are labeled ON/OFF switches in our orange brand color.

The top header and bottom tabs should no longer sit under the clock, battery, or system navigation buttons — even on phones where Android did not report safe-area insets correctly before.

New APK: https://www.sacramentobuynothing.com/download (beta v0.1.0.0016).

— Mark

WHERE TO LOOK IN CODE
- src/components/LabeledSwitch.tsx + FeedFilterSwitchRow.tsx + ItemGrid.tsx — labeled feed switches.
- src/lib/safeAreaInsets.ts + src/capacitor/init.ts + MainActivity.java — Android safe-area fallbacks.
- android/app/build.gradle — versionCode 16.

HISTORY
2026-08-18 — Feed switch UI + safe-area fix, Android beta 0016.`,
    FEED_SWITCHES_APK_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_apk-0015-announcement',
    '2026-08-18',
    'New Android download — beta v0.1.0.0015',
    'A fresh APK is on the Download page. Hide given and fulfilled from Stuff, staff apply seat pills, and the app now respects your phone status bar and navigation buttons.',
    `WHAT NEIGHBORS SEE
Head to https://www.sacramentobuynothing.com/download and grab beta v0.1.0.0015.

New in this build:
• Hide given / Hide fulfilled toggles on Community Stuff
• Green and red seat pills when you apply for staff
• Header, tabs, and map buttons no longer sit under the status bar or system buttons

Already have the app? Reopen it — it loads the live site, so you still pick up web fixes without reinstalling.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_feed-apk-0015. Play Store bundle: npm run android:aab → dist/android/sac-buy-nothing-release.aab

HISTORY
2026-08-18 — APK 0015 announcement.`,
    APK_0015_ANNOUNCE_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_feed-apk-0015',
    '2026-08-18',
    'Cleaner Stuff feed, staff pills, and system bar spacing — new APK',
    'Hide given and fulfilled from Community Stuff, staff apply shows green or red seat pills, and the app respects the status bar and navigation buttons. Android beta v0.1.0.0015 is on the Download page.',
    `WHAT NEIGHBORS SEE
Community Stuff has Hide given and Hide fulfilled toggles so claimed giveaways and completed requests stay out of your feed when you want a cleaner list.

Account → Join the staff team shows green seat pills for open roles and red Seat filled when a role is full.

The header, bottom tabs, map buttons, and new-post FAB now sit below the status bar and above the system navigation buttons.

New APK: https://www.sacramentobuynothing.com/download (beta v0.1.0.0015). The app you already have still loads the live website, so reopening it picks up these changes too.

— Mark

WHERE TO LOOK IN CODE
- src/components/ItemGrid.tsx + src/lib/feedDisplayPrefs.ts — hide given / hide fulfilled.
- src/components/StaffApplyView.tsx — green and red staff seat pills.
- src/capacitor/init.ts + src/index.css — Android safe-area insets for status + nav bars.
- android/app/build.gradle + public/android-version.json — beta 0.1.0.0015 (versionCode 15).

HISTORY
2026-08-18 — Feed toggles, staff pills, system bar spacing, Android beta 0015.`,
    FEED_APK_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_feed-hide-given-fulfilled',
    '2026-08-18',
    'Hide given and fulfilled from Community Stuff',
    'Two toggles on the Stuff feed let you turn off claimed giveaways and completed requests so the list stays focused on what is still open.',
    `WHAT NEIGHBORS SEE
On Community Stuff, open Completed in feed. Flip Hide given to drop claimed giveaways, or Hide fulfilled to drop completed requests. Your choice saves on this device.

— Mark

WHERE TO LOOK IN CODE
- src/components/ItemGrid.tsx — Hide given / Hide fulfilled switches.
- src/lib/feedDisplayPrefs.ts — saved feed display prefs.

HISTORY
2026-08-18 — Feed display toggles.`,
    FEED_HIDE_COMPLETED_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_staff-apply-seat-filled',
    '2026-08-18',
    'Staff apply shows Seat filled when a role is full',
    'On Account → Join the staff team, each role now shows how many seats are open. If a role is full, it says Seat filled and you cannot apply for it.',
    `WHAT NEIGHBORS SEE
Open Account → Join the staff team. Open roles show live counts like 2/5 seats. Full roles say Seat filled and are grayed out — you can only apply for roles with an open seat.

If every role is full, the page says all staff seats are filled.

Reopening the app you already have picks this up — no new APK needed.

— Mark

WHERE TO LOOK IN CODE
- src/components/StaffApplyView.tsx — Seat filled cards and open-seat counts.
- src/lib/staffApplications.ts — seat limit helpers.
- scripts/supabase-migration-aug-18-2026-staff-apply-seat-filled.sql — run in Supabase.

HISTORY
2026-08-18 — PR #201.`,
    STAFF_SEAT_FILLED_PUBLISHED_AT,
  ),
  update(
    '2026-08-18_staff-apply-apk-0014',
    '2026-08-18',
    'Staff applications and Broadcast — new APK',
    'Apply for staff from Account, get notified for Yes, Maybe, or No, and see Broadcast instead of Test all users. Android beta v0.1.0.0014 is on the Download page.',
    `WHAT NEIGHBORS SEE
Account has Join the staff team — read what each role does, then apply. Staff review one request at a time. You hear back either way.

The Alerts button that used to say Test all users is now Broadcast.

New APK: https://www.sacramentobuynothing.com/download (beta v0.1.0.0014). The app you already have still loads the live website, so reopening it picks up these changes too.

— Mark

WHERE TO LOOK IN CODE
- src/components/StaffApplyView.tsx — neighbor apply page.
- src/components/staff/StaffApplicationQueue.tsx — Yes / Maybe / No on Team.
- api/push/_server/staffApplyInvitePush.ts — one-time staff-apply invite push.
- android/app/build.gradle + public/android-version.json — beta 0.1.0.0014 (versionCode 14).

HISTORY
2026-08-18 — Staff applications merged, then Android beta 0014.`,
    STAFF_APPLY_APK_PUBLISHED_AT,
  ),
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

/** Latest News posts — Android releases and director announcements (not duplicate change logs). */
export const SEEDED_HELP_ANNOUNCEMENTS: SeededHelpAnnouncement[] = [
  news(
    '2026-08-20_apk-0038',
    '2026-08-20',
    'New Android beta 0038 — Feed/Chat polish, footer scroll, compact Looking tags',
    'Feed & Chat match other tabs; legal footer below fold; smaller Looking badges on Stuff grid.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0038: Feed & Chat UI matches Stuff/Events, scroll-to-see legal footer, compact "Looking" grid tags.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0038.

HISTORY
2026-08-20 — Android beta 0038 /runit release (PR #275).`,
    APK_0038_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0037',
    '2026-08-20',
    'New Android beta 0037 — live Feed, Chat makeover, map route fit',
    'Neighbor wall with posts and comments, Chat tab, map zooms to route. Play Store: upload AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0037: live neighbor Feed, Chat makeover, map route zoom-to-fit, lower map controls.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

Run scripts/supabase-migration-aug-20-2026-neighbor-feed.sql in Supabase for Feed.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0037.

HISTORY
2026-08-20 — Android beta 0037 /runit release.`,
    APK_0037_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0036',
    '2026-08-20',
    'New Android beta 0036 — Feed tab, header account, 5-tab footer',
    'Feed placeholder, Stuff listings, account in header, badges in bell, orange Looking/Trade tags. Play Store: upload AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0036: Feed tab shell, Stuff for listings, account via header avatar, 5-tab footer, cleaner bell panel.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0036.

HISTORY
2026-08-20 — Android beta 0036 /runit release.`,
    APK_0036_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0035',
    '2026-08-20',
    'New Android beta 0035 — Events toolbar, filter toggles, News/Updates split',
    'Events New button, scoped modals per page, collapsible filter groups, Everything/Giving/Looking/Trading. Play Store: upload AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0035: Events toolbar, page-specific New modals, filter master toggles, feed type labels, News vs Updates tabs.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0035.

HISTORY
2026-08-20 — Android beta 0035 /runit release (PRs #266, #269, #270).`,
    APK_0035_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0034',
    '2026-08-20',
    'New Android beta 0034 — New listing on Map, DMs, listing expiry',
    'Map + New for Stuff or Events; DMs compose back; 30-day listing expiry.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0034: Map + New listing, restored DMs, 30-day listing expiry.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0034.

HISTORY
2026-08-20 — Android beta 0034 /runit release (PRs #258–#262).`,
    APK_0034_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0033',
    '2026-08-20',
    'New Android beta 0033 — staff mode title, location toggle fix',
    'Staff mode card title follows the toggle; location permission switch shows Allowed when GPS works. Play Store: upload the new AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0033 fixes the staff mode settings title and the location permission toggle on Android.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0033.

HISTORY
2026-08-20 — Android beta 0033 /runit release.`,
    APK_0033_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0032',
    '2026-08-20',
    'New Android beta 0032 — staff mode notifications, detail headers',
    'Staff/User mode gates staff alerts; listing and event detail headers scroll with the page. Play Store: upload the new AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0032 ties staff notifications to Staff/User mode and simplifies listing and event detail headers.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0032.

HISTORY
2026-08-20 — Android beta 0032 /runit release.`,
    APK_0032_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0031',
    '2026-08-20',
    'New Android beta 0031 — nav, chats, profile, listings',
    'Nav banner pinned to top, chat previews, profile stats layout, listing type badges. Play Store: upload the new AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0031 bundles launcher icon fix, nav improvements, chat previews, profile stats layout, and cleaner listing type badges.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0031.

HISTORY
2026-08-20 — Android beta 0031 /runit release.`,
    APK_0031_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0030',
    '2026-08-20',
    'New Android beta 0030 — launcher icon fix',
    'Home-screen icon now matches the PWA — full-bleed orange, no white ring. Play Store: upload the new AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0030 fixes the Android launcher icon so it matches the PWA — full-bleed orange with no white ring around the edges.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0030.

HISTORY
2026-08-20 — Android beta 0030 with launcher icon fix.`,
    APK_0030_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0029',
    '2026-08-20',
    'New Android beta 0029 — turn-by-turn navigation',
    'Heading-up map, real lanes, walk/bike/drive, and voice that matches the screen. Play Store: upload the new AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0029 rebuilds in-app navigation: heading-up, real lane guidance, walk/bike/drive, and spoken instructions that match what is on screen.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0029.

HISTORY
2026-08-20 — Android beta 0029 with navigation rework.`,
    APK_0029_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0028',
    '2026-08-20',
    'New Android beta 0028 — app-style feed and events',
    'Photo grid by default, filters behind one button, and Events matches Stuff. Play Store: upload the new AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0028 makes Community Stuff and Events feel more like a native app — grid view by default, collapsible filters, and a cleaner Messages inbox.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0028.

HISTORY
2026-08-20 — Android beta 0028 with feed grid UI polish.`,
    APK_0028_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0024',
    '2026-08-20',
    'New Android beta 0024 — event scheduling + community resources',
    'Post repeat events by month day or weekday, and Laundry Love / City of Refuge are on the calendar. Play Store: upload the new AAB; sideload: Download page.',
    `WHAT NEIGHBORS SEE
Beta v0.1.0.0024 adds smarter event scheduling and two new community resource series.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0024.

HISTORY
2026-08-20 — Android beta 0024 with event recurrence scheduling.`,
    APK_0024_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_event-recurrence',
    '2026-08-20',
    'Laundry Love, City of Refuge, and easier repeat events',
    'Two new free community resource events are on the calendar, and posters can schedule repeats like every 4th Saturday or every Thursday.',
    `WHAT NEIGHBORS SEE
Look for these on Events:

• Laundry Love — free laundry help every 4th Saturday at Stockridge Launderland
• City of Refuge — free showers, laundry, and meals every Thursday on MLK Blvd

Posting an event? Use Repeat on a schedule to auto-fill monthly or weekly dates instead of typing each one.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_event-recurrence-scheduling.

HISTORY
2026-08-20 — PR #234.`,
    EVENT_RECURRENCE_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_staff-participation-mode',
    '2026-08-20',
    'Staff can switch between official and neighbor mode',
    'Community staff now choose how they participate — official Staff mode with your title on comments, or Neighbor mode to message and coordinate pickups like anyone else.',
    `WHAT NEIGHBORS SEE
Staff accounts now have Account → Staff participation mode:

• Staff mode (default): comments show the staff title, listings use Staff chat, and neighbor pickup/DM flows stay off.
• Neighbor mode: participate like any neighbor — message, navigate, claim, Go Get — and comments post without a staff badge.

Moderation tools stay available either way. Your profile may still show you are on the team.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0023.

HISTORY
2026-08-20 — Staff participation mode toggle.`,
    APK_0023_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_apk-0022',
    '2026-08-20',
    'New Android beta 0022 — photo uploads fixed',
    'Posting with photos works again on Android. Play Store testers get the update on the next release; sideload neighbors can grab 0022 from Download.',
    `WHAT NEIGHBORS SEE
If adding photos while posting failed, that is fixed in beta v0.1.0.0022.

Play Store: upload the new AAB to Internal testing and roll out to testers.
Sideload: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_apk-0022.

HISTORY
2026-08-20 — Android beta 0022 with photo upload fix.`,
    APK_0022_PUBLISHED_AT,
  ),
  news(
    '2026-08-20_photo-upload-fix',
    '2026-08-20',
    'Photo uploads fixed — try posting again',
    'If adding photos while posting failed on the Android app or website, reopen the app and try again. No new install needed.',
    `WHAT NEIGHBORS SEE
Some neighbors could log in but could not attach photos when posting listings or events. That is fixed.

Reopen the app or refresh the page, then post with photos as usual. Play Store installs pick up the fix automatically.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-20_photo-upload-fix (PR #232).

HISTORY
2026-08-20 — Photo upload fix for Android Play Store app and website.`,
    PHOTO_UPLOAD_FIX_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_add-listing-photos',
    '2026-08-18',
    'Please add a photo when you post',
    'A quick picture helps neighbors know what you are offering or looking for. We also fixed older listings that lost thumbnails — if yours still shows gray, edit the post and upload a photo.',
    `WHAT NEIGHBORS SEE
Neighbors,

When you give something away or post a request, please add at least one photo if you can.

Why it matters:
• Neighbors can see size, color, condition, and whether it is worth the trip before they message you.
• Posts with photos get claimed faster — people scroll past gray boxes.
• A clear photo cuts down on “Is this still available?” and “What does it look like?” back-and-forth.

Some older listings stored camera data inside the post in a way that slowed the whole feed or hid the thumbnail. We recovered photos on many of those posts today. If you still see a gray tag on one of yours, open the listing → Edit → Add photo and save. That is the surest fix.

When you post something new:
1. Tap Give, Trade, or Looking.
2. Add a title and short description.
3. Tap Add photo (you can add up to six).
4. Post.

No shame if you skipped photos before — we are all learning this app together. Thank you for giving freely in Sacramento.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_listing-feed-photos (feed photo RPC + legacy backfill).

HISTORY
2026-08-18 — Director note after listing photo recovery on Supabase.`,
    LISTING_PHOTOS_URGE_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_apk-0015-download',
    '2026-08-18',
    'New Android app download available',
    'Beta v0.1.0.0015 is ready on the Download page — cleaner Stuff feed, staff apply seat pills, and proper spacing for your phone bars.',
    `WHAT NEIGHBORS SEE
Download: https://www.sacramentobuynothing.com/download (beta v0.1.0.0015).

Hide given or fulfilled posts from Community Stuff. Staff apply shows which seats are open. The header and map buttons no longer hide under your status bar or navigation buttons.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_apk-0015-announcement.

HISTORY
2026-08-18 — APK 0015 neighbor announcement.`,
    APK_0015_ANNOUNCE_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_feed-apk-0015',
    '2026-08-18',
    'Cleaner feed, staff pills, and system bar spacing — new Android download',
    'Hide given and fulfilled on Community Stuff, green and red staff seat pills, and proper spacing for the status bar and navigation buttons. APK beta v0.1.0.0015 is on the Download page.',
    `WHAT NEIGHBORS SEE
Stuff feed → Completed in feed lets you hide claimed giveaways and completed requests.

Staff apply shows green pills for open seats and red Seat filled when a role is full.

The app header and map buttons no longer sit under the phone status bar or system buttons.

Download: https://www.sacramentobuynothing.com/download (beta v0.1.0.0015). Reopening the app you already have also picks up the website changes.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_feed-apk-0015.

HISTORY
2026-08-18 — Feed toggles, staff pills, system bar spacing, Android beta 0015.`,
    FEED_APK_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_feed-hide-given-fulfilled',
    '2026-08-18',
    'Cleaner Stuff feed — hide given and fulfilled',
    'New toggles on Community Stuff let you hide claimed giveaways and completed requests from your feed.',
    `WHAT NEIGHBORS SEE
Stuff feed → Completed in feed. Turn on Hide given or Hide fulfilled to keep the list focused on open posts.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_feed-hide-given-fulfilled.

HISTORY
2026-08-18 — Feed display toggles.`,
    FEED_HIDE_COMPLETED_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_staff-seat-filled',
    '2026-08-18',
    'Staff roles show Seat filled when full',
    'When you apply for staff, roles with no openings now say Seat filled so you only apply where there is room.',
    `WHAT NEIGHBORS SEE
Account → Join the staff team. Each role shows how many seats are open. Full roles say Seat filled and cannot be selected.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_staff-apply-seat-filled.

HISTORY
2026-08-18 — Staff apply seat availability.`,
    STAFF_SEAT_FILLED_PUBLISHED_AT,
  ),
  news(
    '2026-08-18_staff-apply-apk-0014',
    '2026-08-18',
    'Staff applications and a new Android download',
    'Apply for staff from Account and hear back for Yes, Maybe, or No. A new APK (beta v0.1.0.0014) is on the Download page.',
    `WHAT NEIGHBORS SEE
Open Account → Join the staff team. Pick one role and send your application. Staff review one at a time and you get notified either way.

Download: https://www.sacramentobuynothing.com/download (beta v0.1.0.0014). Reopening the app you already have also picks up the website changes.

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-18_staff-apply-apk-0014.

HISTORY
2026-08-18 — Staff applications and Android beta 0014.`,
    STAFF_APPLY_APK_PUBLISHED_AT,
  ),
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
