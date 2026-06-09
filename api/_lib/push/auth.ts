import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin';

export async function getUserFromBearer(authHeader?: string | string[]): Promise<User | null> {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
