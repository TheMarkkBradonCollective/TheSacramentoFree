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
const APK_0051_AT = '2026-08-21T22:35:00.000Z';
const APK_0052_AT = '2026-08-21T23:50:00.000Z';
const CLOSED_TESTING_NEWS_AT = '2026-08-21T23:20:00.000Z';
const TESTER_LIST_NEWS_AT = '2026-08-22T00:40:00.000Z';
const TESTER_LIST_NEWS_UPDATED_AT = '2026-08-22T00:50:00.000Z';
const CLOSED_TESTING_NEWS_UPDATED_AT = '2026-08-22T00:50:00.000Z';
const UPCOMING_URL_NEWS_AT = '2026-08-22T03:50:00.000Z';
const PLAY_CLOSED_TESTING_URL = 'https://play.google.com/apps/testing/org.sacramentobuynothing.app';

/** Canonical Updates feed — current APK plus later posts. */
export const SEEDED_APP_UPDATES: SeededAppUpdate[] = [
  {
    id: '2026-08-21_apk-0052',
    date: '2026-08-21',
    title: 'TheSacramentoFree — beta v0.2.0.0052',
    body: 'The app is now TheSacramentoFree on your home screen and in Google Play. Same community, new name.',
    detail: `WHAT NEIGHBORS SEE
TheSacramentoFree, 0.2.0 (52): the rebrand lands on Android.

• Home screen and app switcher say **TheSacramentoFree**
• Same sign-in, listings, map, chat, and notifications
• Package stays org.sacramentobuynothing.app — your account is unchanged
• Opt in on closed testing if you have not yet: ${PLAY_CLOSED_TESTING_URL}

— Mark`,
    directorName: DIRECTOR_NAME,
    directorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: APK_0052_AT,
    updatedAt: APK_0052_AT,
  },
  {
    id: '2026-08-21_apk-0051',
    date: '2026-08-21',
    title: 'TheSacramentoFree — beta v0.2.0.0051',
    body: 'Smaller lockup on the home page. Map filters and listing cards no longer overlap or get cut off.',
    detail: `WHAT NEIGHBORS SEE
TheSacramentoFree, 0.2.0 (51): same paper, tighter fit.

• TheSacramentoFree lockup is a small crest — not a full-screen poster
• Sign-in no longer stacks three logos
• Map All / Giving / Looking / Trade / Events no longer collide with Index
• Listing cards on the map keep ASK, category, and page numbers apart
• Website columns wrap instead of clipping

— Mark`,
    directorName: DIRECTOR_NAME,
    directorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: APK_0051_AT,
    updatedAt: APK_0051_AT,
  },
];

/** Canonical News feed — community announcements for bell → News. */
export const SEEDED_HELP_ANNOUNCEMENTS: SeededHelpAnnouncement[] = [
  {
    id: '2026-08-22_upcoming-url-and-app-link',
    date: '2026-08-22',
    title: 'Heads up: new website link and Android download coming soon',
    body: 'We are planning a new website address and a new Android download link. Not today — keep using the site and app as you do now. I will post the exact links and install steps in News before we switch.',
    detail: `Quick heads-up so this does not catch anyone off guard later.

TheSacramentoFree name and look changed recently — that was immediate once the update shipped. The next change is different: we will move to a new website link and a new Android app download link. That is still coming, not live yet.

What to expect:
• A new web address for TheSacramentoFree (sacramentobuynothing.com may keep working for a while as a redirect)
• A new Google Play closed-testing or download link when we cut over — not the same instant flip as an in-app update
• Same neighbor account, same sign-in email, same listings, chat, and map — this is about links, not starting over

What you should do now:
• Keep using the app and site exactly as you do today
• Stay on the current Play beta link until I post the new one here in News
• When the switch happens, I will publish a follow-up with the new link, install steps, and whether you need to remove the old app icon from your phone

If you have questions before then, Chat → Support.

— Mark`,
    authorName: DIRECTOR_NAME,
    authorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: UPCOMING_URL_NEWS_AT,
    updatedAt: UPCOMING_URL_NEWS_AT,
  },
  {
    id: '2026-08-22_closed-testing-tester-list',
    date: '2026-08-22',
    title: '411 neighbors are on the Android beta invite list',
    body: '411 neighbors are on the Google Play closed-testing list. If you use Android, opt in with the Gmail we have on file. If Play says you are not a tester, open Chat → Support and send me your Gmail.',
    detail: `If you use an Android phone, here is where we stand on the Play Store beta.

411 neighbors from our community are already on the TheSacramentoFree closed-testing email list in Google Play Console (pulled from neighbors who joined through the site).

If you are on the list:
1. On your phone, open this link while signed into the Gmail we have on file:
   ${PLAY_CLOSED_TESTING_URL}
2. Tap Become a tester
3. Install TheSacramentoFree from the Play Store

If Play says you are not a tester, or you never got access:
Open Chat → Support in the app and send the Gmail address you use on your phone. I will add you to the list manually. Same community account — this is only about which Google account can install from Play.

If you do not use Android:
You can still use the website or add the app to your home screen. The Play beta is for Android phones only.

Thank you for your patience while we move from internal testing to closed testing and work toward open testing.

— Mark`,
    authorName: DIRECTOR_NAME,
    authorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: TESTER_LIST_NEWS_AT,
    updatedAt: TESTER_LIST_NEWS_UPDATED_AT,
  },
  {
    id: '2026-08-21_closed-testing-beta',
    date: '2026-08-21',
    title: 'Android beta is on closed testing — we need 12 opted in',
    body: 'We moved to Google Play closed testing. If you use Android and got the invite, please opt in — Google needs 12 testers before we can open the beta wider.',
    detail: `Quick heads-up if you use an Android phone.

We moved out of internal testing (the tiny dev-only track) and into closed testing — the invited Google Play beta for neighbors on the tester list.

How to opt in:
1. Open this link while signed into the Gmail we added to the tester list:
   ${PLAY_CLOSED_TESTING_URL}
2. Tap Become a tester
3. Install TheSacramentoFree from the Play Store

Why this matters:
Google requires at least 12 opted-in testers on closed testing before we can graduate to open testing (a wider public beta link anyone can join). If you got the invite, please opt in — it takes about a minute and helps the whole community move forward.

Already on the app from an old internal-testing link? You are fine — just opt in on the closed-testing page so you stay on the right track for updates.

Questions? Chat → Support.

— Mark`,
    authorName: DIRECTOR_NAME,
    authorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: CLOSED_TESTING_NEWS_AT,
    updatedAt: CLOSED_TESTING_NEWS_UPDATED_AT,
  },
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
