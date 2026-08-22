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
    id: '2026-08-21_closed-testing-beta',
    date: '2026-08-21',
    title: 'Android beta is on closed testing — we need 12 opted in',
    body: 'We left internal testing. Opt in on Google Play closed testing — Google needs 12 testers before we can move to open testing.',
    detail: `Neighbors on Android — quick heads-up on the Play Store beta.

We moved out of **internal testing** (the tiny dev-only track) and into **closed testing** — the invited Google Play beta for neighbors on the tester list.

**How to opt in (Android phone):**
1. Open this link while signed into the **Gmail we added to the tester list**:
   ${PLAY_CLOSED_TESTING_URL}
2. Tap **Become a tester**
3. Install **TheSacramentoFree** from the Play Store

**Why this matters:** Google requires **at least 12 opted-in testers** on closed testing before we can graduate to **open testing** (a wider public beta link anyone can join). If you are on Android and got the invite, please opt in — it takes about a minute and helps the whole community move forward.

Already on the app from an old internal-testing link? You are fine — just opt in on the closed-testing page so you stay on the right track for updates.

Questions? Chat → Support.

— Mark`,
    authorName: DIRECTOR_NAME,
    authorTitle: DIRECTOR_TITLE,
    postedByUserId: CHANGELOG_AUTHOR_UID,
    createdAt: CLOSED_TESTING_NEWS_AT,
    updatedAt: CLOSED_TESTING_NEWS_AT,
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
