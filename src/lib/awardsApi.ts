import {
  AwardDefinition,
  AwardDefinitionInput,
  AwardLeaderboardEntry,
  AwardsUnlockStatus,
  UserAward,
  UserProfile,
} from '../types';
import { supabase } from '../supabase';
import { canManageAwards } from './roles';
import { getCommunityUnlockStatus } from './communityUnlock';

export const AWARDS_UNLOCK_TARGET = 250;

function normalizeAwardDefinitionRow(row: Record<string, unknown>): AwardDefinition {
  const autoRuleRaw = row.autoRule as Record<string, unknown> | null | undefined;
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description),
    icon: String(row.icon || 'award'),
    category: (row.category as AwardDefinition['category']) || 'community',
    triggerType: (row.triggerType as AwardDefinition['triggerType']) || 'manual',
    autoRule: autoRuleRaw?.type
      ? {
          type: autoRuleRaw.type as NonNullable<AwardDefinition['autoRule']>['type'],
          threshold: Number(autoRuleRaw.threshold ?? 1),
        }
      : null,
    sortOrder: Number(row.sortOrder ?? 0),
    isActive: row.isActive !== false,
    requiresUnlock: row.requiresUnlock !== false,
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || ''),
    createdByUserId: row.createdByUserId ? String(row.createdByUserId) : null,
  };
}

function normalizeUserAwardRow(
  row: Record<string, unknown>,
  definition?: AwardDefinition,
): UserAward {
  return {
    id: String(row.id),
    userId: String(row.userId),
    awardId: String(row.awardId),
    grantedAt: String(row.grantedAt || ''),
    grantedByUserId: row.grantedByUserId ? String(row.grantedByUserId) : null,
    revokedAt: row.revokedAt ? String(row.revokedAt) : null,
    revokedByUserId: row.revokedByUserId ? String(row.revokedByUserId) : null,
    source: (row.source as UserAward['source']) || 'auto',
    metadata: (row.metadata as Record<string, unknown>) || null,
    award: definition,
  };
}

export async function getAwardsUnlockStatus(): Promise<AwardsUnlockStatus> {
  return getCommunityUnlockStatus(AWARDS_UNLOCK_TARGET);
}

export async function getAwardDefinitions(): Promise<AwardDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('award_definitions')
      .select('*')
      .order('sortOrder', { ascending: true })
      .order('title', { ascending: true });

    if (error) {
      if (error.code === '42P01') return [];
      console.warn('[awards] definitions:', error.message);
      return [];
    }

    return (data as Record<string, unknown>[]).map(normalizeAwardDefinitionRow);
  } catch {
    return [];
  }
}

export async function getUserAwards(userId: string): Promise<UserAward[]> {
  try {
    const [defs, grantsRes] = await Promise.all([
      getAwardDefinitions(),
      supabase
        .from('user_awards')
        .select('*')
        .eq('userId', userId)
        .is('revokedAt', null)
        .order('grantedAt', { ascending: false }),
    ]);

    if (grantsRes.error) {
      if (grantsRes.error.code === '42P01') return [];
      console.warn('[awards] user grants:', grantsRes.error.message);
      return [];
    }

    const defMap = new Map(defs.map((d) => [d.id, d]));
    return (grantsRes.data as Record<string, unknown>[]).map((row) =>
      normalizeUserAwardRow(row, defMap.get(String(row.awardId))),
    );
  } catch {
    return [];
  }
}

export async function getAwardsLeaderboard(limit = 25): Promise<AwardLeaderboardEntry[]> {
  try {
    const { data: grants, error } = await supabase
      .from('user_awards')
      .select('userId, grantedAt')
      .is('revokedAt', null);

    if (error) {
      if (error.code === '42P01') return [];
      console.warn('[awards] leaderboard grants:', error.message);
      return [];
    }

    if (!grants?.length) return [];

    const byUser = new Map<string, { count: number; latest: string }>();
    for (const row of grants as { userId?: string; grantedAt?: string }[]) {
      const uid = String(row.userId || '');
      if (!uid) continue;
      const grantedAt = String(row.grantedAt || '');
      const current = byUser.get(uid);
      if (!current) {
        byUser.set(uid, { count: 1, latest: grantedAt });
      } else {
        current.count += 1;
        if (grantedAt > current.latest) current.latest = grantedAt;
      }
    }

    const ranked = [...byUser.entries()]
      .sort((a, b) => b[1].count - a[1].count || b[1].latest.localeCompare(a[1].latest))
      .slice(0, Math.max(1, Math.min(limit, 100)));

    if (ranked.length === 0) return [];

    const userIds = ranked.map(([uid]) => uid);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('uid, displayName, photoURL, neighborhood, role')
      .in('uid', userIds);

    if (usersError) {
      console.warn('[awards] leaderboard users:', usersError.message);
    }

    const excludedRoles = new Set(['director']);
    const userMap = new Map(
      (users || [])
        .filter((user) => !excludedRoles.has(String((user as { role?: string }).role || '')))
        .map((user) => [
          String((user as { uid: string }).uid),
          user as { uid: string; displayName?: string; photoURL?: string; neighborhood?: string },
        ]),
    );

    return ranked
      .filter(([userId]) => userMap.has(userId))
      .map(([userId, stats], index) => {
        const user = userMap.get(userId);
        return {
          rank: index + 1,
          userId,
          displayName: String(user?.displayName || 'Neighbor').trim() || 'Neighbor',
          photoURL: user?.photoURL || undefined,
          neighborhood: String(user?.neighborhood || ''),
          awardCount: stats.count,
          latestGrantAt: stats.latest,
        };
      });
  } catch {
    return [];
  }
}

export async function staffCreateAwardDefinition(
  input: AwardDefinitionInput,
  actor: UserProfile,
): Promise<{ ok: boolean; award?: AwardDefinition; errorMessage?: string }> {
  if (!canManageAwards(actor.role)) {
    return { ok: false, errorMessage: 'Only staff can create awards.' };
  }

  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id,
      slug: input.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      title: input.title.trim(),
      description: input.description.trim(),
      icon: input.icon.trim() || 'award',
      category: input.category,
      triggerType: input.triggerType,
      autoRule: input.autoRule ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive !== false,
      requiresUnlock: input.requiresUnlock !== false,
      createdAt: now,
      updatedAt: now,
      createdByUserId: actor.uid,
    };

    const { data, error } = await supabase.from('award_definitions').insert(payload).select('*').single();
    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: true, award: normalizeAwardDefinitionRow(data as Record<string, unknown>) };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not create award.' };
  }
}

export async function staffUpdateAwardDefinition(
  id: string,
  input: Partial<AwardDefinitionInput>,
  actor: UserProfile,
): Promise<{ ok: boolean; award?: AwardDefinition; errorMessage?: string }> {
  if (!canManageAwards(actor.role)) {
    return { ok: false, errorMessage: 'Only staff can edit awards.' };
  }

  try {
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.slug !== undefined) patch.slug = input.slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.icon !== undefined) patch.icon = input.icon.trim() || 'award';
    if (input.category !== undefined) patch.category = input.category;
    if (input.triggerType !== undefined) patch.triggerType = input.triggerType;
    if (input.autoRule !== undefined) patch.autoRule = input.autoRule;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    if (input.requiresUnlock !== undefined) patch.requiresUnlock = input.requiresUnlock;

    const { data, error } = await supabase
      .from('award_definitions')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: true, award: normalizeAwardDefinitionRow(data as Record<string, unknown>) };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not update award.' };
  }
}

export async function staffGrantAward(
  targetUserId: string,
  awardSlug: string,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canManageAwards(actor.role)) {
    return { ok: false, errorMessage: 'Only staff can grant awards.' };
  }

  try {
    const { data, error } = await supabase.rpc('staff_grant_award', {
      target_uid: targetUserId,
      award_slug: awardSlug,
    });

    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: Boolean(data) };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not grant award.' };
  }
}

export async function staffRevokeAward(
  targetUserId: string,
  awardSlug: string,
  actor: UserProfile,
): Promise<{ ok: boolean; errorMessage?: string }> {
  if (!canManageAwards(actor.role)) {
    return { ok: false, errorMessage: 'Only staff can revoke awards.' };
  }

  try {
    const { data, error } = await supabase.rpc('staff_revoke_award', {
      target_uid: targetUserId,
      award_slug: awardSlug,
    });

    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: Boolean(data) };
  } catch (err: unknown) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not revoke award.' };
  }
}

export async function evaluateAutoAwardsForUser(userId: string): Promise<void> {
  try {
    await supabase.rpc('evaluate_auto_awards_for_user', { target_uid: userId });
  } catch {
    // RPC may not exist until migration runs
  }
}

export { getInviteShareUrl } from './communityUnlock';
