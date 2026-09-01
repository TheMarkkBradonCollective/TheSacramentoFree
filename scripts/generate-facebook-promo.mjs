#!/usr/bin/env node
/**
 * Build Facebook timeline promo images + screenshot-tour videos from the
 * fictional Play Store demo screenshots (never live member data).
 *
 *   npm run facebook:promo
 *
 * Reads play-store-assets/screenshots/*.png
 * Writes facebook-promo-assets/ and public/downloads/facebook/
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packFacebookPromoZip } from './pack-facebook-promo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const iconSrc = join(root, 'play-store-assets', 'icon-512.png');
const outDir = join(root, 'facebook-promo-assets');
const workDir = join(outDir, '.work');

const GREEN = '0x00845A';
const GREEN_DARK = '0x006B46';
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

function requireShot(name) {
  const path = join(shotDir, name);
  if (!existsSync(path)) {
    throw new Error(`Missing screenshot ${path} — run npm run android:play-screenshots first`);
  }
  return path;
}

/** Rounded-rect alpha mask via geq, then overlay on a bezel. */
function phoneMockup(src, dest, phoneH, radius = 28, bezel = 10) {
  const workPhone = join(workDir, `phone-${phoneH}.png`);
  runFfmpeg(
    [
      '-i',
      src,
      '-frames:v',
      '1',
      '-vf',
      `scale=-1:${phoneH}:flags=lanczos,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(abs(W/2-X),W/2-${radius})*gt(abs(H/2-Y),H/2-${radius}),if(lte(hypot(${radius}-(W/2-abs(W/2-X)),${radius}-(H/2-abs(H/2-Y))),${radius}),255,0),255)'`,
      workPhone,
    ],
    `round ${src}`,
  );

  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', workPhone],
    { encoding: 'utf8' },
  );
  const [pw, ph] = probe.stdout.trim().split(',').map(Number);
  const bw = pw + bezel * 2;
  const bh = ph + bezel * 2;
  const bezelR = radius + 6;
  const bezelFile = join(workDir, `bezel-${bw}x${bh}.png`);

  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${INK}:s=${bw}x${bh},format=rgba`,
      '-frames:v',
      '1',
      '-vf',
      `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(abs(W/2-X),W/2-${bezelR})*gt(abs(H/2-Y),H/2-${bezelR}),if(lte(hypot(${bezelR}-(W/2-abs(W/2-X)),${bezelR}-(H/2-abs(H/2-Y))),${bezelR}),255,0),255)'`,
      bezelFile,
    ],
    'bezel',
  );

  runFfmpeg(
    [
      '-i',
      bezelFile,
      '-i',
      workPhone,
      '-frames:v',
      '1',
      '-filter_complex',
      `[0:v][1:v]overlay=${bezel}:${bezel}:format=auto`,
      '-pix_fmt',
      'rgba',
      dest,
    ],
    `phone ${dest}`,
  );
  return dest;
}

function drawtext({ font, text, size, color, x, y }) {
  return `drawtext=fontfile=${font}:text='${ffText(text)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}`;
}

function composePoster({
  dest,
  width,
  height,
  phone,
  logoSize,
  logoX,
  logoY,
  phoneX,
  phoneY,
  texts,
  bg = CREAM,
  topBar = true,
}) {
  const filters = [];
  let last = '[base]';
  const inputs = ['-f', 'lavfi', '-i', `color=c=${bg}:s=${width}x${height}`, '-i', iconSrc, '-i', phone];

  filters.push(`[0:v]format=rgba[base]`);
  filters.push(`[1:v]scale=${logoSize}:${logoSize}:flags=lanczos,format=rgba[logo]`);
  filters.push(`${last}[logo]overlay=${logoX}:${logoY}[withlogo]`);
  last = '[withlogo]';

  if (topBar) {
    filters.push(
      `color=c=${GREEN}:s=${width}x10,format=rgba[bar]`,
      `${last}[bar]overlay=0:0[withbar]`,
    );
    last = '[withbar]';
  }

  filters.push(`[2:v]format=rgba[phone]`);
  filters.push(`${last}[phone]overlay=${phoneX}:${phoneY}[withphone]`);
  last = '[withphone]';

  for (const [i, t] of texts.entries()) {
    const label = i === texts.length - 1 ? 'out' : `t${i}`;
    filters.push(`${last}${drawtext(t)}[${label}]`);
    last = `[${label}]`;
  }

  runFfmpeg(
    [
      ...inputs,
      '-frames:v',
      '1',
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-pix_fmt',
      'rgb24',
      dest,
    ],
    dest,
  );
  console.log(`wrote ${dest}`);
}

function composeCover({ dest, phone, width = 1640, height = 624 }) {
  const filters = [
    `[0:v]format=rgba[base]`,
    `[1:v]scale=168:168:flags=lanczos,format=rgba[logo]`,
    `[2:v]format=rgba[phone]`,
    `color=c=${GREEN}:s=${width}x12,format=rgba[bar]`,
    `[base][bar]overlay=0:0[b1]`,
    `[b1][logo]overlay=72:210[b2]`,
    `[b2][phone]overlay=1088:48[b3]`,
    `[b3]${drawtext({
      font: FONT_BOLD,
      text: 'The Sacramento Free',
      size: 52,
      color: INK,
      x: 72,
      y: 88,
    })}[t1]`,
    `[t1]${drawtext({
      font: FONT_SEMI,
      text: 'Give freely. Ask kindly.',
      size: 32,
      color: GREEN,
      x: 268,
      y: 248,
    })}[t2]`,
    `[t2]${drawtext({
      font: FONT_MED,
      text: 'No selling  ·  No ads  ·  Sacramento neighbors',
      size: 24,
      color: MUTED,
      x: 268,
      y: 300,
    })}[t3]`,
    `[t3]${drawtext({
      font: FONT_SEMI,
      text: 'sacramentobuynothing.com',
      size: 26,
      color: GREEN_DARK,
      x: 268,
      y: 430,
    })}[out]`,
  ];

  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${CREAM}:s=${width}x${height}`,
      '-i',
      iconSrc,
      '-i',
      phone,
      '-frames:v',
      '1',
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-pix_fmt',
      'rgb24',
      dest,
    ],
    dest,
  );
  console.log(`wrote ${dest}`);
}

function composeLandscape({ dest, phone, width = 1200, height = 630 }) {
  const filters = [
    `[0:v]format=rgba[base]`,
    `[1:v]scale=140:140:flags=lanczos,format=rgba[logo]`,
    `[2:v]format=rgba[phone]`,
    `color=c=${GREEN}:s=${width}x10,format=rgba[bar]`,
    `[base][bar]overlay=0:0[b1]`,
    `[b1][logo]overlay=56:200[b2]`,
    `[b2][phone]overlay=742:36[b3]`,
    `[b3]${drawtext({
      font: FONT_BOLD,
      text: 'The Sacramento Free',
      size: 40,
      color: INK,
      x: 56,
      y: 72,
    })}[t1]`,
    `[t1]${drawtext({
      font: FONT_SEMI,
      text: 'Give freely. Ask kindly.',
      size: 28,
      color: GREEN,
      x: 216,
      y: 232,
    })}[t2]`,
    `[t2]${drawtext({
      font: FONT_MED,
      text: 'Giveaways, requests, map, chat,',
      size: 22,
      color: MUTED,
      x: 216,
      y: 286,
    })}[t3]`,
    `[t3]${drawtext({
      font: FONT_MED,
      text: 'and Go Get pickup — all free.',
      size: 22,
      color: MUTED,
      x: 216,
      y: 316,
    })}[t4]`,
    `[t4]${drawtext({
      font: FONT_SEMI,
      text: 'sacramentobuynothing.com',
      size: 22,
      color: GREEN_DARK,
      x: 216,
      y: 470,
    })}[out]`,
  ];

  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${CREAM}:s=${width}x${height}`,
      '-i',
      iconSrc,
      '-i',
      phone,
      '-frames:v',
      '1',
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-pix_fmt',
      'rgb24',
      dest,
    ],
    dest,
  );
  console.log(`wrote ${dest}`);
}

function composeValuesSquare(dest, phone) {
  const filters = [
    `[0:v]format=rgba[base]`,
    `[1:v]scale=120:120:flags=lanczos,format=rgba[logo]`,
    `[2:v]format=rgba[phone]`,
    `color=c=${GREEN}:s=1080x10,format=rgba[bar]`,
    `[base][bar]overlay=0:0[b1]`,
    `[b1][logo]overlay=72:48[b2]`,
    `[b2][phone]overlay=560:168[b3]`,
    `[b3]${drawtext({ font: FONT_BOLD, text: 'The Sacramento Free', size: 36, color: INK, x: 212, y: 72 })}[t1]`,
    `[t1]${drawtext({ font: FONT_SEMI, text: 'Give freely. Ask kindly.', size: 24, color: GREEN, x: 212, y: 118 })}[t2]`,
    `[t2]${drawtext({ font: FONT_BOLD, text: 'No selling.', size: 42, color: INK, x: 72, y: 240 })}[t3]`,
    `[t3]${drawtext({ font: FONT_BOLD, text: 'No bidding.', size: 42, color: INK, x: 72, y: 310 })}[t4]`,
    `[t4]${drawtext({ font: FONT_BOLD, text: 'No flipping.', size: 42, color: INK, x: 72, y: 380 })}[t5]`,
    `[t5]${drawtext({ font: FONT_SEMI, text: 'Just neighbors', size: 32, color: GREEN, x: 72, y: 470 })}[t6]`,
    `[t6]${drawtext({ font: FONT_SEMI, text: 'helping neighbors.', size: 32, color: GREEN, x: 72, y: 516 })}[t7]`,
    `[t7]${drawtext({ font: FONT_MED, text: 'sacramentobuynothing.com', size: 22, color: MUTED, x: 72, y: 980 })}[out]`,
  ];

  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${CREAM}:s=1080x1080`,
      '-i',
      iconSrc,
      '-i',
      phone,
      '-frames:v',
      '1',
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-pix_fmt',
      'rgb24',
      dest,
    ],
    dest,
  );
  console.log(`wrote ${dest}`);
}

function kenBurnsClip(src, dest, { width, height, seconds = 2.8, fps = 30 }) {
  const frames = Math.round(seconds * fps);
  const scaledW = Math.round(width * 1.18);
  const scaledH = Math.round(height * 1.18);
  runFfmpeg(
    [
      '-loop',
      '1',
      '-framerate',
      String(fps),
      '-i',
      src,
      '-filter_complex',
      `scale=${scaledW}:${scaledH}:flags=lanczos,zoompan=z='min(1+0.0011*on,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},format=yuv420p`,
      '-t',
      String(seconds),
      '-r',
      String(fps),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      dest,
    ],
    dest,
  );
}

function stillClip(src, dest, { width, height, seconds = 3.2, fps = 30 }) {
  runFfmpeg(
    [
      '-loop',
      '1',
      '-framerate',
      String(fps),
      '-i',
      src,
      '-vf',
      `scale=${width}:${height}:flags=lanczos,format=yuv420p`,
      '-t',
      String(seconds),
      '-r',
      String(fps),
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      dest,
    ],
    dest,
  );
}

function xfadeConcat(clips, dest, fade = 0.28) {
  if (clips.length === 1) {
    copyFileSync(clips[0].file, dest);
    return;
  }

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
      '20',
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
  const readme = `The Sacramento Free — Facebook promo pack
========================================

Fictional demo neighbors only. Do not post live member names or photos.

Facebook sizes in this zip
--------------------------
Timeline square (1:1)     1080×1080   — primary feed photo
Timeline portrait (4:5)   1080×1350   — recommended; takes more feed space
Timeline landscape        1200×630    — wide photo / link-style post
Page cover                1640×624    — Facebook Page cover photo
Videos                    1080×1080 and 1080×1350 MP4 (H.264 + silent AAC)

How to post
-----------
1. Open your TheSacramentoFree Facebook Page (or the community group).
2. Create a post → Photo/video → upload a promo image or a video.
3. Paste a caption from POST-COPY.txt.
4. For a carousel: upload carousel-01 through carousel-06 in that order as
   multiple photos in one post.
5. To update the Page cover: Settings → Page info, or click the cover photo
   → Edit → upload 04-page-cover.png.

Suggested first posts
---------------------
• Photo: 02-timeline-portrait-hero.png  (or 01-timeline-square-hero.png)
• Video: timeline-portrait-app-tour.mp4 (or the square tour)
• Carousel: carousel-01 … carousel-06
• Feature: 05-timeline-square-goget.png or 08-timeline-portrait-goget.png
• Cover: 04-page-cover.png

Regenerate
----------
npm run android:play-screenshots   # refresh phone screenshots
npm run facebook:promo             # rebuild images, videos, and this zip

Live download (after deploy)
----------------------------
https://www.sacramentobuynothing.com/downloads/facebook-promo.zip
Staff panel → Account overview → Facebook promo
`;

  const captions = `The Sacramento Free — Facebook captions
======================================
Copy one block per post. Edit the greeting if you like. Do not use the
old “Buy Nothing” product name in new posts.


POST 1 — Hero photo (use 02-timeline-portrait-hero.png or 01-timeline-square-hero.png)
--------------------------------------------------------------------------------------
Neighbors: TheSacramentoFree is Sacramento’s free gifting community.

Give what you can. Ask for what you need. Pick it up from a porch — no money, no ads, no flipping.

Browse giveaways, post a request, RSVP to free events, and message neighbors to set a time.

Join on the web:
https://www.sacramentobuynothing.com

Android (closed testing — free to opt in):
https://play.google.com/apps/testing/org.sacramentobuynothing.app

Give freely. Ask kindly.

#TheSacramentoFree #Sacramento #NeighborsHelpingNeighbors #FreeStuff #SacramentoCommunity


POST 2 — App tour video (use timeline-portrait-app-tour.mp4)
------------------------------------------------------------
A quick look at TheSacramentoFree — Feed, Stuff, Map, Events, chat, and Go Get pickup.

This video uses demo screens (fictional neighbors) so you can see the app without anyone’s real posts.

Website: https://www.sacramentobuynothing.com
Play closed testing: https://play.google.com/apps/testing/org.sacramentobuynothing.app

#TheSacramentoFree #Sacramento #GiveFreelyAskKindly


POST 3 — Carousel (upload carousel-01-home.png through carousel-06-goget.png)
----------------------------------------------------------------------------
Swipe through TheSacramentoFree:

1. Home — today’s giveaways
2. Feed — neighbor posts and check-ins
3. Stuff — furniture, clothes, baby gear, and more
4. Map — what’s nearby
5. Events — free community gatherings
6. Go Get — live pickup in the Android app (ring, GPS, handoff)

No selling. No bidding. No flipping. Just neighbors helping neighbors.

https://www.sacramentobuynothing.com

#TheSacramentoFree #SacramentoNeighbors


POST 4 — Go Get (use 08-timeline-portrait-goget.png or 05-timeline-square-goget.png)
-----------------------------------------------------------------------------------
Go Get is the Android-app way to pick something up.

You tap Go Get on a listing. Their phone rings on a map. If they say yes, you get turn-by-turn GPS and they can watch you come over — like a ride, for a free porch pickup.

Website neighbors still message and set a time the usual way. The live trip is in the app.

Opt in to closed testing:
https://play.google.com/apps/testing/org.sacramentobuynothing.app

#TheSacramentoFree #GoGet #Sacramento


POST 5 — Values (use 07-timeline-square-values.png)
---------------------------------------------------
TheSacramentoFree house rules, in four lines:

No selling.
No bidding.
No flipping.
Just neighbors helping neighbors.

Everything posted must be 100% free.

https://www.sacramentobuynothing.com

#TheSacramentoFree #GiveFreelyAskKindly
`;

  writeFileSync(join(outDir, 'README.txt'), readme);
  writeFileSync(join(outDir, 'POST-COPY.txt'), captions);
}

async function main() {
  if (!existsSync(iconSrc)) {
    throw new Error(`Missing ${iconSrc}`);
  }

  mkdirSync(outDir, { recursive: true });
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  const stuff = requireShot('03-stuff.png');
  const home = requireShot('01-home.png');
  const feed = requireShot('02-feed.png');
  const map = requireShot('05-map.png');
  const events = requireShot('06-events.png');
  const goget = requireShot('13-goget-navigation.png');
  const listing = requireShot('04-listing.png');

  console.log('Building phone mockups…');
  const phoneTall = join(workDir, 'phone-tall.png');
  const phoneCover = join(workDir, 'phone-cover.png');
  const phoneLand = join(workDir, 'phone-land.png');
  const phoneValues = join(workDir, 'phone-values.png');
  const phoneSquare = join(workDir, 'phone-square.png');
  const phoneGoGet = join(workDir, 'phone-goget.png');
  const phoneGoGetTall = join(workDir, 'phone-goget-tall.png');
  const phoneFeed = join(workDir, 'phone-feed.png');

  phoneMockup(stuff, phoneTall, 980);
  phoneMockup(stuff, phoneCover, 528);
  phoneMockup(stuff, phoneLand, 558);
  phoneMockup(home, phoneValues, 820);
  phoneMockup(stuff, phoneSquare, 760);
  phoneMockup(goget, phoneGoGet, 760);
  phoneMockup(goget, phoneGoGetTall, 980);
  phoneMockup(feed, phoneFeed, 760);

  const carouselPhones = {
    home: join(workDir, 'c-home.png'),
    feed: join(workDir, 'c-feed.png'),
    stuff: join(workDir, 'c-stuff.png'),
    map: join(workDir, 'c-map.png'),
    events: join(workDir, 'c-events.png'),
    goget: join(workDir, 'c-goget.png'),
  };
  phoneMockup(home, carouselPhones.home, 980);
  phoneMockup(feed, carouselPhones.feed, 980);
  phoneMockup(stuff, carouselPhones.stuff, 980);
  phoneMockup(map, carouselPhones.map, 980);
  phoneMockup(events, carouselPhones.events, 980);
  phoneMockup(goget, carouselPhones.goget, 980);

  console.log('Composing Facebook images…');

  composePoster({
    dest: join(outDir, '01-timeline-square-hero.png'),
    width: 1080,
    height: 1080,
    phone: phoneSquare,
    logoSize: 88,
    logoX: 48,
    logoY: 36,
    phoneX: '(W-w)/2',
    phoneY: 168,
    texts: [
      { font: FONT_BOLD, text: 'The Sacramento Free', size: 36, color: INK, x: 152, y: 48 },
      { font: FONT_SEMI, text: 'Give freely. Ask kindly.', size: 22, color: GREEN, x: 152, y: 92 },
      { font: FONT_MED, text: 'sacramentobuynothing.com', size: 22, color: MUTED, x: '(w-text_w)/2', y: 1018 },
    ],
  });

  composePoster({
    dest: join(outDir, '02-timeline-portrait-hero.png'),
    width: 1080,
    height: 1350,
    phone: phoneTall,
    logoSize: 88,
    logoX: 48,
    logoY: 40,
    phoneX: '(W-w)/2',
    phoneY: 168,
    texts: [
      { font: FONT_BOLD, text: 'The Sacramento Free', size: 36, color: INK, x: 152, y: 52 },
      { font: FONT_SEMI, text: 'Give freely. Ask kindly.', size: 22, color: GREEN, x: 152, y: 96 },
      { font: FONT_MED, text: 'Free giveaways from Sacramento neighbors', size: 22, color: MUTED, x: '(w-text_w)/2', y: 1278 },
    ],
  });

  composeLandscape({
    dest: join(outDir, '03-timeline-landscape.png'),
    phone: phoneLand,
  });

  composeCover({
    dest: join(outDir, '04-page-cover.png'),
    phone: phoneCover,
  });

  composePoster({
    dest: join(outDir, '05-timeline-square-goget.png'),
    width: 1080,
    height: 1080,
    phone: phoneGoGet,
    logoSize: 88,
    logoX: 48,
    logoY: 36,
    phoneX: '(W-w)/2',
    phoneY: 168,
    texts: [
      { font: FONT_BOLD, text: 'Go Get pickup', size: 36, color: INK, x: 152, y: 48 },
      { font: FONT_SEMI, text: 'Live map  ·  GPS  ·  porch handoff', size: 22, color: GREEN, x: 152, y: 92 },
      { font: FONT_MED, text: 'Android app  ·  sacramentobuynothing.com', size: 20, color: MUTED, x: '(w-text_w)/2', y: 1018 },
    ],
  });

  composePoster({
    dest: join(outDir, '06-timeline-square-feed.png'),
    width: 1080,
    height: 1080,
    phone: phoneFeed,
    logoSize: 88,
    logoX: 48,
    logoY: 36,
    phoneX: '(W-w)/2',
    phoneY: 168,
    texts: [
      { font: FONT_BOLD, text: 'The neighbor feed', size: 36, color: INK, x: 152, y: 48 },
      { font: FONT_SEMI, text: 'Check-ins, help, and local posts', size: 22, color: GREEN, x: 152, y: 92 },
      { font: FONT_MED, text: 'sacramentobuynothing.com', size: 22, color: MUTED, x: '(w-text_w)/2', y: 1018 },
    ],
  });

  composeValuesSquare(join(outDir, '07-timeline-square-values.png'), phoneValues);

  composePoster({
    dest: join(outDir, '08-timeline-portrait-goget.png'),
    width: 1080,
    height: 1350,
    phone: phoneGoGetTall,
    logoSize: 88,
    logoX: 48,
    logoY: 40,
    phoneX: '(W-w)/2',
    phoneY: 168,
    texts: [
      { font: FONT_BOLD, text: 'Go Get  ·  live pickup', size: 34, color: INK, x: 152, y: 52 },
      { font: FONT_SEMI, text: 'Ring, GPS, and confirm the handoff', size: 22, color: GREEN, x: 152, y: 96 },
      { font: FONT_MED, text: 'In the Android app  ·  sacramentobuynothing.com', size: 20, color: MUTED, x: '(w-text_w)/2', y: 1278 },
    ],
  });

  const carouselMeta = [
    ['carousel-01-home.png', carouselPhones.home, 'Home', 'See today’s giveaways — no install'],
    ['carousel-02-feed.png', carouselPhones.feed, 'Feed', 'Neighbor posts and check-ins'],
    ['carousel-03-stuff.png', carouselPhones.stuff, 'Stuff', 'Giveaways and requests, free'],
    ['carousel-04-map.png', carouselPhones.map, 'Map', 'What’s nearby in Sacramento'],
    ['carousel-05-events.png', carouselPhones.events, 'Events', 'Free community gatherings'],
    ['carousel-06-goget.png', carouselPhones.goget, 'Go Get', 'Live pickup in the Android app'],
  ];

  for (const [file, phone, title, sub] of carouselMeta) {
    composePoster({
      dest: join(outDir, file),
      width: 1080,
      height: 1350,
      phone,
      logoSize: 88,
      logoX: 48,
      logoY: 40,
      phoneX: '(W-w)/2',
      phoneY: 168,
      texts: [
        { font: FONT_BOLD, text: title, size: 36, color: INK, x: 152, y: 52 },
        { font: FONT_SEMI, text: sub, size: 22, color: GREEN, x: 152, y: 96 },
        { font: FONT_MED, text: 'The Sacramento Free', size: 20, color: MUTED, x: '(w-text_w)/2', y: 1278 },
      ],
    });
  }

  console.log('Building video stills…');
  const videoScenes = [
    ['title', null, 'The Sacramento Free', 'Give freely. Ask kindly.'],
    ['v-home', home, 'Home', 'Today’s giveaways'],
    ['v-feed', feed, 'Feed', 'Neighbor posts'],
    ['v-stuff', stuff, 'Stuff', 'Give what you can'],
    ['v-listing', listing, 'A listing', 'Photos, porch notes, chat'],
    ['v-map', map, 'Map', 'What’s nearby'],
    ['v-events', events, 'Events', 'Free gatherings'],
    ['v-goget', goget, 'Go Get', 'Live pickup in the app'],
    ['end', null, 'Join your neighbors', 'sacramentobuynothing.com'],
  ];

  function titleStill(dest, width, height, headline, sub) {
    const logo = Math.round(width * 0.2);
    const filters = [
      `[0:v]format=rgba[base]`,
      `[1:v]scale=${logo}:${logo}:flags=lanczos,format=rgba[logo]`,
      `color=c=${GREEN}:s=${width}x12,format=rgba[bar]`,
      `[base][bar]overlay=0:0[b1]`,
      `[b1][logo]overlay=(W-w)/2:${Math.round(height * 0.22)}[b2]`,
      `[b2]${drawtext({
        font: FONT_BOLD,
        text: headline,
        size: width >= 1080 ? 48 : 40,
        color: INK,
        x: '(w-text_w)/2',
        y: Math.round(height * 0.48),
      })}[t1]`,
      `[t1]${drawtext({
        font: FONT_SEMI,
        text: sub,
        size: 28,
        color: GREEN,
        x: '(w-text_w)/2',
        y: Math.round(height * 0.56),
      })}[t2]`,
      `[t2]${drawtext({
        font: FONT_MED,
        text: 'No selling  ·  No ads  ·  Sacramento',
        size: 22,
        color: MUTED,
        x: '(w-text_w)/2',
        y: Math.round(height * 0.72),
      })}[out]`,
    ];
    runFfmpeg(
      [
        '-f',
        'lavfi',
        '-i',
        `color=c=${CREAM}:s=${width}x${height}`,
        '-i',
        iconSrc,
        '-frames:v',
        '1',
        '-filter_complex',
        filters.join(';'),
        '-map',
        '[out]',
        '-pix_fmt',
        'rgb24',
        dest,
      ],
      dest,
    );
  }

  function sceneStill(dest, shot, width, height, title, sub) {
    const phoneH = Math.round(height * (height > 1200 ? 0.78 : 0.74));
    const phoneFile = join(workDir, `vs-${width}x${height}-${title.replace(/\s+/g, '')}.png`);
    phoneMockup(shot, phoneFile, phoneH);
    composePoster({
      dest,
      width,
      height,
      phone: phoneFile,
      logoSize: 72,
      logoX: 40,
      logoY: 28,
      phoneX: '(W-w)/2',
      phoneY: Math.round(height * 0.12),
      texts: [
        { font: FONT_BOLD, text: title, size: 32, color: INK, x: 128, y: 36 },
        { font: FONT_SEMI, text: sub, size: 20, color: GREEN, x: 128, y: 76 },
      ],
    });
  }

  function buildTour(width, height, destName) {
    const clips = [];
    for (const [key, shot, title, sub] of videoScenes) {
      const still = join(workDir, `${destName}-${key}.png`);
      const clip = join(workDir, `${destName}-${key}.mp4`);
      const isCard = key === 'title' || key === 'end';
      if (isCard) {
        titleStill(still, width, height, title, sub);
        stillClip(still, clip, { width, height, seconds: key === 'end' ? 3.4 : 3.0 });
        clips.push({ file: clip, seconds: key === 'end' ? 3.4 : 3.0 });
      } else {
        sceneStill(still, shot, width, height, title, sub);
        kenBurnsClip(still, clip, { width, height, seconds: 2.7 });
        clips.push({ file: clip, seconds: 2.7 });
      }
    }
    xfadeConcat(clips, join(outDir, destName));
  }

  console.log('Rendering square tour video…');
  buildTour(1080, 1080, 'timeline-square-app-tour.mp4');
  console.log('Rendering portrait tour video…');
  buildTour(1080, 1350, 'timeline-portrait-app-tour.mp4');

  writeDocs();
  packFacebookPromoZip();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
