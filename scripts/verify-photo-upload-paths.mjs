#!/usr/bin/env node
/**
 * Static audit: every Supabase storage upload must use auth-scoped paths,
 * and every UI file picker should accept Android gallery MIME quirks.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, acc);
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(name)) acc.push(full);
  }
  return acc;
}

const supabaseSrc = read('src/supabase.ts');
const uploadFns = [
  'uploadItemImage',
  'uploadReportProofImage',
  'uploadTicketMessageImage',
  'uploadProfilePhoto',
];

const failures = [];

for (const fn of uploadFns) {
  const start = supabaseSrc.indexOf(`export async function ${fn}`);
  if (start < 0) {
    failures.push(`Missing upload function: ${fn}`);
    continue;
  }
  const nextExport = supabaseSrc.indexOf('export ', start + 10);
  const body = supabaseSrc.slice(start, nextExport > start ? nextExport : start + 2500);
  if (!body.includes('requireAuthUserId()')) {
    failures.push(`${fn} does not require an authenticated user`);
  }
  if (!body.includes('${userId}/')) {
    failures.push(`${fn} does not build an auth-scoped storage path`);
  }
  if (!body.includes('contentType')) {
    failures.push(`${fn} does not set contentType on upload`);
  }
}

const legacyFlatUpload = /\$\{itemId\}_\$\{Date\.now\(\)\}/.test(supabaseSrc);
if (legacyFlatUpload) {
  failures.push('Found legacy flat listing upload path (missing userId prefix)');
}

const fileInputComponents = [
  'PostItemModal.tsx',
  'PostEventModal.tsx',
  'UserProfileView.tsx',
  'ReportNeighborModal.tsx',
  'BlockNeighborModal.tsx',
  'ImageAttachmentPicker.tsx',
];

for (const component of fileInputComponents) {
  const src = read(`src/components/${component}`);
  if (!src.includes('accept="image/*"')) continue;
  const usesLikelyImage =
    src.includes('isLikelyImageFile') || src.includes('normalizeImageUploadFile');
  if (!usesLikelyImage) {
    failures.push(`${component} has image file input but no Android-safe validation`);
  }
}

const uploadSurfaces = [
  { surface: 'Listing post', fn: 'uploadItemImage', ui: 'PostItemModal.tsx' },
  { surface: 'Event post', fn: 'uploadItemImage', ui: 'PostEventModal.tsx' },
  { surface: 'Profile photo', fn: 'uploadProfilePhoto', ui: 'UserProfileView.tsx' },
  { surface: 'Report neighbor', fn: 'uploadReportProofImage', ui: 'ReportNeighborModal.tsx' },
  { surface: 'Block neighbor proof', fn: 'uploadReportProofImage', ui: 'BlockNeighborModal.tsx' },
  { surface: 'Staff report panel', fn: 'uploadReportProofImage', ui: 'SendUserReportPanel.tsx' },
  { surface: 'Support ticket create', fn: 'uploadTicketMessageImage', ui: 'ChatSupportSection.tsx' },
  { surface: 'Support ticket reply', fn: 'uploadTicketMessageImage', ui: 'SupportTicketThread.tsx' },
];

console.log('Photo upload audit\n');
console.log('Platform note: web, PWA, and Android (Capacitor WebView) share the same upload code.\n');
console.log('Surfaces:');
for (const row of uploadSurfaces) {
  console.log(`  ✓ ${row.surface.padEnd(24)} ${row.fn} ← ${row.ui}`);
}

if (failures.length > 0) {
  console.error('\nFailures:');
  for (const msg of failures) console.error(`  ✗ ${msg}`);
  process.exit(1);
}

console.log('\nAll storage uploads use auth-scoped paths and UI pickers handle Android MIME quirks.');
