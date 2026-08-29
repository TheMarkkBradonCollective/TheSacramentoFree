import { FEATURE_UPDATE_IDS } from './changelogFeatureUpdates';

/** Release/build posts — excluded from Updates tab (features only). Not News; post News manually. */
export function isReleaseChangelogEntry(id: string, title: string): boolean {
  if (/\bapk-\d{4}\b/i.test(id)) return true;
  if (/_apk-\d/.test(id)) return true;
  if (/(-apk-|android-apk|signed-apk|shell-download)/i.test(id)) return true;
  if (/^New Android download/i.test(title)) return true;
  if (/^Labeled feed switches.*beta v0/i.test(title)) return true;
  return false;
}

/** Product-change posts duplicated into News — keep them in Updates only. */
const NEWS_CHANGE_ONLY_IDS = new Set([
  ...FEATURE_UPDATE_IDS,
  '2026-08-20_staff-participation-mode',
  '2026-08-25_feed-listings-events-chat',
]);

export function isNewsEligible(id: string): boolean {
  return !NEWS_CHANGE_ONLY_IDS.has(id);
}

export function filterUpdates<T extends { id: string; title: string }>(rows: T[]): T[] {
  return rows.filter((row) => !isReleaseChangelogEntry(row.id, row.title));
}

export function filterNews<T extends { id: string }>(rows: T[]): T[] {
  return rows.filter((row) => isNewsEligible(row.id));
}

const RELEASE_LINE =
  /download|play store|play console|sideload|\baab\b|versioncode|grab beta|already on 0|npm run android|public\/downloads|\/download|install 00|new apk:|fresh apk|beta v0\.1\.0\.\d{4}/i;

/** Neighbor-facing update detail — product changes only, no release/upload instructions. */
export function neighborUpdateDetail(detail: string | null | undefined): string {
  if (!detail?.trim()) return '';

  const whatNeighbors = extractSection(detail, 'WHAT NEIGHBORS SEE');
  const source = whatNeighbors || detail;

  const lines = source.split('\n');
  const kept: string[] = [];
  let inReleaseBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!inReleaseBlock) kept.push('');
      continue;
    }
    if (/^WHERE TO LOOK IN CODE|^HISTORY|^See Update /i.test(trimmed)) break;
    if (RELEASE_LINE.test(trimmed)) {
      inReleaseBlock = true;
      continue;
    }
    inReleaseBlock = false;
    kept.push(line);
  }

  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractSection(text: string, heading: string): string | null {
  const re = new RegExp(`${heading}\\s*\\n([\\s\\S]*?)(?=\\n(?:WHERE TO LOOK|HISTORY|$))`, 'i');
  const match = text.match(re);
  return match?.[1]?.trim() ?? null;
}
