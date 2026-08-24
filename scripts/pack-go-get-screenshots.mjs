#!/usr/bin/env node
/**
 * Zip Go Get promo screenshots for the director download button.
 * Writes public/downloads/go-get-screenshots.zip
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const outDir = join(root, 'public', 'downloads');
const zipPath = join(outDir, 'go-get-screenshots.zip');

const GOGET_SHOTS = [
  ['09-goget-listing.png', 'Listing pickup route'],
  ['10-goget-chat.png', 'Chat coordination'],
  ['11-goget-ring.png', 'Incoming pickup ring'],
  ['12-goget-waiting.png', 'Waiting for neighbor'],
  ['13-goget-navigation.png', 'Turn-by-turn navigation'],
  ['14-goget-tracking.png', 'Live ETA tracking'],
  ['15-goget-meeting.png', 'Meetup map'],
  ['16-goget-arrived.png', 'Arrival handoff'],
];

export function packGoGetScreenshotsZip() {
  mkdirSync(outDir, { recursive: true });
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  const staging = mkdtempSync(join(tmpdir(), 'go-get-screenshots-'));
  const readme = [
    'SacramentoBuyNothing — Go Get pickup coordination screenshots',
    '',
    'Fictional demo neighbors and Sacramento landmarks only (Capitol, Midtown, East Sac, etc.).',
    'Do not upload live member photos.',
    '',
    'Phone screenshots (1080×1920):',
    ...GOGET_SHOTS.map(([file, label], i) => `  ${i + 1}. ${file} — ${label}`),
    '',
    'Regenerate: npm run android:play-screenshots',
    '',
  ].join('\n');
  writeFileSync(join(staging, 'README.txt'), readme);

  for (const [file] of GOGET_SHOTS) {
    const src = join(shotDir, file);
    if (!existsSync(src)) {
      throw new Error(`Missing Go Get screenshot: ${src}`);
    }
    copyFileSync(src, join(staging, file));
  }

  const names = ['README.txt', ...GOGET_SHOTS.map(([file]) => file)];
  const zipArgs = ['-j', '-q', zipPath, ...names.map((name) => join(staging, name))];
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
names = ${JSON.stringify(names)}
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
  console.log(`wrote ${zipPath}`);
  return zipPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  packGoGetScreenshotsZip();
}
