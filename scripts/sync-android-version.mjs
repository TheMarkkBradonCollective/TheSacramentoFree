import fs from 'fs';
import path from 'path';
import { readAppVersion } from './read-app-version.mjs';

const root = process.cwd();
const manifestPath = path.join(root, 'public/android-version.json');
const { versionName, versionCode, label } = readAppVersion();

const releaseTag = `android-v${versionName}`;
const fileName = 'sac-buy-nothing.apk';
/** Always host the downloadable APK on the public site — private GitHub Releases 404 for neighbors. */
const appOrigin = (process.env.VITE_APP_URL || process.env.APP_URL || 'https://www.sacramentobuynothing.com').replace(/\/$/, '');
const downloadUrl = `${appOrigin}/downloads/${fileName}`;

const manifest = {
  versionName,
  versionCode,
  betaLabel: label,
  downloadUrl,
  releaseTag,
  publishedAt: new Date().toISOString(),
  fileName,
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Synced public/android-version.json → ${versionName} (${versionCode})`);
console.log(`Download URL: ${downloadUrl}`);
