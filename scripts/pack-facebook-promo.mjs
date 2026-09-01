#!/usr/bin/env node
/**
 * Publish Facebook ad files for director downloads + zip bundle.
 * Videos from facebook-promo-assets/; screenshots are the same Play Console PNGs.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  FACEBOOK_PROMO_DOCS,
  FACEBOOK_PROMO_IMAGES,
  FACEBOOK_PROMO_VIDEOS,
} from '../shared/facebookPromoAssets.mjs';

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
  rmSync(assetOutDir, { recursive: true, force: true });
  mkdirSync(assetOutDir, { recursive: true });
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  const staging = mkdtempSync(join(tmpdir(), 'facebook-promo-'));

  const copies = [
    ...FACEBOOK_PROMO_DOCS.map(([file]) => [join(promoDir, file), file]),
    ...FACEBOOK_PROMO_VIDEOS.map(([file]) => [join(promoDir, file), file]),
    ...FACEBOOK_PROMO_IMAGES.map(([file]) => [join(shotDir, file), file]),
  ];

  for (const [src, fileName] of copies) {
    copyAsset(src, fileName);
    copyFileSync(join(assetOutDir, fileName), join(staging, fileName));
  }

  const zipArgs = ['-j', '-q', zipPath, ...copies.map(([, fileName]) => join(staging, fileName))];
  let packed = spawnSync('zip', zipArgs, { encoding: 'utf8' });
  if (packed.error || packed.status !== 0) {
    packed = spawnSync(
      'python3',
      [
        '-c',
        `
import zipfile, os
staging = ${JSON.stringify(staging)}
zip_path = ${JSON.stringify(zipPath)}
names = ${JSON.stringify(copies.map(([, name]) => name))}
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for name in names:
        zf.write(os.path.join(staging, name), name)
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
