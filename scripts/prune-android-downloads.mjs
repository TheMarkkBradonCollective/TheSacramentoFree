#!/usr/bin/env node
/**
 * Keep only the current Android download binaries in public/downloads/.
 * Old versioned APK/AAB pairs bloat every Vercel deploy (100 MB Hobby / 1 GB Pro limits).
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const downloadsDir = join(root, 'public', 'downloads');
const manifestPath = join(root, 'public', 'android-version.json');

const VERSIONED_APK = /^sac-buy-nothing-beta-v.+\.apk$/;
const VERSIONED_AAB = /^sac-buy-nothing-beta-v.+\.aab$/;

function readManifest() {
  if (!existsSync(manifestPath)) {
    return { fileName: null, aabFileName: null, versionName: null };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return {
    fileName: typeof manifest.fileName === 'string' ? manifest.fileName : null,
    aabFileName: typeof manifest.aabFileName === 'string' ? manifest.aabFileName : null,
    versionName: typeof manifest.versionName === 'string' ? manifest.versionName : null,
  };
}

export function pruneAndroidDownloads() {
  if (!existsSync(downloadsDir)) {
    return { removed: [], kept: [] };
  }

  const { fileName: keepApk, aabFileName: keepAab, versionName } = readManifest();
  const removed = [];
  const kept = [];

  for (const name of readdirSync(downloadsDir)) {
    const path = join(downloadsDir, name);
    if (!statSync(path).isFile()) continue;

    const isOldApk = VERSIONED_APK.test(name) && name !== keepApk;
    const isOldAab = VERSIONED_AAB.test(name) && name !== keepAab;
    if (!isOldApk && !isOldAab) {
      kept.push(name);
      continue;
    }

    rmSync(path);
    removed.push(name);
  }

  const publicDir = join(root, 'public');
  const keepMarketApk = versionName ? `buynothing-v${versionName}.apk` : null;
  if (existsSync(publicDir)) {
    for (const name of readdirSync(publicDir)) {
      if (!/^buynothing-v.+\.apk$/.test(name)) continue;
      if (name === keepMarketApk) {
        kept.push(`public/${name}`);
        continue;
      }
      rmSync(join(publicDir, name));
      removed.push(`public/${name}`);
    }
  }

  return { removed, kept, keepApk, keepAab };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = pruneAndroidDownloads();
  if (result.removed.length === 0) {
    console.log('No old Android downloads to prune.');
  } else {
    console.log(`Pruned ${result.removed.length} old download(s):`);
    for (const name of result.removed) console.log(`  - ${name}`);
  }
  console.log(`Keeping APK: ${result.keepApk ?? '(none)'}`);
  console.log(`Keeping AAB: ${result.keepAab ?? '(none)'}`);
}
