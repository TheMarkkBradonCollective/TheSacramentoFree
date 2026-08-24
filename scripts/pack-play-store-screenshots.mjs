#!/usr/bin/env node
/**
 * Publish Play listing graphics for director downloads + zip bundle.
 * Writes public/downloads/play-store/* and public/downloads/play-store-screenshots.zip
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  PLAY_STORE_FEATURE_GRAPHIC,
  PLAY_STORE_ICON,
  PLAY_STORE_PHONE_SCREENSHOTS,
} from '../shared/playStoreAssets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const assetsDir = join(root, 'play-store-assets');
const outDir = join(root, 'public', 'downloads');
const assetOutDir = join(outDir, 'play-store');
const zipPath = join(outDir, 'play-store-screenshots.zip');

function copyAsset(src, destFileName) {
  const dest = join(assetOutDir, destFileName);
  if (!existsSync(src)) {
    throw new Error(`Missing Play asset: ${src}`);
  }
  copyFileSync(src, dest);
  return dest;
}

export function packPlayStoreScreenshotsZip() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(assetOutDir, { recursive: true });
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  const staging = mkdtempSync(join(tmpdir(), 'play-store-screenshots-'));
  const readme = [
    'SacramentoBuyNothing — Google Play listing graphics',
    '',
    'Fictional demo neighbors only. Do not upload live member photos.',
    '',
    'Play Console → Store presence → Main store listing',
    '',
    'Store icon (512×512, 32-bit PNG — website masthead lockup):',
    `  ${PLAY_STORE_ICON.file}`,
    '',
    'Feature graphic (1024×500):',
    `  ${PLAY_STORE_FEATURE_GRAPHIC.file}`,
    '',
    'Phone screenshots (1080×1920) — upload in this order:',
    ...PLAY_STORE_PHONE_SCREENSHOTS.map(([file, label], i) => `  ${i + 1}. ${file} — ${label}`),
    '',
    'Go Get screenshots (09–16) use fictional Sacramento landmarks (Capitol, Midtown, East Sac, etc.).',
    '',
    'Individual files are also at /downloads/play-store/ on the live site.',
    '',
  ].join('\n');
  writeFileSync(join(staging, 'README.txt'), readme);

  const copies = [
    [join(assetsDir, PLAY_STORE_ICON.file), PLAY_STORE_ICON.file],
    [join(assetsDir, PLAY_STORE_FEATURE_GRAPHIC.file), PLAY_STORE_FEATURE_GRAPHIC.file],
    ...PLAY_STORE_PHONE_SCREENSHOTS.map(([file]) => [join(shotDir, file), file]),
  ];

  for (const [src, fileName] of copies) {
    copyAsset(src, fileName);
    copyFileSync(join(assetOutDir, fileName), join(staging, fileName));
  }

  const zipArgs = [
    '-j',
    '-q',
    zipPath,
    join(staging, 'README.txt'),
    join(staging, PLAY_STORE_ICON.file),
    join(staging, PLAY_STORE_FEATURE_GRAPHIC.file),
    ...PLAY_STORE_PHONE_SCREENSHOTS.map(([file]) => join(staging, file)),
  ];
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
names = ['README.txt', ${JSON.stringify(PLAY_STORE_ICON.file)}, ${JSON.stringify(PLAY_STORE_FEATURE_GRAPHIC.file)}] + ${JSON.stringify(PLAY_STORE_PHONE_SCREENSHOTS.map(([file]) => file))}
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
  console.log(`wrote ${assetOutDir} (${copies.length} files)`);
  console.log(`wrote ${zipPath}`);
  return zipPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  packPlayStoreScreenshotsZip();
}
