#!/usr/bin/env node
/**
 * Build the 512×512 Play Store icon from public/app-icon.png.
 * When the source is already 512×512, copy it as 32-bit RGBA. Legacy masthead
 * lockups are scaled down and centered on their corner fill.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** ~76% of 512px — inside Play/Android circular safe zone. */
const SAFE_MAX = 390;

function sampleCornerFillHex(src) {
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', src, '-vf', 'crop=12:12:0:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    { maxBuffer: 1024 },
  );
  let r = 0;
  let g = 0;
  let b = 0;
  const n = raw.length / 3;
  for (let i = 0; i < raw.length; i += 3) {
    r += raw[i];
    g += raw[i + 1];
    b += raw[i + 2];
  }
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  return `0x${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function readDimensions(src) {
  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src],
    { encoding: 'utf8' },
  ).trim();
  const [width, height] = probe.split(',').map(Number);
  if (!width || !height) {
    throw new Error(`Could not read dimensions for ${src}`);
  }
  return { width, height };
}

export function generatePlayStoreIcon(src, dest) {
  const { width, height } = readDimensions(src);
  if (width === 512 && height === 512) {
    execFileSync(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-pix_fmt', 'rgba', dest],
      { stdio: 'inherit' },
    );
    return;
  }

  const bg = sampleCornerFillHex(src);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-i',
      src,
      '-f',
      'lavfi',
      '-i',
      `color=c=${bg}:s=512x512`,
      '-filter_complex',
      `[0:v]scale=${SAFE_MAX}:${SAFE_MAX}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba[logo];[1:v][logo]overlay=(W-w)/2:(H-h)/2,format=rgba`,
      '-frames:v',
      '1',
      '-pix_fmt',
      'rgba',
      dest,
    ],
    { stdio: 'inherit' },
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const src = process.argv[2] || join(root, 'public', 'app-icon.png');
  const dest = process.argv[3] || join(root, 'play-store-assets', 'icon-512.png');
  generatePlayStoreIcon(src, dest);
  console.log(`wrote ${dest}`);
}
