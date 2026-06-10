import { getSupabaseAdmin } from './supabaseAdmin';

export const STAFF_ROLES = ['city_moderator', 'city_administrator', 'city_manager', 'director'] as const;

const ROLE_RANK: Record<string, number> = {
  user: 0,
  city_moderator: 1,
  city_administrator: 2,
  city_manager: 3,
  director: 4,
  moderator: 2,
  admin: 3,
};

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function roleRank(role: string): number {
  return ROLE_RANK[role] ?? 0;
}

export async function getUserRole(userId: string): Promise<string> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('users').select('role').eq('uid', userId).maybeSingle();
  return (data as { role?: string } | null)?.role || 'user';
}
