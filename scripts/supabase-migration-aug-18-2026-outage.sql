-- =========================================================
-- AUG 18 2026 — outage notes + missing Updates/News
-- Run in Supabase SQL Editor on the EXISTING production database.
-- Safe to re-run: ON CONFLICT updates copy in place.
--
-- What this adds / refreshes:
--   • Expanded Aug 18 Update + News (WHAT NEIGHBORS SEE / WHERE TO LOOK / HISTORY)
--   • Missing neighbor notes since July 26 (Android www origin, signed APK, event series)
--
-- Canonical copy also lives in shared/changelogSeed.ts (cron
-- /api/cron/publish-changelog upserts seeds at 40 23 * * *).
-- For a FULL schema re-apply, use complete-schema.sql at the repo root.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES
(
  '2026-08-18_login-crash-fix',
  '2026-08-18',
  'Sign-in is fixed — website and app are back',
  'After login, the website and Android app crashed on “Something went wrong.” That bug is fixed. Sign in again and you should land on the map. A new APK is on the Download page.',
  $detail$WHAT NEIGHBORS SEE
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

Fix: restore the hooks import, keep useBrowseOnly, add Sign out on the error screen, bump the Android beta to 0010, and post this Update plus News so neighbors see we are back.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-18T08:20:00.000Z',
  '2026-08-18T12:00:00.000Z'
),
(
  '2026-08-13_android-www-api',
  '2026-08-13',
  'Android app can reach the site again',
  'Some Android installs showed “Failed to fetch” because the app called the apex domain while the WebView is on www. That origin mismatch is fixed — reopen the app and it should load.',
  $detail$WHAT NEIGHBORS SEE
If the Android app could open but listings, sign-in, or buttons failed with “Failed to fetch,” that was a www vs non-www mismatch. Reopen the app. You do not need a new install for the web fix.

Download page: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
- src/lib/appOrigin.ts — native WebView uses window.location.origin so /api/* stays on the same host (www).
- src/lib/apkDownload.ts + capacitor.config.ts — canonical origin is https://www.sacramentobuynothing.com (VITE_APP_URL / CAPACITOR_SERVER_URL).
- docs/android-apk.md — build env must use the www origin, not the apex domain.

HISTORY
2026-08-13 — PR #182 (fabb421). Apex redirects to www, but Capacitor server.url is www, so API calls to the apex host were blocked by CSP connect-src 'self'.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-13T18:00:00.000Z',
  '2026-08-13T18:00:00.000Z'
),
(
  '2026-07-29_repeat-event-series',
  '2026-07-29',
  'Repeat events show as one series',
  'Recurring community events now group into one card on the feed and map. Posters can add upcoming dates to a series they already posted.',
  $detail$WHAT NEIGHBORS SEE
A weekly or monthly gathering is one event series instead of a pile of duplicate cards. Open it to see upcoming dates. Posters can add more dates from the event screen.

— Mark

WHERE TO LOOK IN CODE
- Event series merge in feed/map (repeat event series work from 2026-07-28 / 2026-07-29).
- Posters: EventDetailView → Add dates for an existing series.
- scripts/seed-lucid-fremont-events-2026.sql — Lucid Winery 2026 schedule seed.

HISTORY
2026-07-28 — Add repeat event series + ability to add upcoming dates (PR #171).
2026-07-29 — Merge series into one card in feed and map (cf359a5).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-07-29T18:00:00.000Z',
  '2026-07-29T18:00:00.000Z'
),
(
  '2026-07-29_signed-apk-auto-update',
  '2026-07-29',
  'Android download is a signed app — no unsafe warning',
  'The Download page now serves a signed release APK, so Android should stop calling it an unsafe debug build. The installed app can also pick up website fixes without a new install.',
  $detail$WHAT NEIGHBORS SEE
Install from https://www.sacramentobuynothing.com/download. Use the signed release APK (not an old debug file). After install, many website fixes arrive the next time you open the app because the APK loads the live site.

— Mark

WHERE TO LOOK IN CODE
- npm run android:apk — signed release via android/keystore.properties.
- public/android-version.json + public/downloads/ — versioned sideload files.
- PWA/APK auto-update splash (86b3732, 2026-07-28).
- Status bar overlap + push-permission reload, build 6 (41f23cc, 2026-07-29).

HISTORY
2026-07-28 — Instant PWA/APK auto-updates and beta version on boot splash.
2026-07-29 — Signed release instead of debug (unsafe Play Protect warning); versioned APK filenames; status bar fix.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-07-29T16:00:00.000Z',
  '2026-07-29T16:00:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES
(
  '2026-08-18_we-are-back',
  '2026-08-18',
  'We are back — sorry we were down after login',
  'If you signed in today and only saw “Something went wrong,” that was us, not you. The website and app are fixed. Sign in again — you should get the map, feed, and messages.',
  $detail$WHAT NEIGHBORS SEE
Neighbors,

We were down after login on both the website and the Android app. You could reach the public pages and sign in, then the community froze on an error screen. Refreshing did not help because you were still signed in.

That is fixed. Sign in again. If the error screen is still up, tap Sign out first, then sign back in. You do not need a new app install. New APK: https://www.sacramentobuynothing.com/download

I am sorry we were down. Thank you for hanging in — and for giving freely in Sacramento.

— Mark

WHERE TO LOOK IN CODE
Same notes as Update 2026-08-18_login-crash-fix: ChatSystem.tsx hooks import, AppErrorBoundary Sign out, /updates routing, Android 0010, changelog seeds, and scripts/supabase-migration-aug-18-2026-outage.sql.

HISTORY
2026-08-18 — Same outage as the Update post. News is the director announcement in Notifications → News. Update is the product note in Notifications → Updates. Both stay published so neighbors who only check one tab still see we are back.

Root cause: PR #187 removed ChatSystem React hooks. Fix: PR #189.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-18T08:20:00.000Z',
  '2026-08-18T12:00:00.000Z'
),
(
  '2026-08-13_android-can-load',
  '2026-08-13',
  'Android app talking to the site again',
  'If the Android app opened but nothing would load (“Failed to fetch”), that is fixed. Reopen the app — it should reach the community on www.sacramentobuynothing.com.',
  $detail$WHAT NEIGHBORS SEE
A few Android neighbors could open the app but not load listings or sign in. The app was calling the wrong hostname. That is fixed. Close the app fully and reopen.

Download: https://www.sacramentobuynothing.com/download

— Mark

WHERE TO LOOK IN CODE
See Update 2026-08-13_android-www-api (src/lib/appOrigin.ts, www vs apex).

HISTORY
2026-08-13 — PR #182.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-13T18:00:00.000Z',
  '2026-08-13T18:00:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "authorName" = EXCLUDED."authorName",
  "authorTitle" = EXCLUDED."authorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "updatedAt" = EXCLUDED."updatedAt";
