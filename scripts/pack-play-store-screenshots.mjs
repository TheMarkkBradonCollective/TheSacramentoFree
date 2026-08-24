#!/usr/bin/env node
/**
 * Zip Play listing graphics for the director download button.
 * Writes public/downloads/play-store-screenshots.zip
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const assetsDir = join(root, 'play-store-assets');
const outDir = join(root, 'public', 'downloads');
const zipPath = join(outDir, 'play-store-screenshots.zip');

const PHONE_SHOTS = [
  ['01-home.png', 'Public newspaper home'],
  ['02-feed.png', 'Feed — neighbor social posts'],
  ['03-stuff.png', 'Stuff — giveaways and requests'],
  ['04-listing.png', 'Listing detail'],
  ['05-map.png', 'Neighborhood map'],
  ['06-events.png', 'Community events'],
  ['07-event.png', 'Event detail'],
  ['08-messages.png', 'Messages'],
  ['09-goget-listing.png', 'Go Get — listing pickup route'],
  ['10-goget-chat.png', 'Go Get — chat coordination'],
  ['11-goget-ring.png', 'Go Get — incoming pickup ring'],
  ['12-goget-waiting.png', 'Go Get — waiting for neighbor'],
  ['13-goget-navigation.png', 'Go Get — turn-by-turn navigation'],
  ['14-goget-tracking.png', 'Go Get — live ETA tracking'],
  ['15-goget-meeting.png', 'Go Get — meetup map'],
  ['16-goget-arrived.png', 'Go Get — arrival handoff'],
];

export function packPlayStoreScreenshotsZip() {
  mkdirSync(outDir, { recursive: true });
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
    '  icon-512.png',
    '',
    'Feature graphic (1024×500):',
    '  feature-graphic-1024x500.png',
    '',
    'Phone screenshots (1080×1920) — upload in this order:',
    ...PHONE_SHOTS.map(([file, label], i) => `  ${i + 1}. ${file} — ${label}`),
    '',
    'Go Get screenshots (09–16) use fictional Sacramento landmarks (Capitol, Midtown, East Sac, etc.).',
    '',
  ].join('\n');
  writeFileSync(join(staging, 'README.txt'), readme);

  const copies = [
    [join(assetsDir, 'icon-512.png'), join(staging, 'icon-512.png')],
    [join(assetsDir, 'feature-graphic-1024x500.png'), join(staging, 'feature-graphic-1024x500.png')],
    ...PHONE_SHOTS.map(([file]) => [join(shotDir, file), join(staging, file)]),
  ];

  for (const [src, dest] of copies) {
    if (!existsSync(src)) {
      throw new Error(`Missing Play asset: ${src}`);
    }
    copyFileSync(src, dest);
  }

  const zipArgs = ['-j', '-q', zipPath, join(staging, 'README.txt'), join(staging, 'icon-512.png'), join(staging, 'feature-graphic-1024x500.png'), ...PHONE_SHOTS.map(([file]) => join(staging, file))];
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
names = ['README.txt', 'icon-512.png', 'feature-graphic-1024x500.png'] + ${JSON.stringify(PHONE_SHOTS.map(([file]) => file))}
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
  packPlayStoreScreenshotsZip();
}
