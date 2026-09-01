#!/usr/bin/env node
/**
 * Build the 30-second Sacramento Free Facebook video ad.
 * One story: a neighbor gives away her brass lamp, listed and picked up in the app.
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
import { recordFacebookAdDemo } from './record-facebook-ad-demo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconSrc = join(root, 'play-store-assets', 'icon-512.png');
const shotDir = join(root, 'play-store-assets', 'screenshots');
const stillDir = join(root, 'facebook-promo-assets', 'stills');
const audioDir = join(root, 'facebook-promo-assets', 'audio');
const outDir = join(root, 'facebook-promo-assets');
const workDir = join(outDir, '.work');

const GREEN = '0x00845A';
const CREAM = '0xF6F3EA';
const INK = '0x0B0B0C';
const WHITE = '0xFFFFFF';
const BEZEL = '0x101012';

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
  ['vo1.mp3', "That lamp doesn't have to go in a landfill."],
  ['vo2.mp3', 'Post it free on Sacramento Free, and a neighbor sees it in minutes.'],
  ['vo3.mp3', 'They grab it off your porch. No selling, no haggling, no ads.'],
  ['vo4.mp3', 'Give freely. Ask kindly. Join Sacramento Free.'],
];

/** I-V-vi-IV pad in A, one triad per bar, kept dull and quiet under the voiceover. */
const MUSIC_CHORDS = [
  [110.0, 164.81, 220.0, 277.18],
  [82.41, 123.47, 164.81, 207.65],
  [92.5, 138.59, 185.0, 277.18],
  [73.42, 110.0, 146.83, 185.0],
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

function drawtext({ font, text, size, color, x, y, alpha, border = 0, bordercolor = 'black' }) {
  const extra = [
    alpha ? `:alpha='${alpha}'` : '',
    border ? `:borderw=${border}:bordercolor=${bordercolor}` : '',
  ].join('');
  return `drawtext=fontfile=${font}:text='${ffText(text)}':fontsize=${size}:fontcolor=${color}:x='${x}':y='${y}':expansion=none${extra}`;
}

const SCRIM_TOP = 0.68;

/** Smooth bottom gradient so captions stay legible without a hard black slab. */
function scrimPng(width, height) {
  const dest = join(workDir, `scrim-${width}x${height}.png`);
  if (existsSync(dest)) return dest;
  const scrimH = height - Math.round(height * SCRIM_TOP);
  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=black:s=${width}x${scrimH}`,
      '-vf',
      "format=rgba,geq=r=0:g=0:b=0:a='212*pow(Y/H,1.8)'",
      '-frames:v',
      '1',
      dest,
    ],
    dest,
  );
  return dest;
}

/** Headline + sub that fade and slide up on entry. */
function caption({ height, title, sub, delay = 0.2 }) {
  const rise = scale(height, 26);
  const fade = 0.42;
  const alpha = `if(lt(t,${delay}),0,min(1,(t-${delay})/${fade}))`;
  const lift = (base) =>
    `${base}+${rise}*(1-min(1,max(0,(t-${delay})/${fade})))`;
  const titleY = Math.round(height * (sub ? 0.788 : 0.815));
  const lines = [
    `drawbox=x=(iw-${scale(height, 84)})/2:y=${Math.round(height * 0.752)}:w=${scale(height, 84)}:h=${scale(height, 6)}:color=${GREEN}@1:t=fill`,
  ];
  lines.push(
    drawtext({
      font: FONT_BOLD,
      text: title,
      size: scale(height, sub ? 46 : 52),
      color: WHITE,
      x: '(w-text_w)/2',
      y: lift(titleY),
      alpha,
      border: 2,
      bordercolor: 'black@0.45',
    }),
  );
  if (sub) {
    const subDelay = Number((delay + 0.22).toFixed(3));
    lines.push(
      drawtext({
        font: FONT_SEMI,
        text: sub,
        size: scale(height, 30),
        color: '0xE9E7E0',
        x: '(w-text_w)/2',
        y: `${Math.round(height * 0.885)}+${rise}*(1-min(1,max(0,(t-${subDelay})/${fade})))`,
        alpha: `if(lt(t,${subDelay}),0,min(1,(t-${subDelay})/${fade}))`,
        border: 2,
        bordercolor: 'black@0.45',
      }),
    );
  }
  return lines;
}

function ensureVoiceover() {
  mkdirSync(audioDir, { recursive: true });
  for (const [file, text] of VO_LINES) {
    const dest = join(audioDir, file);
    if (existsSync(dest)) continue;
    const bin = existsSync(EDGE_TTS) ? EDGE_TTS : 'edge-tts';
    const result = spawnSync(
      bin,
      ['--voice', 'en-US-AvaNeural', '--rate', '+6%', '--text', text, '--write-media', dest],
      { encoding: 'utf8' },
    );
    if (result.status !== 0 || !existsSync(dest)) {
      throw new Error(
        `Could not synthesize ${file}. Install edge-tts or restore facebook-promo-assets/audio/. ${result.stderr || ''}`,
      );
    }
    console.log(`wrote ${dest}`);
  }
}

function buildMusicBed(dest, duration) {
  const bar = duration / MUSIC_CHORDS.length;
  const inputs = [];
  const filters = [];
  let inputCount = 0;
  MUSIC_CHORDS.forEach((chord, ci) => {
    const voices = chord.map((freq, vi) => {
      const idx = inputCount++;
      inputs.push('-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${bar.toFixed(3)}:sample_rate=44100`);
      const gain = vi === 0 ? 0.5 : 0.32 / vi;
      filters.push(`[${idx}:a]volume=${gain.toFixed(3)}[c${ci}v${vi}]`);
      return `[c${ci}v${vi}]`;
    });
    filters.push(
      `${voices.join('')}amix=inputs=${voices.length}:normalize=0,` +
        `afade=t=in:st=0:d=0.9,afade=t=out:st=${(bar - 1.1).toFixed(3)}:d=1.1[bar${ci}]`,
    );
  });
  const chain =
    MUSIC_CHORDS.map((_, i) => `[bar${i}]`).join('') +
    `concat=n=${MUSIC_CHORDS.length}:v=0:a=1,` +
    'lowpass=f=760,tremolo=f=0.28:d=0.22,aecho=0.8:0.85:340|520:0.28|0.2,' +
    `afade=t=in:st=0:d=1.6,afade=t=out:st=${(duration - 2.2).toFixed(3)}:d=2.2,` +
    'volume=-19dB[music]';
  runFfmpeg(
    [
      ...inputs,
      '-filter_complex',
      `${filters.join(';')};${chain}`,
      '-map',
      '[music]',
      '-t',
      String(duration),
      '-c:a',
      'pcm_s16le',
      dest,
    ],
    dest,
  );
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
  const fc = [`[0:v]${parts.join(',')}[base]`];
  if (texts.length) {
    fc.push(`[base][1:v]overlay=0:${Math.round(height * SCRIM_TOP)}[scrimmed]`);
    fc.push(`[scrimmed]${texts.join(',')},format=yuv420p[out]`);
  } else {
    fc.push('[base]format=yuv420p[out]');
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
      '-loop',
      '1',
      '-i',
      scrimPng(width, height),
      '-filter_complex',
      fc.join(';'),
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

/** Rounded phone body around a screen layer, so app shots read as a real device. */
function deviceFilter({ inLabel, outLabel, height, deviceH }) {
  const bezel = scale(height, 11);
  const radius = scale(height, 40);
  const innerH = deviceH - bezel * 2;
  const c = '\\,';
  const r = radius;
  const outsideCorner = [
    `lt(X${c}${r})*lt(Y${c}${r})*gt(hypot(${r}-X${c}${r}-Y)${c}${r})`,
    `gt(X${c}W-${r})*lt(Y${c}${r})*gt(hypot(X-(W-${r})${c}${r}-Y)${c}${r})`,
    `lt(X${c}${r})*gt(Y${c}H-${r})*gt(hypot(${r}-X${c}Y-(H-${r}))${c}${r})`,
    `gt(X${c}W-${r})*gt(Y${c}H-${r})*gt(hypot(X-(W-${r})${c}Y-(H-${r}))${c}${r})`,
  ].join('+');
  return (
    `[${inLabel}]scale=-2:${innerH}:flags=lanczos,` +
    `pad=iw+${bezel * 2}:ih+${bezel * 2}:${bezel}:${bezel}:color=${BEZEL},` +
    `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(${outsideCorner}${c}0${c}255)',setsar=1[${outLabel}]`
  );
}

/** Live app capture inside a rounded device, over a blurred porch plate. */
function phoneClip({ demo, dest, width, height, seconds, start, bgStill, texts = [] }) {
  const deviceH = Math.round(height * (height >= 1300 ? 0.66 : 0.6));
  const deviceY = Math.round(height * 0.025);
  const fc = [
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,` +
      `crop=${width}:${height},gblur=sigma=20,eq=brightness=-0.04:saturation=0.96,setsar=1,format=yuv420p[bg]`,
    deviceFilter({ inLabel: '1:v', outLabel: 'device', height, deviceH }),
    `[bg][device]overlay=(W-w)/2:${deviceY}:format=auto,format=yuv420p,` +
      `zoompan=z='1+${(0.085 / Math.max(Math.round(seconds * 30) - 1, 1)).toFixed(7)}*on':` +
      `x='iw/2-(iw/zoom/2)':y='0':d=${Math.round(seconds * 30)}:s=${width}x${height}:fps=30,setsar=1[framed]`,
    `[framed][2:v]overlay=0:${Math.round(height * SCRIM_TOP)}[scrimmed]`,
  ];
  fc.push(`[scrimmed]${texts.join(',')},format=yuv420p[out]`);
  runFfmpeg(
    [
      '-loop',
      '1',
      '-framerate',
      '30',
      '-t',
      String(seconds),
      '-i',
      bgStill,
      '-ss',
      String(start),
      '-t',
      String(seconds),
      '-i',
      demo,
      '-loop',
      '1',
      '-i',
      scrimPng(width, height),
      '-filter_complex',
      fc.join(';'),
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

function brandClip({ dest, width, height, seconds }) {
  const frames = Math.round(seconds * 30);
  const logo = scale(height, 210);
  const fc = [
    `[0:v]scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase:flags=lanczos,` +
      `crop=${width * 2}:${height * 2}:(iw-ow)/2:(ih-oh)/2,` +
      `zoompan=z='1.0+0.0016*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=30,` +
      `setsar=1,format=yuv420p,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.2:t=fill[bg]`,
    `[1:v]scale=${logo}:${logo}:flags=lanczos,format=rgba[logo]`,
    `[bg][logo]overlay=(W-w)/2:${Math.round(height * 0.2)}[marked]`,
    `[marked]${drawtext({
      font: FONT_BOLD,
      text: 'GIVE. FIND. REUSE.',
      size: scale(height, 58),
      color: WHITE,
      x: '(w-text_w)/2',
      y: Math.round(height * 0.55),
      alpha: 'min(1,t/0.5)',
      border: 2,
      bordercolor: 'black@0.55',
    })}[t1]`,
    `[t1]drawbox=x=(iw-${scale(height, 120)})/2:y=${Math.round(height * 0.635)}:w=${scale(height, 120)}:h=${scale(
      height,
      6,
    )}:color=${GREEN}@1:t=fill[t2]`,
    `[t2]${drawtext({
      font: FONT_SEMI,
      text: '100% Free. Keep it Local.',
      size: scale(height, 32),
      color: WHITE,
      x: '(w-text_w)/2',
      y: Math.round(height * 0.68),
      alpha: 'min(1,max(0,(t-0.35)/0.5))',
      border: 2,
      bordercolor: 'black@0.55',
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
  const deviceH = Math.round(height * (height >= 1300 ? 0.56 : 0.5));
  const text0 = Math.round(height * 0.66);
  const fc = [
    deviceFilter({ inLabel: '1:v', outLabel: 'phone', height, deviceH }),
    `[0:v][phone]overlay=(W-w)/2:${Math.round(height * 0.05)}:format=auto[withphone]`,
    `[withphone]${drawtext({
      font: FONT_BOLD,
      text: 'SACRAMENTO FREE',
      size: scale(height, 44),
      color: INK,
      x: '(w-text_w)/2',
      y: text0,
      alpha: 'min(1,t/0.35)',
    })}[t1]`,
    `[t1]${drawtext({
      font: FONT_SEMI,
      text: 'Give it away. Find something free.',
      size: scale(height, 27),
      color: GREEN,
      x: '(w-text_w)/2',
      y: text0 + scale(height, 52),
      alpha: 'min(1,max(0,(t-0.2)/0.35))',
    })}[t2]`,
    `[t2]${drawtext({
      font: FONT_MED,
      text: 'Porch pickup. Both neighbors stay on the app.',
      size: scale(height, 24),
      color: INK,
      x: '(w-text_w)/2',
      y: text0 + scale(height, 96),
      alpha: 'min(1,max(0,(t-0.4)/0.35))',
    })}[t3]`,
    `[t3]${drawtext({
      font: FONT_BOLD,
      text: 'sacramentobuynothing.com',
      size: scale(height, 26),
      color: GREEN,
      x: '(w-text_w)/2',
      y: text0 + scale(height, 144),
      alpha: 'min(1,max(0,(t-0.6)/0.35))',
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
  const rise = scale(height, 22);
  const fc = [
    `[0:v]${drawtext({
      font: FONT_MED,
      text: 'The',
      size: scale(height, 34),
      color: '0xBFE6D6',
      x: '(w-text_w)/2',
      y: `${Math.round(height * 0.37)}+${rise}*(1-min(1,t/0.35))`,
      alpha: 'min(1,t/0.35)',
    })}[t0]`,
    `[t0]${drawtext({
      font: FONT_BOLD,
      text: 'SACRAMENTO FREE',
      size: scale(height, 62),
      color: WHITE,
      x: '(w-text_w)/2',
      y: `${Math.round(height * 0.43)}+${rise}*(1-min(1,max(0,(t-0.12)/0.35)))`,
      alpha: 'min(1,max(0,(t-0.12)/0.35))',
    })}[t1]`,
    `[t1]drawbox=x=(iw-${scale(height, 120)})/2:y=${Math.round(height * 0.53)}:w=${scale(height, 120)}:h=${scale(
      height,
      6,
    )}:color=${WHITE}@0.9:t=fill[t2]`,
    `[t2]${drawtext({
      font: FONT_SEMI,
      text: 'Give freely. Ask kindly.',
      size: scale(height, 32),
      color: WHITE,
      x: '(w-text_w)/2',
      y: `${Math.round(height * 0.575)}+${rise}*(1-min(1,max(0,(t-0.3)/0.35)))`,
      alpha: 'min(1,max(0,(t-0.3)/0.35))',
    })}[out]`,
  ].join(';');
  runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `color=c=${GREEN}:s=${width}x${height}:d=${seconds}:r=30`,
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

function concatClips(clips, dest, duration) {
  const files = clips.map((c) => c.file);
  const inputs = files.flatMap((f) => ['-i', f]);
  const prep = clips.map((clip, i) => {
    const steps = ['format=yuv420p'];
    if (clip.fadeIn) steps.push(`fade=t=in:st=0:d=${clip.fadeIn}`);
    if (clip.fadeOut) steps.push(`fade=t=out:st=${(clip.seconds - clip.fadeOut).toFixed(2)}:d=${clip.fadeOut}`);
    return `[${i}:v]${steps.join(',')}[p${i}]`;
  });
  const fc =
    `${prep.join(';')};` +
    clips.map((_, i) => `[p${i}]`).join('') +
    `concat=n=${files.length}:v=1:a=0,format=yuv420p,` +
    `fade=t=in:st=0:d=0.2,fade=t=out:st=${(duration - 0.4).toFixed(2)}:d=0.4[v]`;
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

/** Music bed under voiceover, with the bed ducking whenever the voice speaks. */
function muxAudio({ video, music, dest, duration, cues }) {
  const inputs = ['-i', video, '-i', music, ...cues.flatMap((c) => ['-i', c.file])];
  const filters = cues.map((c, i) => {
    const ms = Math.round(c.at * 1000);
    return `[${i + 2}:a]adelay=${ms}|${ms}:all=1,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[v${i}]`;
  });
  filters.push(
    `${cues.map((_, i) => `[v${i}]`).join('')}amix=inputs=${cues.length}:duration=longest:dropout_transition=0:normalize=0,` +
      'loudnorm=I=-16:TP=-1.5:LRA=11,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asplit=2[vo][key]',
  );
  filters.push('[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[bed]');
  filters.push('[bed][key]sidechaincompress=threshold=0.05:ratio=6:attack=20:release=420[ducked]');
  filters.push('[vo][ducked]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.94[a]');
  runFfmpeg(
    [
      ...inputs,
      '-filter_complex',
      filters.join(';'),
      '-map',
      '0:v',
      '-map',
      '[a]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
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

That lamp in your spare room doesn't have to go in a landfill.

Post it free on Sacramento Free. A neighbor sees it in minutes, and grabs it off your porch.

No selling. No bidding. No flipping. No ads.

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

const TOTAL = 30;

function buildVersion({ width, height, videoName, demo, music }) {
  const cap = (title, sub) => caption({ height, title, sub });
  const beats = [
    {
      name: 'hook',
      seconds: 2.6,
      make: (dest) =>
        stillClip({
          src: join(stillDir, 'hook-unused.png'),
          dest,
          width,
          height,
          seconds: 2.6,
          zoomTo: 1.1,
          texts: cap("You don't need it anymore?", 'The brass lamp nobody uses.'),
        }),
    },
    {
      name: 'dont-throw',
      seconds: 2.6,
      make: (dest) =>
        stillClip({
          src: join(stillDir, 'hook-phone.png'),
          dest,
          width,
          height,
          seconds: 2.6,
          zoomFrom: 1.04,
          zoomTo: 1.13,
          texts: cap("DON'T THROW IT AWAY.", 'A neighbor needs exactly that.'),
        }),
    },
    {
      name: 'app-list',
      seconds: 4.6,
      make: (dest) =>
        phoneClip({
          demo,
          dest,
          width,
          height,
          seconds: 4.6,
          start: 0,
          bgStill: join(stillDir, 'hook-phone.png'),
          texts: cap('She posts it in a minute.', 'Free. No selling. No bidding.'),
        }),
    },
    {
      name: 'neighbor',
      seconds: 2.4,
      make: (dest) =>
        stillClip({
          src: join(stillDir, 'neighbor-phone.png'),
          dest,
          width,
          height,
          seconds: 2.4,
          zoomTo: 1.11,
          focusY: 0.36,
          texts: cap('A neighbor spots it.', 'Same day. Same neighborhood.'),
        }),
    },
    {
      name: 'app-comment',
      seconds: 2.4,
      make: (dest) =>
        phoneClip({
          demo,
          dest,
          width,
          height,
          seconds: 2.4,
          start: 7.2,
          bgStill: join(stillDir, 'neighbor-phone.png'),
          texts: cap('"Can I grab it off your porch?"', 'They sort it out in the app.'),
        }),
    },
    {
      name: 'pickup',
      seconds: 4.6,
      make: (dest) =>
        stillClip({
          src: join(stillDir, 'porch-pickup-phones.png'),
          dest,
          width,
          height,
          seconds: 4.6,
          zoomFrom: 1.03,
          zoomTo: 1.11,
          focusY: 0.42,
          texts: cap('Porch pickup.', 'Both neighbors on their phones.'),
        }),
    },
    {
      name: 'done',
      seconds: 3.0,
      make: (dest) =>
        stillClip({
          src: join(stillDir, 'porch-picked-up.png'),
          dest,
          width,
          height,
          seconds: 3.0,
          zoomFrom: 1.05,
          zoomTo: 1.13,
          focusY: 0.38,
          texts: cap('She takes the lamp home.', "That's the whole trade."),
        }),
    },
    { name: 'brand', seconds: 3.6, make: (dest) => brandClip({ dest, width, height, seconds: 3.6 }), fadeOut: 0.3 },
    { name: 'cta', seconds: 2.4, make: (dest) => ctaClip({ dest, width, height, seconds: 2.4 }), fadeIn: 0.3 },
    { name: 'logo', seconds: 1.8, make: (dest) => logoPopClip({ dest, width, height, seconds: 1.8 }) },
  ];

  const total = beats.reduce((sum, b) => sum + b.seconds, 0);
  if (Math.abs(total - TOTAL) > 0.01) {
    throw new Error(`Beats total ${total}s, expected ${TOTAL}s`);
  }

  const clips = beats.map((beat, i) => {
    const file = join(workDir, `${String(i + 1).padStart(2, '0')}-${beat.name}-${width}x${height}.mp4`);
    beat.make(file);
    return { file, seconds: beat.seconds, fadeIn: beat.fadeIn, fadeOut: beat.fadeOut };
  });

  const silent = join(workDir, `silent-${width}x${height}.mp4`);
  concatClips(clips, silent, TOTAL);

  muxAudio({
    video: silent,
    music,
    dest: join(outDir, videoName),
    duration: TOTAL,
    cues: [
      { file: join(audioDir, 'vo1.mp3'), at: 2.85 },
      { file: join(audioDir, 'vo2.mp3'), at: 6.0 },
      { file: join(audioDir, 'vo3.mp3'), at: 15.0 },
      { file: join(audioDir, 'vo4.mp3'), at: 25.4 },
    ],
  });
}

async function main() {
  if (!existsSync(iconSrc)) throw new Error(`Missing ${iconSrc}`);
  mkdirSync(outDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });
  ensureVoiceover();

  const demo = join(workDir, 'demo-capture.mp4');
  if (!existsSync(demo) || process.env.FACEBOOK_AD_RERECORD === '1') {
    console.log('Recording the live app for the listing beats…');
    await recordFacebookAdDemo();
  }

  const music = join(workDir, 'music-bed.wav');
  console.log('Scoring the music bed…');
  buildMusicBed(music, TOTAL);

  console.log('Cutting 30s portrait ad…');
  buildVersion({ width: 1080, height: 1350, videoName: 'ad-portrait.mp4', demo, music });
  console.log('Cutting 30s square ad…');
  buildVersion({ width: 1080, height: 1080, videoName: 'ad-square.mp4', demo, music });

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
