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

/** Canonical Updates feed — current APK plus later posts. */
export const SEEDED_APP_UPDATES: SeededAppUpdate[] = [
  {
    id: '2026-08-21_apk-0051',
    date: '2026-08-21',
    title: 'The Sacramento Free — beta v0.2.0.0051',
    body: 'Smaller lockup on the home page. Map filters and listing cards no longer overlap or get cut off.',
    detail: `WHAT NEIGHBORS SEE
The Sacramento Free, 0.2.0 (51): same paper, tighter fit.

• The Sacramento Free lockup is a small crest — not a full-screen poster
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

/** Canonical News feed — empty until new posts are seeded. */
export const SEEDED_HELP_ANNOUNCEMENTS: SeededHelpAnnouncement[] = [];

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
