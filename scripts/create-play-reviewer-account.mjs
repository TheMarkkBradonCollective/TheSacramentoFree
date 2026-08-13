#!/usr/bin/env node
/**
 * Create (or reset) the Google Play reviewer test account in Supabase.
 *
 * Usage (from project root, with env from Vercel or .env.local):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/create-play-reviewer-account.mjs
 */
import { createClient } from '@supabase/supabase-js';

const REVIEW_EMAIL = process.env.PLAY_REVIEW_EMAIL || 'playstore-review@sacramentobuynothing.com';
const REVIEW_PASSWORD = process.env.PLAY_REVIEW_PASSWORD || 'PlayReview-Sac2026!';
const REVIEW_NAME = 'Play Store Reviewer';
const REVIEW_NEIGHBORHOOD = 'Midtown';

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
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Copy them from Vercel → Settings → Environment Variables, then rerun.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
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

async function upsertProfile(uid, email) {
  const row = {
    uid,
    displayName: REVIEW_NAME,
    photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(uid)}`,
    email,
    neighborhood: REVIEW_NEIGHBORHOOD,
    bio: 'Google Play review account — test posting and messaging only.',
    role: 'user',
    goGetEnabled: true,
    createdAt: new Date().toISOString(),
  };

  const { error } = await admin.from('users').upsert(row, { onConflict: 'uid' });
  if (error) throw error;
}

async function main() {
  const existing = await findUserByEmail(REVIEW_EMAIL);

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: REVIEW_PASSWORD,
      email_confirm: true,
      user_metadata: {
        displayName: REVIEW_NAME,
        neighborhood: REVIEW_NEIGHBORHOOD,
      },
    });
    if (error) throw error;
    await upsertProfile(data.user.id, REVIEW_EMAIL);
    console.log('Updated existing Play reviewer account.');
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: REVIEW_EMAIL,
      password: REVIEW_PASSWORD,
      email_confirm: true,
      user_metadata: {
        displayName: REVIEW_NAME,
        neighborhood: REVIEW_NEIGHBORHOOD,
      },
    });
    if (error) throw error;
    await upsertProfile(data.user.id, REVIEW_EMAIL);
    console.log('Created Play reviewer account.');
  }

  console.log('');
  console.log('Paste into Play Console → App content → App access → Sign-in details:');
  console.log('');
  console.log(`Email:    ${REVIEW_EMAIL}`);
  console.log(`Password: ${REVIEW_PASSWORD}`);
  console.log('');
  console.log('Instructions for reviewers (full access):');
  console.log('Play Console: check full access to all features, including premium/paid content.');
  console.log('After sign-in: feed, map, messages, posting, claiming, and profile all work.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
