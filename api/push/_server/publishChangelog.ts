import { filterNews, filterUpdates } from '../../../shared/changelogFilters';
import {
  SEEDED_APP_UPDATES,
  SEEDED_HELP_ANNOUNCEMENTS,
} from '../../../shared/changelogSeed';
import { getSupabaseAdmin } from './supabaseAdmin';

type ChangelogRow = {
  id: string;
  date: string;
  title: string;
  body: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

function contentMatches(existing: Record<string, unknown>, row: ChangelogRow): boolean {
  return (
    String(existing.date || '') === row.date &&
    String(existing.title || '') === row.title &&
    String(existing.body || '') === row.body &&
    String(existing.detail || '') === (row.detail || '') &&
    String(existing.directorName || existing.authorName || '') ===
      String(row.directorName || row.authorName || '')
  );
}

async function upsertRowsWithStableTimestamps(
  table: 'app_updates' | 'help_announcements',
  rows: ChangelogRow[],
): Promise<{ count: number; error?: string }> {
  if (!rows.length) return { count: 0 };

  const admin = await getSupabaseAdmin();
  const ids = rows.map((row) => row.id);
  const { data: existingRows, error: readError } = await admin
    .from(table)
    .select('id, date, title, body, detail, directorName, authorName, updatedAt, createdAt')
    .in('id', ids);

  if (readError) {
    return { count: 0, error: readError.message };
  }

  const existingById = new Map(
    (existingRows || []).map((row) => [String((row as { id: string }).id), row as Record<string, unknown>]),
  );

  const payload = rows.map((row) => {
    const existing = existingById.get(row.id);
    if (existing && contentMatches(existing, row)) {
      return {
        ...row,
        createdAt: String(existing.createdAt || row.createdAt),
        updatedAt: String(existing.updatedAt || row.updatedAt),
      };
    }
    return row;
  });

  const { error } = await admin.from(table).upsert(payload, { onConflict: 'id' });
  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: payload.length };
}

async function pruneRowsNotInSeed(
  table: 'app_updates' | 'help_announcements',
  allowedIds: string[],
): Promise<{ pruned: number; error?: string }> {
  const admin = await getSupabaseAdmin();
  const { data: existingRows, error: readError } = await admin.from(table).select('id');
  if (readError) {
    return { pruned: 0, error: readError.message };
  }

  const allowed = new Set(allowedIds);
  const staleIds = (existingRows || [])
    .map((row) => String((row as { id: string }).id))
    .filter((id) => !allowed.has(id));

  if (!staleIds.length) {
    return { pruned: 0 };
  }

  const { error } = await admin.from(table).delete().in('id', staleIds);
  if (error) {
    return { pruned: 0, error: error.message };
  }

  return { pruned: staleIds.length };
}

async function pruneChangelogVotes(
  allowedUpdateIds: string[],
  allowedAnnouncementIds: string[],
): Promise<{ pruned: number; error?: string }> {
  const admin = await getSupabaseAdmin();
  const { data: voteRows, error: readError } = await admin
    .from('community_content_votes')
    .select('id, targetType, targetId')
    .in('targetType', ['update', 'announcement']);

  if (readError) {
    return { pruned: 0, error: readError.message };
  }

  const allowedUpdates = new Set(allowedUpdateIds);
  const allowedAnnouncements = new Set(allowedAnnouncementIds);
  const staleVoteIds = (voteRows || [])
    .filter((row) => {
      const targetType = String((row as { targetType: string }).targetType);
      const targetId = String((row as { targetId: string }).targetId);
      if (targetType === 'update') return !allowedUpdates.has(targetId);
      if (targetType === 'announcement') return !allowedAnnouncements.has(targetId);
      return false;
    })
    .map((row) => String((row as { id: string }).id));

  if (!staleVoteIds.length) {
    return { pruned: 0 };
  }

  const { error } = await admin.from('community_content_votes').delete().in('id', staleVoteIds);
  if (error) {
    return { pruned: 0, error: error.message };
  }

  return { pruned: staleVoteIds.length };
}

export async function publishChangelogToSupabase(): Promise<{
  ok: boolean;
  updates: number;
  announcements: number;
  prunedUpdates?: number;
  prunedAnnouncements?: number;
  prunedVotes?: number;
  error?: string;
  ids?: { updates: string[]; announcements: string[] };
}> {
  const updateRows = filterUpdates(SEEDED_APP_UPDATES) as unknown as ChangelogRow[];
  const newsRows = filterNews(SEEDED_HELP_ANNOUNCEMENTS) as unknown as ChangelogRow[];

  const [updatesResult, newsResult] = await Promise.all([
    upsertRowsWithStableTimestamps('app_updates', updateRows),
    upsertRowsWithStableTimestamps('help_announcements', newsRows),
  ]);

  if (updatesResult.error || newsResult.error) {
    return {
      ok: false,
      updates: updatesResult.count,
      announcements: newsResult.count,
      error: updatesResult.error || newsResult.error,
    };
  }

  const updateIds = updateRows.map((row) => row.id);
  const announcementIds = newsRows.map((row) => row.id);

  const [pruneUpdatesResult, pruneNewsResult, pruneVotesResult] = await Promise.all([
    pruneRowsNotInSeed('app_updates', updateIds),
    pruneRowsNotInSeed('help_announcements', announcementIds),
    pruneChangelogVotes(updateIds, announcementIds),
  ]);

  if (pruneUpdatesResult.error || pruneNewsResult.error || pruneVotesResult.error) {
    return {
      ok: false,
      updates: updatesResult.count,
      announcements: newsResult.count,
      prunedUpdates: pruneUpdatesResult.pruned,
      prunedAnnouncements: pruneNewsResult.pruned,
      prunedVotes: pruneVotesResult.pruned,
      error: pruneUpdatesResult.error || pruneNewsResult.error || pruneVotesResult.error,
    };
  }

  return {
    ok: true,
    updates: updatesResult.count,
    announcements: newsResult.count,
    prunedUpdates: pruneUpdatesResult.pruned,
    prunedAnnouncements: pruneNewsResult.pruned,
    prunedVotes: pruneVotesResult.pruned,
    ids: {
      updates: updateIds,
      announcements: announcementIds,
    },
  };
}
