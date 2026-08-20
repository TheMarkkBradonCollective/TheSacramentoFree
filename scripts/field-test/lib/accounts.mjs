import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';

  if (!url || !serviceKey) {
    throw new Error(
      'Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local or your shell before running field:test.',
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findUserByEmail(admin, email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function upsertProfile(admin, uid, account) {
  const row = {
    uid,
    displayName: account.name,
    photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(uid)}`,
    email: account.email,
    neighborhood: account.neighborhood,
    bio: account.bio,
    role: 'user',
    goGetEnabled: true,
    createdAt: new Date().toISOString(),
  };

  const { error } = await admin.from('users').upsert(row, { onConflict: 'uid' });
  if (error) throw error;
}

async function ensureAccount(admin, account) {
  const existing = await findUserByEmail(admin, account.email);

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        displayName: account.name,
        neighborhood: account.neighborhood,
      },
    });
    if (error) throw error;
    await upsertProfile(admin, data.user.id, account);
    return { uid: data.user.id, created: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      displayName: account.name,
      neighborhood: account.neighborhood,
    },
  });
  if (error) throw error;
  await upsertProfile(admin, data.user.id, account);
  return { uid: data.user.id, created: true };
}

export async function provisionFieldTestAccounts(config) {
  const admin = getSupabaseAdmin();

  const poster = {
    email: config.posterEmail,
    password: config.posterPassword,
    name: config.posterName,
    neighborhood: config.neighborhood,
    bio: 'Automated field test poster account — posts giveaways, trades, and confirms pickups.',
  };

  const neighbor = {
    email: config.neighborEmail,
    password: config.neighborPassword,
    name: config.neighborName,
    neighborhood: config.neighborhood,
    bio: 'Automated field test neighbor account — claims items and fulfills looking requests.',
  };

  const [posterResult, neighborResult] = await Promise.all([
    ensureAccount(admin, poster),
    ensureAccount(admin, neighbor),
  ]);

  return {
    poster: { ...poster, uid: posterResult.uid, created: posterResult.created },
    neighbor: { ...neighbor, uid: neighborResult.uid, created: neighborResult.created },
  };
}
