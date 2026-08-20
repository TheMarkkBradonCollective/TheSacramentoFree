#!/usr/bin/env node
/**
 * Print and save a copy-paste block for Google Play Console after /runit.
 * Usage: node scripts/runit-play-console-summary.mjs [--write]
 */
import fs from 'fs';
import path from 'path';
import { readAppVersion } from './read-app-version.mjs';

const root = process.cwd();
const writeFile = process.argv.includes('--write');
const { versionName, versionCode, build, label } = readAppVersion();

const aabFile = `sac-buy-nothing-beta-v${versionName}.${build}.aab`;
const aabPath = `public/downloads/${aabFile}`;
const releaseNotesPath = `play-store-assets/release-notes-v${versionName}-${build}.txt`;
const releaseTitle = `${versionName} (${versionCode})`;
const aabPublicUrl = `https://www.sacramentobuynothing.com/downloads/${aabFile}`;
const apkPublicUrl = `https://www.sacramentobuynothing.com/downloads/sac-buy-nothing-beta-v${versionName}.${build}.apk`;

let releaseNotesBody = '';
if (fs.existsSync(path.join(root, releaseNotesPath))) {
  releaseNotesBody = fs.readFileSync(path.join(root, releaseNotesPath), 'utf8').trim();
} else {
  releaseNotesBody = `(create ${releaseNotesPath} before uploading to Play Console)`;
}

const lines = [
  '═══════════════════════════════════════════════════════════════',
  '  GOOGLE PLAY CONSOLE — COPY/PASTE',
  '═══════════════════════════════════════════════════════════════',
  '',
  'Release title (Play Console → Release name):',
  `  ${releaseTitle}`,
  '',
  'Beta label (for your records / changelog):',
  `  ${label}`,
  '',
  'Public AAB download link (share / verify after deploy):',
  `  ${aabPublicUrl}`,
  '',
  'Public APK download link (sideload page):',
  `  ${apkPublicUrl}`,
  '',
  'Package name:',
  '  org.sacramentobuynothing.app',
  '',
  'Upload this file in Play Console:',
  `  ${aabPath}`,
  '  (local build copy: dist/android/sac-buy-nothing-release.aab)',
  '',
  'Play Console path:',
  '  Testing → Internal testing → Create release → Upload AAB',
  '',
  'Release notes (paste into Play Console release notes field):',
  '───────────────────────────────────────────────────────────────',
  releaseNotesBody,
  '───────────────────────────────────────────────────────────────',
  '',
  'Steps:',
  '  1. Open Play Console → SacramentoBuyNothing',
  '  2. Testing → Internal testing → Create release',
  `  3. Upload: ${aabPath}`,
  `  4. Release name: ${releaseTitle}`,
  '  5. Paste release notes above',
  '  6. Save → Review release → Start rollout to Internal testing',
  '',
];

const output = lines.join('\n');
console.log(output);

if (writeFile) {
  const outPath = path.join(root, 'play-store-assets/play-console-paste.txt');
  fs.writeFileSync(outPath, `${output}\n`);
  console.log(`\nSaved: play-store-assets/play-console-paste.txt`);
}
