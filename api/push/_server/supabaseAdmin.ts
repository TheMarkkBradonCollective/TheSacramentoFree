import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './auth';

let client: SupabaseClient | null = null;
let clientLoad: Promise<SupabaseClient> | null = null;

export function getServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    ''
  );
}

export async function getSupabaseForUser(accessToken: string): Promise<SupabaseClient> {
  const { createClient } = await import('@supabase/supabase-js');
  const { url, apiKey } = getSupabaseEnv();
  if (!url || !apiKey) {
    throw new Error('Supabase is not configured on the server.');
  }

  return createClient(url, apiKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadSupabaseAdmin(): Promise<SupabaseClient> {
  if (client) return client;
  if (!clientLoad) {
    clientLoad = (async () => {
      const [{ createClient }, wsImport] = await Promise.all([
        import('@supabase/supabase-js'),
        import('ws'),
      ]);
      const ws = (wsImport as { default?: typeof import('ws') }).default ?? wsImport;

      const { url, apiKey } = getSupabaseEnv();
      const serviceRoleKey = getServiceRoleKey();

      client = createClient(url || 'https://placeholder.supabase.co', serviceRoleKey || apiKey || 'placeholder', {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: ws as unknown as typeof WebSocket },
      });
      return client;
    })();
  }
  return clientLoad;
}

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  return loadSupabaseAdmin();
}
