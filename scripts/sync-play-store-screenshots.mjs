#!/usr/bin/env node
/**
 * Copy Play listing graphics into public/downloads/play-store/ for director downloads.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const assetsDir = join(root, 'play-store-assets');
const outDir = join(root, 'public', 'downloads', 'play-store');

const PHONE_SHOTS = [
  ['01-home.png', 'Public newspaper home'],
  ['02-feed.png', 'Feed — neighbor social posts'],
  ['03-stuff.png', 'Stuff — giveaways and requests'],
  ['04-listing.png', 'Listing detail'],
  ['05-map.png', 'Neighborhood map'],
  ['06-events.png', 'Community events'],
  ['07-event.png', 'Event detail'],
  ['08-messages.png', 'Messages'],
];

export function syncPlayStoreScreenshots() {
  mkdirSync(outDir, { recursive: true });

  for (const name of readdirSync(outDir)) {
    if (name.endsWith('.png')) {
      rmSync(join(outDir, name));
    }
  }

  const copies = [
    [join(assetsDir, 'icon-512.png'), join(outDir, 'icon-512.png')],
    [join(assetsDir, 'feature-graphic-1024x500.png'), join(outDir, 'feature-graphic-1024x500.png')],
    ...PHONE_SHOTS.map(([file]) => [join(shotDir, file), join(outDir, file)]),
  ];

  for (const [src, dest] of copies) {
    if (!existsSync(src)) {
      throw new Error(`Missing Play asset: ${src}`);
    }
    copyFileSync(src, dest);
  }

  console.log(`synced ${copies.length} Play assets to ${outDir}`);
  return outDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncPlayStoreScreenshots();
}
