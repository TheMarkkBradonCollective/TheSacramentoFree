#!/usr/bin/env node
/**
 * Build the 30-second Sacramento Free Facebook video ad.
 * Follows one neighbor giving away a gold lamp, start to porch handoff.
 * Zip screenshots stay the same Play Console PNGs.
 *
 *   npm run facebook:promo
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { packFacebookPromoZip } from './pack-facebook-promo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconSrc = join(root, 'play-store-assets', 'icon-512.png');
const lockupSrc = join(root, 'public', 'TheSacramentoFree.png');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const stillDir = join(root, 'facebook-promo-assets', 'stills');
const audioDir = join(root, 'facebook-promo-assets', 'audio');
const outDir = join(root, 'facebook-promo-assets');
const workDir = join(outDir, '.work');

const GREEN = '0x00845A';
const CREAM = '0xF6F3EA';
const INK = '0x0B0B0C';
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

const EDGE_TTS = join(homedir(), '.local', 'bin', 'edge-tts');

const VO_LINES = [
  ['vo1.mp3', "There's probably someone in Sacramento who could use it."],
  ['vo2.mp3', 'Sacramento Free makes it easy to give away the things you no longer need.'],
  ['vo3.mp3', "A neighbor picks it up from her porch. That's the whole trade."],
  ['vo4.mp3', 'Stop throwing good stuff away. Join Sacramento Free.'],
];

function fontPath(candidates) {
  return candidates.find((p) => existsSync(p)) || candidates[candidates.length - 1];
}

function ffText(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/%/g, '\\%')
    .replace(/:/g, '\\:');
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

function scale(height, n) {
  return Math.round(n * (height / 1350));
}

function drawtext({ font, text, size, color, x, y, enable, border = 0, bordercolor = 'black', box = 0 }) {
  const extra = [
    enable ? `:enable='${enable}'` : '',
    border ? `:borderw=${border}:bordercolor=${bordercolor}` : '',
    box ? `:box=1:boxcolor=black@0.35:boxborderw=18` : '',
  ].join('');
  return `drawtext=fontfile=${font}:text='${ffText(text)}':fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}:expansion=none${extra}`;
}

function ensureVoiceover() {
  mkdirSync(audioDir, { recursive: true });
  for (const [file, text] of VO_LINES) {
    const dest = join(audioDir, file);
    if (existsSync(dest)) continue;
    const bin = existsSync(EDGE_TTS) ? EDGE_TTS : 'edge-tts';
    const result = spawnSync(bin, ['--voice', 'en-US-AvaNeural', '--rate', '+8%', '--text', text, '--write-media', dest], {
      encoding: 'utf8',
    });
    if (result.status !== 0 || !existsSync(dest)) {
      throw new Error(`Could not synthesize ${file}. Install edge-tts or restore facebook-promo-assets/audio/. ${result.stderr || ''}`);
    }
    console.log(`wrote ${dest}`);
  }
}

function stillClip({
  src,
  dest,
  width,
  height,
  seconds,
  zoomFrom = 1.0,
  zoomTo = 1.08,
  focusX = 0.5,
  focusY = 0.42,
  fromTop = false,
  shade = false,
  texts = [],
}) {
  if (!existsSync(src)) throw new Error(`Missing still ${src}`);
  const frames = Math.round(seconds * 30);
  const zoomDelta = (zoomTo - zoomFrom) / Math.max(frames - 1, 1);
  const cropY = fromTop ? '0' : '(ih-oh)/2';
  const parts = [
    `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase:flags=lanczos`,
    `crop=${width * 2}:${height * 2}:(iw-ow)/2:${cropY}`,
    `zoompan=z='${zoomFrom}+${zoomDelta}*on':x='(iw-iw/zoom)*${focusX}':y='(ih-ih/zoom)*${focusY}':d=${frames}:s=${width}x${height}:fps=30`,
    'setsar=1',
    'format=yuv420p',
  ];
  if (shade) {
    parts.push(`drawbox=x=0:y=ih*0.72:w=iw:h=ih*0.28:color=black@0.52:t=fill`);
  }
  let vf = parts.join(',');
  for (const line of texts) {
    vf += `,${drawtext(line)}`;
  }
  runFfmpeg(
    [
      '-loop',
      '1',
      '-framerate',
      '30',
      '-t',
      String(seconds),
      '-i',
      src,
      '-vf',
      vf,
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

function brandClip({ dest, width, height, seconds }) {
  const frames = Math.round(seconds * 30);
  const logo = scale(height, 200);
  const title = scale(height, 52);
  const sub = scale(height, 30);
  const yTitle = Math.round(height * 0.56);
  const ySub = Math.round(height * 0.66);
  const fc = [
    `[0:v]scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width * 2}:${height * 2}:(iw-ow)/2:(ih-oh)/2,zoompan=z='1.0+0.0012*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=30,setsar=1,format=yuv420p,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.28:t=fill[bg]`,
    `[1:v]scale=${logo}:${logo}:flags=lanczos,format=rgba[logo]`,
    `[bg][logo]overlay=(W-w)/2:${Math.round(height * 0.18)}[marked]`,
    `[marked]${drawtext({
      font: FONT_BOLD,
      text: 'GIVE. FIND. REUSE.',
      size: title,
      color: WHITE,
      x: '(w-text_w)/2',
      y: yTitle,
      border: 2,
      bordercolor: 'black@0.65',
    })}[t1]`,
    `[t1]${drawtext({
      font: FONT_SEMI,
      text: '100% Free. Keep it Local.',
      size: sub,
      color: WHITE,
      x: '(w-text_w)/2',
      y: ySub,
      border: 2,
      bordercolor: 'black@0.65',
    })}[out]`,
  ].join(';');
  runFfmpeg(
    [
      '-loop',
      '1',
      '-framerate',
      '30',
      '-t',
      String(seconds),
      '-i',
      join(stillDir, 'sac-bridge.png'),
      '-loop',
      '1',
      '-i',
      iconSrc,
      '-filter_complex',
      fc,
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

function ctaClip({ dest, width, height, seconds }) {
  const phoneW = scale(height, 400);
  const title = scale(height, 46);
  const sub = scale(height, 28);
  const url = scale(height, 26);
  const phoneY = Math.round(height * 0.06);
  const text0 = Math.round(height * 0.66);
  const fc = [
    `[1:v]scale=${phoneW}:-1:flags=lanczos,format=yuv420p,setsar=1[phone]`,
    `[0:v][phone]overlay=(W-w)/2:${phoneY}[withphone]`,
    `[withphone]${drawtext({
      font: FONT_BOLD,
      text: 'SACRAMENTO FREE',
      size: title,
      color: INK,
      x: '(w-text_w)/2',
      y: text0,
    })}[t1]`,
    `[t1]${drawtext({
      font: FONT_SEMI,
      text: 'Give it away. Find something free.',
      size: sub,
      color: GREEN,
      x: '(w-text_w)/2',
      y: text0 + scale(height, 58),
    })}[t2]`,
    `[t2]${drawtext({
      font: FONT_MED,
      text: 'sacramentobuynothing.com',
      size: url,
      color: INK,
      x: '(w-text_w)/2',
      y: text0 + scale(height, 108),
    })}[out]`,
  ].join(';');
  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${CREAM}:s=${width}x${height}:d=${seconds}:r=30`,
      '-loop',
      '1',
      '-i',
      join(shotDir, '01-home.png'),
      '-filter_complex',
      fc,
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

function logoPopClip({ dest, width, height, seconds }) {
  const logo = scale(height, 560);
  const sub = scale(height, 28);
  const fc = [
    `[1:v]scale=${logo}:${logo}:flags=lanczos,format=rgba[logo]`,
    `[0:v][logo]overlay=(W-w)/2:(H-h)/2-${scale(height, 36)}[marked]`,
    `[marked]${drawtext({
      font: FONT_SEMI,
      text: 'Give freely. Ask kindly.',
      size: sub,
      color: WHITE,
      x: '(w-text_w)/2',
      y: Math.round(height * 0.82),
    })}[out]`,
  ].join(';');
  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${GREEN}:s=${width}x${height}:d=${seconds}:r=30`,
      '-loop',
      '1',
      '-i',
      lockupSrc,
      '-filter_complex',
      fc,
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

function concatClips(files, dest, duration) {
  const inputs = files.flatMap((f) => ['-i', f]);
  const fadeOutStart = Math.max(0, duration - 0.35);
  const fc =
    files.map((_, i) => `[${i}:v]`).join('') +
    `concat=n=${files.length}:v=1:a=0,format=yuv420p,fade=t=in:st=0:d=0.16,fade=t=out:st=${fadeOutStart}:d=0.35[v]`;
  runFfmpeg(
    [
      ...inputs,
      '-filter_complex',
      fc,
      '-map',
      '[v]',
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

function muxVoiceover(video, dest, duration) {
  const vos = [
    { file: join(audioDir, 'vo1.mp3'), at: 6.55 },
    { file: join(audioDir, 'vo2.mp3'), at: 10.8 },
    { file: join(audioDir, 'vo3.mp3'), at: 15.55 },
    { file: join(audioDir, 'vo4.mp3'), at: 26.2 },
  ];
  const inputs = ['-i', video, ...vos.flatMap((v) => ['-i', v.file])];
  const delays = vos.map((v, i) => {
    const ms = Math.round(v.at * 1000);
    return `[${i + 1}:a]adelay=${ms}|${ms}:all=1,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`;
  });
  const mix =
    vos.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${vos.length}:duration=longest:dropout_transition=0:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_rates=44100:channel_layouts=stereo[a]`;
  runFfmpeg(
    [
      ...inputs,
      '-filter_complex',
      `${delays.join(';')};${mix}`,
      '-map',
      '0:v',
      '-map',
      '[a]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-t',
      String(duration),
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

Fictional neighbors / demo listings only. Do not post live member names or photos.

What to upload
--------------
1. Video (recommended): ad-portrait.mp4
   30-second Facebook feed ad, 1080×1350 (4:5).
2. Square video (optional): ad-square.mp4
   Same 30-second ad, 1080×1080.
3. Screenshots: 01-home.png through 16-goget-arrived.png
   Same 1080×1920 phone captures as Play Console.

Caption: paste from POST-COPY.txt.

Regenerate
----------
npm run android:play-screenshots   # refresh Play/Facebook screenshots
npm run facebook:promo             # rebuild the 30s video ad + zip
`;

  const captions = `The Sacramento Free — Facebook ad caption
========================================
Paste this with ad-portrait.mp4 (or the square video).

---

You don't need it anymore? Don't throw it away.

There's probably someone in Sacramento who could use it.

Sacramento Free makes it easy to give away the things you no longer need.

A neighbor picks it up from the porch. That's the whole trade.

Give. Find. Reuse.
100% free. Keep it local.

TheSacramentoFree — Give freely. Ask kindly.

Join:
https://www.sacramentobuynothing.com

Android (closed testing — free to opt in):
https://play.google.com/apps/testing/org.sacramentobuynothing.app

#TheSacramentoFree #Sacramento #GiveFreelyAskKindly #KeepItLocal
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

function buildVersion(width, height, videoName) {
  const s = (n) => scale(height, n);
  const hookQ = [
    {
      font: FONT_BOLD,
      text: "You don't need it anymore?",
      size: s(42),
      color: WHITE,
      x: '(w-text_w)/2',
      y: Math.round(height * 0.82),
      border: 2,
      bordercolor: 'black@0.7',
    },
  ];
  const hookNo = [
    {
      font: FONT_BOLD,
      text: "DON'T THROW IT AWAY.",
      size: s(46),
      color: WHITE,
      x: '(w-text_w)/2',
      y: Math.round(height * 0.82),
      border: 3,
      bordercolor: 'black@0.75',
    },
  ];

  const doneLine = [
    {
      font: FONT_BOLD,
      text: "That's the whole trade.",
      size: s(42),
      color: WHITE,
      x: '(w-text_w)/2',
      y: Math.round(height * 0.82),
      border: 2,
      bordercolor: 'black@0.7',
    },
  ];

  const clips = [
    {
      dest: join(workDir, `01-hook-${width}.mp4`),
      make: () =>
        stillClip({
          src: join(stillDir, 'hook-unused.png'),
          dest: join(workDir, `01-hook-${width}.mp4`),
          width,
          height,
          seconds: 3.0,
          zoomTo: 1.1,
          shade: true,
          texts: hookQ,
        }),
    },
    {
      dest: join(workDir, `02-phone-${width}.mp4`),
      make: () =>
        stillClip({
          src: join(stillDir, 'hook-phone.png'),
          dest: join(workDir, `02-phone-${width}.mp4`),
          width,
          height,
          seconds: 3.5,
          zoomFrom: 1.02,
          zoomTo: 1.12,
          shade: true,
          texts: hookNo,
        }),
    },
    {
      dest: join(workDir, `03-list-${width}.mp4`),
      make: () =>
        stillClip({
          src: join(stillDir, 'lamp-list.png'),
          dest: join(workDir, `03-list-${width}.mp4`),
          width,
          height,
          seconds: 4.5,
          zoomTo: 1.1,
          focusY: 0.45,
        }),
    },
    {
      dest: join(workDir, `05-porch-${width}.mp4`),
      make: () =>
        stillClip({
          src: join(stillDir, 'lamp-porch.png'),
          dest: join(workDir, `05-porch-${width}.mp4`),
          width,
          height,
          seconds: 4.5,
          zoomFrom: 1.02,
          zoomTo: 1.1,
          focusY: 0.42,
        }),
    },
    {
      dest: join(workDir, `06-handoff-${width}.mp4`),
      make: () =>
        stillClip({
          src: join(stillDir, 'lamp-handoff.png'),
          dest: join(workDir, `06-handoff-${width}.mp4`),
          width,
          height,
          seconds: 4.0,
          zoomTo: 1.08,
          focusY: 0.4,
        }),
    },
    {
      dest: join(workDir, `07-done-${width}.mp4`),
      make: () =>
        stillClip({
          src: join(stillDir, 'lamp-complete.png'),
          dest: join(workDir, `07-done-${width}.mp4`),
          width,
          height,
          seconds: 3.0,
          zoomFrom: 1.04,
          zoomTo: 1.12,
          focusY: 0.38,
          shade: true,
          texts: doneLine,
        }),
    },
    {
      dest: join(workDir, `08-brand-${width}.mp4`),
      make: () =>
        brandClip({
          dest: join(workDir, `08-brand-${width}.mp4`),
          width,
          height,
          seconds: 4.0,
        }),
    },
    {
      dest: join(workDir, `09-cta-${width}.mp4`),
      make: () =>
        ctaClip({
          dest: join(workDir, `09-cta-${width}.mp4`),
          width,
          height,
          seconds: 2.0,
        }),
    },
    {
      dest: join(workDir, `10-logo-${width}.mp4`),
      make: () =>
        logoPopClip({
          dest: join(workDir, `10-logo-${width}.mp4`),
          width,
          height,
          seconds: 1.5,
        }),
    },
  ];

  for (const clip of clips) clip.make();

  const silent = join(workDir, `silent-${width}.mp4`);
  concatClips(
    clips.map((c) => c.dest),
    silent,
    30,
  );
  muxVoiceover(silent, join(outDir, videoName), 30);
}

function main() {
  if (!existsSync(iconSrc)) throw new Error(`Missing ${iconSrc}`);
  if (!existsSync(lockupSrc)) throw new Error(`Missing ${lockupSrc}`);
  mkdirSync(outDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });
  ensureVoiceover();

  console.log('Cutting 30s portrait ad…');
  buildVersion(1080, 1350, 'ad-portrait.mp4');
  console.log('Cutting 30s square ad…');
  buildVersion(1080, 1080, 'ad-square.mp4');

  writeDocs();

  const keepOut = new Set([
    '.gitignore',
    'README.md',
    '.work',
    'stills',
    'audio',
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

main();
