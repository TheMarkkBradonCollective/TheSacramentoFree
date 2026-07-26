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

function update(
  id: string,
  date: string,
  title: string,
  body: string,
  detail: string,
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
    createdAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  };
}

function news(
  id: string,
  date: string,
  title: string,
  body: string,
  detail: string,
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
    createdAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  };
}

/** Latest Update posts — merged with Supabase so neighbors always see current release notes. */
export const SEEDED_APP_UPDATES: SeededAppUpdate[] = [
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
  for (const row of seeded) byId.set(row.id, row);
  for (const row of live) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
}
