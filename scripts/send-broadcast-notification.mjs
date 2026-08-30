#!/usr/bin/env node
/**
 * Director broadcast to every neighbor with push enabled (inbox + device push).
 *
 * Usage (service role required — copy from Vercel → Environment Variables):
 *   SUPABASE_URL=https://nezmabanjoqdzikliysd.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... \
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{...}' \
 *   node scripts/send-broadcast-notification.mjs \
 *     --title "SacramentoBuyNothing" \
 *     --body "Notifications are fixed and updated for everyone."
 */
import { createClient } from '@supabase/supabase-js';

function parseArgs(argv) {
  const out = { title: 'SacramentoBuyNothing', body: 'Notifications are fixed and updated for everyone.' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--title' && argv[i + 1]) out.title = argv[++i];
    else if (arg === '--body' && argv[i + 1]) out.body = argv[++i];
  }
  return out;
}

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

const { title, body } = parseArgs(process.argv.slice(2));
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findDirectorUid() {
  const { data, error } = await admin.from('users').select('uid').eq('role', 'director').limit(1);
  if (error) throw error;
  const uid = String((data?.[0] as { uid?: string } | undefined)?.uid || '');
  if (!uid) throw new Error('No director account found in public.users');
  return uid;
}

async function main() {
  const directorUid = await findDirectorUid();
  const { runDirectorBroadcastTest } = await import('../api/push/_server/runDirectorBroadcastTest.ts');

  console.log(`Broadcasting as director ${directorUid}…`);
  console.log(`Title: ${title}`);
  console.log(`Body: ${body}`);

  const result = await runDirectorBroadcastTest(directorUid, { title, body });
  console.log(JSON.stringify(result, null, 2));

  if (result.status !== 200) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
