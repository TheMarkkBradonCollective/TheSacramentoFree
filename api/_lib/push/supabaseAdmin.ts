import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let clientLoad: Promise<SupabaseClient> | null = null;

async function loadSupabaseAdmin(): Promise<SupabaseClient> {
  if (client) return client;
  if (!clientLoad) {
    clientLoad = (async () => {
      const { createClient } = await import('@supabase/supabase-js');
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

      client = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        serviceRoleKey || supabaseAnonKey || 'placeholder',
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      return client;
    })();
  }
  return clientLoad;
}

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  return loadSupabaseAdmin();
}
