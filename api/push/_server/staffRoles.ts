import { getSupabaseAdmin } from './supabaseAdmin';

export const STAFF_ROLES = ['city_moderator', 'city_administrator', 'city_manager', 'director'] as const;

const LEGACY_ROLE_MAP: Record<string, string> = {
  moderator: 'city_administrator',
  admin: 'city_manager',
};

const ROLE_RANK: Record<string, number> = {
  user: 0,
  city_moderator: 1,
  city_administrator: 2,
  city_manager: 3,
  director: 4,
};

export function normalizeUserRole(role: unknown): string {
  if (typeof role !== 'string' || !role.trim()) return 'user';
  const key = role.trim();
  if (key in ROLE_RANK) return key;
  return LEGACY_ROLE_MAP[key] ?? 'user';
}

export function isStaffRole(role: unknown): boolean {
  const normalized = normalizeUserRole(role);
  return (STAFF_ROLES as readonly string[]).includes(normalized);
}

export function isDirectorRole(role: unknown): boolean {
  return normalizeUserRole(role) === 'director';
}

export function roleRank(role: unknown): number {
  return ROLE_RANK[normalizeUserRole(role)] ?? 0;
}

export const ROLE_LABELS: Record<string, string> = {
  user: 'Neighbor',
  city_moderator: 'City Moderator',
  city_administrator: 'City Administrator',
  city_manager: 'City Manager',
  director: 'Director',
};

export function roleLabelFor(role: unknown): string {
  return ROLE_LABELS[normalizeUserRole(role)] ?? 'Staff';
}

export async function getUserRole(userId: string): Promise<string> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('users').select('role').eq('uid', userId).maybeSingle();
  return normalizeUserRole((data as { role?: string } | null)?.role);
}
