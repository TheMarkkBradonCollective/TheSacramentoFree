#!/usr/bin/env node
/**
 * Export neighbor emails from Supabase to a CSV file (testing / QA only).
 *
 * Usage (service role required — never commit the CSV or expose it publicly):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/export-user-emails.mjs
 *
 * Options:
 *   EXPORT_OUTPUT=exports/user-emails.csv   output path (default)
 *   EXPORT_EMAILS_ONLY=1                  single-column CSV with header row
 *   EXPORT_PLAY_TESTERS=1                 Play Console tester upload (one email
 *                                         per line, no header, UTF-8 no BOM)
 *   --play-testers                        same as EXPORT_PLAY_TESTERS=1
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: join(root, '.env.local') });
loadEnv({ path: join(root, '.env') });

const playTesters =
  process.env.EXPORT_PLAY_TESTERS === '1' ||
  process.argv.includes('--play-testers');
const outputPath =
  process.env.EXPORT_OUTPUT ||
  (playTesters ? join(root, 'exports', 'play-testers.csv') : join(root, 'exports', 'user-emails.csv'));
const emailsOnly = process.env.EXPORT_EMAILS_ONLY === '1' || process.argv.includes('--emails-only');
const limitRaw = process.env.EXPORT_LIMIT || process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 0) : 0;

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

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

async function fetchAllUsers() {
  // Supabase/PostgREST may cap each response below our requested range (often 100 or
  // 1000 depending on project settings). Paginate until an empty page — do not stop
  // early when data.length < pageSize or exports truncate at the server cap.
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('users')
      .select('email, displayName, neighborhood, role, accountStatus, uid, createdAt')
      .order('email', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    rows.push(...data);
    from += data.length;
  }

  return rows;
}

async function main() {
  const users = await fetchAllUsers();
  if (users.length === 0) {
    console.error('No users returned from public.users.');
    process.exit(1);
  }

  const emails = users
    .map((u) => String(u.email || '').trim())
    .filter(Boolean)
    .slice(0, limit > 0 ? limit : undefined);

  let body;
  if (playTesters) {
    body = `${emails.join('\n')}\n`;
  } else if (emailsOnly) {
    body = `${['email', ...emails.map((email) => csvEscape(email))].join('\n')}\n`;
  } else {
    body = `${[
      'email,displayName,neighborhood,role,accountStatus,uid,createdAt',
      ...users.map((u) =>
        [
          csvEscape(u.email),
          csvEscape(u.displayName),
          csvEscape(u.neighborhood),
          csvEscape(u.role),
          csvEscape(u.accountStatus),
          csvEscape(u.uid),
          csvEscape(u.createdAt),
        ].join(','),
      ),
    ].join('\n')}\n`;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  // Play Console rejects UTF-8 with BOM — write plain UTF-8 only.
  writeFileSync(outputPath, body, 'utf8');

  console.log(`Wrote ${emails.length} rows → ${outputPath}`);
  if (playTesters) {
    console.log('Play Console format: one email per line, no header, UTF-8 (no BOM).');
    console.log('Upload at Testing → Internal/Closed testing → Testers → Create email list → Upload CSV.');
    if (emails.length > 100) {
      console.warn(
        `Warning: Internal testing allows at most 100 testers (you have ${emails.length}). Use Closed testing (up to 2,000/list) or trim the file.`,
      );
    }
  } else if (emailsOnly) {
    console.log('(email column with header — not for Play Console CSV upload; use --play-testers instead)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
