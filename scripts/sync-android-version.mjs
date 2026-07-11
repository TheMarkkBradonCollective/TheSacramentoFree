import fs from 'fs';
import path from 'path';

const root = process.cwd();
const gradlePath = path.join(root, 'android/app/build.gradle');
const manifestPath = path.join(root, 'public/android-version.json');

const gradle = fs.readFileSync(gradlePath, 'utf8');
const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? '1.0.0';
const versionCode = Number.parseInt(gradle.match(/versionCode\s+(\d+)/)?.[1] ?? '1', 10);

const existing = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};

const releaseTag = `android-v${versionName}`;
const downloadUrl =
  existing.downloadUrl?.includes(releaseTag)
    ? existing.downloadUrl
    : `https://github.com/sigsecspec/SacramentoBuyNothing/releases/download/${releaseTag}/sac-buy-nothing-debug.apk`;

const manifest = {
  versionName,
  versionCode,
  downloadUrl,
  releaseTag,
  publishedAt: existing.publishedAt ?? new Date().toISOString(),
  fileName: existing.fileName ?? 'sac-buy-nothing-debug.apk',
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synced public/android-version.json → ${versionName} (${versionCode})`);
