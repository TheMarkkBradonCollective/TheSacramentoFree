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

// --- complete-schema.sql required markers ---
const schemaMarkers = [
  {
    markers: ['pickupAvailability', 'goGetRingDurationSeconds', 'ringExpiresAt', 'awaiting_schedule'],
    label: 'Go Get ring / pickup availability',
  },
  {
    markers: ['staffInteractionMode', 'postedAsNeighbor'],
    label: 'Staff interaction mode',
  },
  {
    markers: ['feed_posts', 'feed_post_comments', 'feed_post_reactions', 'feed_poll_votes', "'feed_post'", 'postKind'],
    label: 'Neighbor feed',
  },
  {
    markers: ['navigationSettings', 'appPreferences', 'native_app_sessions'],
    label: 'User prefs + native app session',
  },
  {
    markers: ['feedReplies', 'friendRequests', 'eventRsvps', 'discussionComments'],
    label: 'Granular notification preferences',
  },
  {
    markers: ['chats_delete', "status IN ('active', 'pending_pickup', 'on_hold')"],
    label: 'Audit RLS (listing privacy + chat delete)',
  },
  {
    markers: ['delete_own_listing', 'delete_own_event'],
    label: 'Audit 48 cascade deletes',
  },
  {
    markers: ['audit-49-storage-items-auth', 'items_storage_insert'],
    label: 'Listing photo storage auth',
  },
  {
    markers: ['app_device_downloads', 'app_device_installs', 'staff_read_app_device_downloads'],
    label: 'App device download/install stats',
  },
  {
    markers: ['ticketSource', 'support_tickets_source_check', 'support_tickets_staff_listing_open_idx'],
    label: 'Staff outreach support tickets',
  },
];

for (const { markers, label: schemaLabel } of schemaMarkers) {
  const missing = markers.filter((m) => !schema.includes(m));
  if (missing.length > 0) {
    errors.push(`complete-schema.sql missing ${schemaLabel} (${missing.join(', ')})`);
  }
}

// --- Changelog seed for current APK ---
const changelog = read('shared/changelogSeed.ts');
const changelogSeedsCleared =
  /SEEDED_APP_UPDATES:\s*SeededAppUpdate\[\]\s*=\s*\[\]/.test(changelog);
const apkSeedId = `apk-${build}`;
if (
  !changelogSeedsCleared &&
  !changelog.includes(apkSeedId) &&
  !changelog.includes(`apk-${versionCode}`)
) {
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

console.log(`\n/runit pre-flight — ${label} (versionCode ${versionCode})`);
console.log('Database schema: complete-schema.sql (single source of truth)');

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
