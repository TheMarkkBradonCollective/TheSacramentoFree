#!/usr/bin/env node
/**
 * Pre-flight checks for /runit release pipeline.
 * Exit 0 = ready (or warnings only). Exit 1 = blocking issues.
 */
import fs from 'fs';
import path from 'path';
import { readAppVersion } from './read-app-version.mjs';

const root = process.cwd();
const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

const { versionName, versionCode, build, label } = readAppVersion();
const schema = read('complete-schema.sql');
const migrationsDir = path.join(root, 'scripts');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.startsWith('supabase-migration-') && f.endsWith('.sql'))
  .sort();

// --- Version / release manifest ---
const releaseManifestPath = 'play-store-assets/current-release.json';
if (exists(releaseManifestPath)) {
  const manifest = JSON.parse(read(releaseManifestPath));
  if (manifest.versionCode !== versionCode) {
    warnings.push(
      `play-store-assets/current-release.json versionCode ${manifest.versionCode} ≠ build.gradle ${versionCode}`,
    );
  }
} else {
  warnings.push('Missing play-store-assets/current-release.json');
}

const releaseNotesFile = `play-store-assets/release-notes-v${versionName}-${build}.txt`;
if (!exists(releaseNotesFile)) {
  warnings.push(`Missing release notes: ${releaseNotesFile}`);
}

// --- Migration ↔ complete-schema sync ---
const migrationMarkers = [
  {
    file: 'scripts/supabase-migration-aug-20-2026-go-get-ring-availability.sql',
    markers: ['pickupAvailability', 'goGetRingDurationSeconds', 'ringExpiresAt', 'awaiting_schedule'],
    label: 'Go Get ring / pickup availability',
  },
  {
    file: 'scripts/supabase-migration-aug-20-2026-staff-interaction-mode.sql',
    markers: ['staffInteractionMode', 'postedAsNeighbor'],
    label: 'Staff interaction mode',
  },
  {
    file: 'scripts/supabase-migration-aug-20-2026-neighbor-feed.sql',
    markers: ['feed_posts', 'feed_post_comments', 'feed_post_reactions', "'feed_post'"],
    label: 'Neighbor feed',
  },
  {
    file: 'scripts/supabase-migration-aug-20-2026-user-prefs-native-session.sql',
    markers: ['navigationSettings', 'appPreferences', 'native_app_sessions'],
    label: 'User prefs + native app session',
  },
];

for (const { file, markers, label: migrationLabel } of migrationMarkers) {
  if (!exists(file)) continue;
  const missing = markers.filter((m) => !schema.includes(m));
  if (missing.length > 0) {
    errors.push(
      `complete-schema.sql missing ${migrationLabel} (${missing.join(', ')}) — merge ${file} first`,
    );
  }
}

// --- Changelog seed for current APK ---
const changelog = read('shared/changelogSeed.ts');
const apkSeedId = `apk-${build}`;
if (!changelog.includes(apkSeedId) && !changelog.includes(`apk-${versionCode}`)) {
  warnings.push(`shared/changelogSeed.ts has no seed for current build (${apkSeedId})`);
}

// --- Android SDK ---
if (!process.env.ANDROID_HOME && !exists(path.join(process.env.HOME || '', 'Android/Sdk'))) {
  warnings.push('ANDROID_HOME not set — run scripts/setup-android-sdk.sh before building APK/AAB');
}

// --- Binaries (informational when re-running) ---
const aabPath = `public/downloads/sac-buy-nothing-beta-v${versionName}.${build}.aab`;
const apkPath = `public/downloads/sac-buy-nothing-beta-v${versionName}.${build}.apk`;
if (!exists(aabPath)) {
  warnings.push(`AAB not built yet: ${aabPath}`);
}
if (!exists(apkPath)) {
  warnings.push(`APK not built yet: ${apkPath}`);
}

// --- Pending incremental migrations list ---
const latestMigration = migrationFiles.at(-1);
console.log(`\n/runit pre-flight — ${label} (versionCode ${versionCode})`);
console.log(`Latest migration file: ${latestMigration ?? 'none'}`);
console.log(`Migrations on disk: ${migrationFiles.length}`);

if (warnings.length) {
  console.log('\nWarnings:');
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.log('\nBlocking:');
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}

console.log('\nPre-flight OK (warnings may still need attention before release).');
process.exit(0);
