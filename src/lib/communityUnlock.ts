import type { AwardsUnlockStatus } from '../types';
import { supabase } from '../supabase';

export async function getCommunityUnlockStatus(target: number): Promise<AwardsUnlockStatus> {
  try {
    const { count, error } = await supabase.from('users').select('uid', { count: 'exact', head: true });
    const memberCount = error ? 0 : count ?? 0;
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
  if (typeof window === 'undefined') return 'https://sacramentobuynothing.com/#/login';
  return `${window.location.origin}${window.location.pathname}#/login`;
}
