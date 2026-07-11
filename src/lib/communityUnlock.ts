import type { AwardsUnlockStatus } from '../types';
import { SITE } from '../siteContent';
import { supabase } from '../supabase';

export async function getCommunityUnlockStatus(target: number): Promise<AwardsUnlockStatus> {
  try {
    const { data, error } = await supabase.rpc('community_member_count');
    const memberCount = error ? 0 : Number(data ?? 0);
    const unlocked = memberCount >= target;
    return {
      unlocked,
      memberCount,
      target,
      remaining: Math.max(0, target - memberCount),
    };
  } catch {
    return { unlocked: false, memberCount: 0, target, remaining: target };
  }
}

export function getInviteShareUrl(): string {
  if (typeof window === 'undefined') return `${SITE.url}/#/login`;
  return `${window.location.origin}${window.location.pathname}#/login`;
}
