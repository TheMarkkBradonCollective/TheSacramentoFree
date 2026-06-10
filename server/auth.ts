import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || supabaseAnonKey || 'placeholder',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export interface AuthedRequest extends Request {
  user?: User;
  accessToken?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  req.user = data.user;
  req.accessToken = token;
  next();
}

export async function getUserRole(userId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('users').select('role').eq('uid', userId).maybeSingle();
  return (data as { role?: string } | null)?.role || 'user';
}

const ROLE_RANK: Record<string, number> = {
  user: 0,
  city_moderator: 1,
  city_administrator: 2,
  city_manager: 3,
  director: 4,
  moderator: 2,
  admin: 3,
};

export const STAFF_ROLES = ['city_moderator', 'city_administrator', 'city_manager', 'director'] as const;

export function normalizeUserRole(role: unknown): string {
  if (typeof role !== 'string' || !role.trim()) return 'user';
  const key = role.trim();
  if (key in ROLE_RANK) return key;
  const legacy: Record<string, string> = { moderator: 'city_administrator', admin: 'city_manager' };
  return legacy[key] ?? 'user';
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
