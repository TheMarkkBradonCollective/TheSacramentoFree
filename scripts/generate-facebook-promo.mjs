#!/usr/bin/env node
/**
 * Build a Facebook video ad for TheSacramentoFree — live demo-app footage
 * with branded intro/outro. Screenshots in the zip are the Play Console PNGs.
 *
 *   npm run facebook:promo
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packFacebookPromoZip } from './pack-facebook-promo.mjs';
import { recordFacebookAdDemo } from './record-facebook-ad-demo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconSrc = join(root, 'play-store-assets', 'icon-512.png');
const outDir = join(root, 'facebook-promo-assets');
const workDir = join(outDir, '.work');

const GREEN = '0x00845A';
const CREAM = '0xF6F3EA';
const INK = '0x0B0B0C';
const MUTED = '0x52525B';
const WHITE = '0xFFFFFF';

const FONT_BOLD = fontPath([
  '/usr/share/fonts/truetype/macos/Inter-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]);
const FONT_SEMI = fontPath([
  '/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]);
const FONT_MED = fontPath([
  '/usr/share/fonts/truetype/macos/Inter-Medium.ttf',
  '/usr/share/fonts/truetype/macos/Inter-Regular.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]);

function fontPath(candidates) {
  return candidates.find((p) => existsSync(p)) || candidates[candidates.length - 1];
}

function ffText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
}

function runFfmpeg(args, label) {
  const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${label || 'ffmpeg'} failed: ${result.stderr || result.stdout || result.status}`);
  }
}

function probeDuration(file) {
  const out = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' },
  );
  const n = Number.parseFloat(out.stdout.trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Could not read duration for ${file}`);
  return n;
}

function drawtext({ font, text, size, color, x, y, enable }) {
  const extra = enable ? `:enable='${enable}'` : '';
  return `drawtext=fontfile=${font}:text='${ffText(text)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}${extra}`;
}

function cardClip({ dest, width, height, seconds, logoSize, lines }) {
  const filters = [
    `[0:v]format=yuv420p[base]`,
    `[1:v]scale=${logoSize}:${logoSize}:flags=lanczos,format=rgba[logo]`,
    `color=c=${GREEN}:s=${width}x12,format=yuv420p[bar]`,
    `[base][bar]overlay=0:0[b1]`,
    `[b1][logo]overlay=(W-w)/2:${Math.round(height * 0.2)}[b2]`,
  ];
  let last = '[b2]';
  for (const [i, line] of lines.entries()) {
    const label = i === lines.length - 1 ? 'out' : `t${i}`;
    filters.push(`${last}${drawtext(line)}[${label}]`);
    last = `[${label}]`;
  }
  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${CREAM}:s=${width}x${height}:d=${seconds}:r=30`,
      '-loop',
      '1',
      '-i',
      iconSrc,
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-t',
      String(seconds),
      '-r',
      '30',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      dest,
    ],
    dest,
  );
}

function productClip({ demo, dest, width, height, phoneH, captions }) {
  const duration = probeDuration(demo);
  const captionH = 118;
  const phoneY = Math.max(36, Math.round((height - captionH - phoneH) / 2.4));
  const filters = [
    `[0:v]scale=-1:${phoneH}:flags=lanczos,format=yuv420p,setsar=1[phone]`,
    `[1:v]format=yuv420p[bg]`,
    `color=c=${GREEN}:s=${width}x${captionH},format=yuv420p[cap]`,
    `[bg][phone]overlay=(W-w)/2:${phoneY}[withphone]`,
    `[withphone][cap]overlay=0:${height - captionH}[bar]`,
    `[bar]${drawtext({
      font: FONT_BOLD,
      text: 'The Sacramento Free',
      size: 28,
      color: WHITE,
      x: '(w-text_w)/2',
      y: height - captionH + 18,
    })}[n]`,
  ];
  let last = '[n]';
  for (const [i, cap] of captions.entries()) {
    const label = i === captions.length - 1 ? 'out' : `c${i}`;
    filters.push(
      `${last}${drawtext({
        font: FONT_SEMI,
        text: cap.text,
        size: 22,
        color: WHITE,
        x: '(w-text_w)/2',
        y: height - captionH + 56,
        enable: cap.enable,
      })}[${label}]`,
    );
    last = `[${label}]`;
  }

  runFfmpeg(
    [
      '-i',
      demo,
      '-f',
      'lavfi',
      '-i',
      `color=c=${CREAM}:s=${width}x${height}:d=${duration}:r=30`,
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-t',
      String(duration),
      '-r',
      '30',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      dest,
    ],
    dest,
  );
}

function stillBeatClip({ shot, dest, width, height, phoneH, seconds, caption }) {
  const captionH = 118;
  const phoneY = Math.max(36, Math.round((height - captionH - phoneH) / 2.4));
  const filters = [
    `[0:v]scale=-1:${phoneH}:flags=lanczos,format=yuv420p,setsar=1[phone]`,
    `[1:v]format=yuv420p[bg]`,
    `color=c=${GREEN}:s=${width}x${captionH},format=yuv420p[cap]`,
    `[bg][phone]overlay=(W-w)/2:${phoneY}[withphone]`,
    `[withphone][cap]overlay=0:${height - captionH}[bar]`,
    `[bar]${drawtext({
      font: FONT_BOLD,
      text: 'The Sacramento Free',
      size: 28,
      color: WHITE,
      x: '(w-text_w)/2',
      y: height - captionH + 18,
    })}[n]`,
    `[n]${drawtext({
      font: FONT_SEMI,
      text: caption,
      size: 22,
      color: WHITE,
      x: '(w-text_w)/2',
      y: height - captionH + 56,
    })}[out]`,
  ];
  runFfmpeg(
    [
      '-loop',
      '1',
      '-framerate',
      '30',
      '-t',
      String(seconds),
      '-i',
      shot,
      '-f',
      'lavfi',
      '-i',
      `color=c=${CREAM}:s=${width}x${height}:d=${seconds}:r=30`,
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-t',
      String(seconds),
      '-r',
      '30',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      dest,
    ],
    dest,
  );
}

function concatAd(clips, dest) {
  const fade = 0.22;
  const inputs = clips.flatMap((c) => ['-i', c.file]);
  let filter = '';
  let last = '[0:v]';
  let timeline = clips[0].seconds;
  for (let i = 1; i < clips.length; i++) {
    const offset = timeline - fade;
    const out = i === clips.length - 1 ? '[vout]' : `[v${i}]`;
    filter += `${last}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset}${out};`;
    last = out;
    timeline += clips[i].seconds - fade;
  }
  runFfmpeg(
    [
      ...inputs,
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-filter_complex',
      filter.replace(/;$/, ''),
      '-map',
      '[vout]',
      '-map',
      `${clips.length}:a`,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-shortest',
      '-movflags',
      '+faststart',
      dest,
    ],
    dest,
  );
  console.log(`wrote ${dest}`);
}

function writeDocs() {
  const readme = `The Sacramento Free — Facebook ad pack
======================================

Fictional demo neighbors only. Do not post live member names or photos.

What to upload
--------------
1. Video (recommended): ad-portrait.mp4
   Facebook feed 4:5 (1080×1350). Live app footage + brand open/close.
2. Square video (optional): ad-square.mp4
   Same ad, 1080×1080.
3. Screenshots: 01-home.png through 16-goget-arrived.png
   Same 1080×1920 phone captures as Play Console (no frames, no posters).
   Use as extra photos on the timeline if you want.

Caption: paste from POST-COPY.txt.

Regenerate
----------
npm run android:play-screenshots   # refresh Play/Facebook screenshots
npm run facebook:promo             # rebuild the video ad + zip
`;

  const captions = `The Sacramento Free — Facebook ad caption
========================================
Paste this with ad-portrait.mp4 (or the square video).

---

Neighbors: Sacramento has a free gifting app.

Give what you can. Ask for what you need. Pick it up from a porch.

No selling. No bidding. No flipping. No ads.

TheSacramentoFree — Give freely. Ask kindly.

Join on the web:
https://www.sacramentobuynothing.com

Android (closed testing — free to opt in):
https://play.google.com/apps/testing/org.sacramentobuynothing.app

#TheSacramentoFree #Sacramento #GiveFreelyAskKindly #NeighborsHelpingNeighbors
`;

  writeFileSync(join(outDir, 'README.txt'), readme);
  writeFileSync(join(outDir, 'POST-COPY.txt'), captions);
}

function clearGenerated(dir, keep) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (keep.has(name)) continue;
    const ext = extname(name).toLowerCase();
    if (['.png', '.mp4', '.txt', '.jpg'].includes(ext) || name.startsWith('screenshot-')) {
      unlinkSync(join(dir, name));
    }
  }
}

async function main() {
  if (!existsSync(iconSrc)) throw new Error(`Missing ${iconSrc}`);
  mkdirSync(outDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

  console.log('Recording live demo app for the ad…');
  const demo = await recordFacebookAdDemo();

  const introS = 3.0;
  const outroS = 3.4;

  function buildVersion(width, height, phoneH, videoName) {
    const intro = join(workDir, `intro-${width}x${height}.mp4`);
    const product = join(workDir, `product-${width}x${height}.mp4`);
    const outro = join(workDir, `outro-${width}x${height}.mp4`);

    cardClip({
      dest: intro,
      width,
      height,
      seconds: introS,
      logoSize: width >= 1080 ? 220 : 180,
      lines: [
        {
          font: FONT_BOLD,
          text: 'The Sacramento Free',
          size: width >= 1080 ? 46 : 38,
          color: INK,
          x: '(w-text_w)/2',
          y: Math.round(height * 0.48),
        },
        {
          font: FONT_SEMI,
          text: 'Give freely. Ask kindly.',
          size: 28,
          color: GREEN,
          x: '(w-text_w)/2',
          y: Math.round(height * 0.56),
        },
        {
          font: FONT_MED,
          text: 'No selling  ·  No ads  ·  Sacramento',
          size: 22,
          color: MUTED,
          x: '(w-text_w)/2',
          y: Math.round(height * 0.78),
        },
      ],
    });

    const goget = join(workDir, `goget-${width}x${height}.mp4`);
    const gogetS = 3.1;
    const gogetShot = join(root, 'play-store-assets', 'screenshots', '13-goget-navigation.png');

    productClip({
      demo,
      dest: product,
      width,
      height,
      phoneH,
      captions: [
        { text: 'Free giveaways from neighbors', enable: 'lt(t,4.4)' },
        { text: 'Give it away. Pick it up free.', enable: 'gte(t,4.4)' },
      ],
    });

    stillBeatClip({
      shot: gogetShot,
      dest: goget,
      width,
      height,
      phoneH,
      seconds: gogetS,
      caption: 'Go Get — live porch pickup',
    });

    cardClip({
      dest: outro,
      width,
      height,
      seconds: outroS,
      logoSize: width >= 1080 ? 200 : 170,
      lines: [
        {
          font: FONT_BOLD,
          text: 'Join your neighbors',
          size: width >= 1080 ? 44 : 36,
          color: INK,
          x: '(w-text_w)/2',
          y: Math.round(height * 0.48),
        },
        {
          font: FONT_SEMI,
          text: 'sacramentobuynothing.com',
          size: 28,
          color: GREEN,
          x: '(w-text_w)/2',
          y: Math.round(height * 0.56),
        },
        {
          font: FONT_MED,
          text: 'Free to join  ·  Closed testing on Android',
          size: 20,
          color: MUTED,
          x: '(w-text_w)/2',
          y: Math.round(height * 0.78),
        },
      ],
    });

    concatAd(
      [
        { file: intro, seconds: introS },
        { file: product, seconds: probeDuration(product) },
        { file: goget, seconds: gogetS },
        { file: outro, seconds: outroS },
      ],
      join(outDir, videoName),
    );
  }

  console.log('Cutting portrait ad…');
  buildVersion(1080, 1350, 1100, 'ad-portrait.mp4');
  console.log('Cutting square ad…');
  buildVersion(1080, 1080, 820, 'ad-square.mp4');

  writeDocs();

  const keepOut = new Set([
    '.gitignore',
    'README.md',
    '.work',
    'ad-portrait.mp4',
    'ad-square.mp4',
    'README.txt',
    'POST-COPY.txt',
  ]);
  clearGenerated(outDir, keepOut);

  const publicFacebook = join(root, 'public', 'downloads', 'facebook');
  if (existsSync(publicFacebook)) {
    rmSync(publicFacebook, { recursive: true, force: true });
  }

  packFacebookPromoZip();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
