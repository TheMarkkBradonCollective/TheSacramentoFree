import fs from 'fs';
import path from 'path';
import { readAppVersion } from './read-app-version.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'public/android-version.json');
const { versionName, versionCode, label, build } = readAppVersion();

const releaseTag = `android-v${versionName}`;
const fileName = `sac-buy-nothing-beta-v${versionName}.${build}.apk`;
const aabFileName = `sac-buy-nothing-beta-v${versionName}.${build}.aab`;
const legacyFileName = 'sac-buy-nothing.apk';
const legacyAabFileName = 'sac-buy-nothing.aab';
/** Always host the downloadable APK on the public site — private GitHub Releases 404 for neighbors. */
const appOrigin = (process.env.VITE_APP_URL || process.env.APP_URL || 'https://www.sacramentobuynothing.com').replace(/\/$/, '');
const downloadUrl = `${appOrigin}/downloads/${fileName}`;
const aabDownloadUrl = `${appOrigin}/downloads/${aabFileName}`;

const manifest = {
  versionName,
  versionCode,
  betaLabel: label,
  downloadUrl,
  aabDownloadUrl,
  releaseTag,
  publishedAt: new Date().toISOString(),
  fileName,
  aabFileName,
  legacyAabFileName,
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synced public/android-version.json → ${versionName} (${versionCode})`);
console.log(`APK download URL: ${downloadUrl}`);
console.log(`AAB download URL: ${aabDownloadUrl}`);
