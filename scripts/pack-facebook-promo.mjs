#!/usr/bin/env node
/**
 * Publish Facebook promo graphics for director downloads + zip bundle.
 * Writes public/downloads/facebook/* and public/downloads/facebook-promo.zip
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  FACEBOOK_PROMO_DOCS,
  FACEBOOK_PROMO_IMAGES,
  FACEBOOK_PROMO_VIDEOS,
} from '../shared/facebookPromoAssets.mjs';
import { PLAY_STORE_PHONE_SCREENSHOTS } from '../shared/playStoreAssets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const promoDir = join(root, 'facebook-promo-assets');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const outDir = join(root, 'public', 'downloads');
const assetOutDir = join(outDir, 'facebook');
const zipPath = join(outDir, 'facebook-promo.zip');

function copyAsset(src, destFileName) {
  const dest = join(assetOutDir, destFileName);
  if (!existsSync(src)) {
    throw new Error(`Missing Facebook promo asset: ${src}`);
  }
  copyFileSync(src, dest);
  return dest;
}

export function packFacebookPromoZip() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(assetOutDir, { recursive: true });
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  const staging = mkdtempSync(join(tmpdir(), 'facebook-promo-'));
  mkdirSync(join(staging, 'promo-images'));
  mkdirSync(join(staging, 'promo-videos'));
  mkdirSync(join(staging, 'phone-screenshots'));

  const copies = [
    ...FACEBOOK_PROMO_DOCS.map(([file]) => [join(promoDir, file), file]),
    ...FACEBOOK_PROMO_IMAGES.map(([file]) => [join(promoDir, file), file]),
    ...FACEBOOK_PROMO_VIDEOS.map(([file]) => [join(promoDir, file), file]),
  ];

  for (const [src, fileName] of copies) {
    copyAsset(src, fileName);
  }

  for (const [file] of FACEBOOK_PROMO_DOCS) {
    copyFileSync(join(assetOutDir, file), join(staging, file));
  }
  for (const [file] of FACEBOOK_PROMO_IMAGES) {
    copyFileSync(join(assetOutDir, file), join(staging, 'promo-images', file));
  }
  for (const [file] of FACEBOOK_PROMO_VIDEOS) {
    copyFileSync(join(assetOutDir, file), join(staging, 'promo-videos', file));
  }

  const screenshotReadme = [
    'Phone screenshots (1080×1920) from the fictional demo build.',
    'Use these as extra photos, Stories, or carousel slides.',
    '',
    ...PLAY_STORE_PHONE_SCREENSHOTS.map(([file, label], i) => `  ${i + 1}. ${file} — ${label}`),
    '',
  ].join('\n');
  writeFileSync(join(staging, 'phone-screenshots', 'README.txt'), screenshotReadme);

  for (const [file] of PLAY_STORE_PHONE_SCREENSHOTS) {
    const src = join(shotDir, file);
    if (!existsSync(src)) {
      throw new Error(`Missing screenshot ${src}`);
    }
    copyFileSync(src, join(staging, 'phone-screenshots', file));
    copyAsset(src, `screenshot-${file}`);
  }

  const zipArgs = ['-r', '-q', zipPath, '.'];
  let packed = spawnSync('zip', zipArgs, { encoding: 'utf8', cwd: staging });
  if (packed.error || packed.status !== 0) {
    packed = spawnSync(
      'python3',
      [
        '-c',
        `
import zipfile, os
staging = ${JSON.stringify(staging)}
zip_path = ${JSON.stringify(zipPath)}
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(staging):
        for name in files:
            full = os.path.join(root, name)
            zf.write(full, os.path.relpath(full, staging))
`,
      ],
      { encoding: 'utf8' },
    );
  }

  rmSync(staging, { recursive: true, force: true });

  if (packed.status !== 0) {
    throw new Error(`Could not write ${zipPath}: ${packed.stderr || packed.stdout}`);
  }
  console.log(`wrote ${assetOutDir}`);
  console.log(`wrote ${zipPath}`);
  return zipPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  packFacebookPromoZip();
}
