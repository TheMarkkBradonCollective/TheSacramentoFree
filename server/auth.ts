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

export function isStaffRole(role: string): boolean {
  return ['city_moderator', 'city_administrator', 'city_manager', 'director'].includes(role);
}
