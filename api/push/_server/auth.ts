export function getSupabaseEnv(): { url: string; apiKey: string } {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const apiKey =
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  return { url, apiKey };
}

export function getBearerToken(authHeader?: string | string[]): string | null {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  return token || null;
}

export async function getUserFromBearer(
  authHeader?: string | string[],
): Promise<{ id: string; email?: string } | null> {
  const token = getBearerToken(authHeader);
  if (!token) return null;

  const { url, apiKey } = getSupabaseEnv();
  if (!url || !apiKey) return null;

  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: apiKey,
    },
  });

  if (!res.ok) return null;

  const json = (await res.json()) as { id?: string; email?: string };
  if (!json.id) return null;
  return { id: json.id, email: json.email };
}
