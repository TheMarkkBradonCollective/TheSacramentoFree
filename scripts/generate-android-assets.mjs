/**
 * Regenerate Android launcher icons and splash screens from public/Logo.png.
 *
 * Logo.png is the uploaded Sacramento Free app icon (ink on newsprint), copied
 * byte-for-byte from public/App icon TheSacramentoFree.png. Launcher mipmaps
 * are scaled from that file with no orange fill and no adaptive inset.
 *
 * Web push keeps the same artwork (public/notification-icon.png). Android
 * status-bar glyphs must be white on transparent, so the ink is written as an
 * alpha mask at drawable-{density}/ic_stat_notification.png.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoSrc = join(root, 'public', 'Logo.png');
const assetsDir = join(root, 'assets');
const fullBleedDest = join(assetsDir, 'icon-fullbleed.png');
const logoDest = join(assetsDir, 'logo.png');
const resDir = join(root, 'android', 'app', 'src', 'main', 'res');
const splashBg = '#0b0b0c';

const DENSITIES = {
  ldpi: { icon: 36, adaptive: 81 },
  mdpi: { icon: 48, adaptive: 108 },
  hdpi: { icon: 72, adaptive: 162 },
  xhdpi: { icon: 96, adaptive: 216 },
  xxhdpi: { icon: 144, adaptive: 324 },
  xxxhdpi: { icon: 192, adaptive: 432 },
};

const NOTIFICATION_DENSITIES = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

const args = new Set(process.argv.slice(2));
const prepareOnly = args.has('--prepare-only');
const iconsOnly = args.has('--icons-only');

function requireCmd(cmd) {
  try {
    execFileSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' });
  } catch {
    throw new Error(`${cmd} is required to generate Android launcher icons.`);
  }
}

requireCmd('ffmpeg');
requireCmd('ffprobe');

if (!existsSync(logoSrc)) {
  throw new Error(`Missing logo at ${logoSrc}`);
}

mkdirSync(assetsDir, { recursive: true });

const { width, height, hex: iconBg } = writeFullBleedIcon(logoSrc, fullBleedDest);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', fullBleedDest, '-frames:v', '1', logoDest]);

console.log(`Full-bleed icon ${width}x${height} with fill ${iconBg} → ${fullBleedDest}`);

if (prepareOnly) {
  process.exit(0);
}

if (!iconsOnly) {
  generateSplashScreens(iconBg);
}

writeLauncherIcons(fullBleedDest, iconBg);
writeAdaptiveIconXml();
writeFileSync(
  join(resDir, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${iconBg}</color>\n</resources>\n`,
);

assertCornersAreFill(join(resDir, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png'), iconBg);
assertCornersAreFill(join(resDir, 'mipmap-xxxhdpi', 'ic_launcher.png'), iconBg);
console.log('Android launcher icons written (full-bleed, no adaptive inset).');

writeNotificationIcons(logoSrc);

function isPaperPixel(r, g, b, fill) {
  const dr = Math.abs(r - fill[0]);
  const dg = Math.abs(g - fill[1]);
  const db = Math.abs(b - fill[2]);
  if (dr < 36 && dg < 36 && db < 36) return true;
  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const sat = maxc - minc;
  const avg = (r + g + b) / 3;
  return avg > 168 && sat < 48;
}

function sampleCornerFill(pixels, width, height) {
  const samples = [];
  const block = Math.max(2, Math.round(Math.min(width, height) * 0.04));
  const corners = [
    [0, 0],
    [width - block, 0],
    [0, height - block],
    [width - block, height - block],
  ];
  for (const [x0, y0] of corners) {
    for (let y = y0; y < y0 + block; y++) {
      for (let x = x0; x < x0 + block; x++) {
        const i = (y * width + x) * 3;
        samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
      }
    }
  }
  samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  return samples[(samples.length / 2) | 0];
}

function floodFillPaperMask(pixels, width, height, fill) {
  const n = width * height;
  const seen = new Uint8Array(n);
  const paper = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  const seed = (x, y) => {
    const idx = y * width + x;
    if (seen[idx]) return;
    seen[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const i = idx * 3;
    if (!isPaperPixel(pixels[i], pixels[i + 1], pixels[i + 2], fill)) continue;
    paper[idx] = 1;
    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0 && !seen[idx - 1]) {
      seen[idx - 1] = 1;
      queue[tail++] = idx - 1;
    }
    if (x + 1 < width && !seen[idx + 1]) {
      seen[idx + 1] = 1;
      queue[tail++] = idx + 1;
    }
    if (y > 0 && !seen[idx - width]) {
      seen[idx - width] = 1;
      queue[tail++] = idx - width;
    }
    if (y + 1 < height && !seen[idx + width]) {
      seen[idx + width] = 1;
      queue[tail++] = idx + width;
    }
  }

  return paper;
}

function extractInkSilhouette(srcPng) {
  const { width, height, pixels } = readRgbFrame(srcPng);
  const fill = sampleCornerFill(pixels, width, height);
  const paper = floodFillPaperMask(pixels, width, height, fill);

  let sx0 = width;
  let sy0 = height;
  let sx1 = -1;
  let sy1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (paper[y * width + x]) continue;
      if (x < sx0) sx0 = x;
      if (y < sy0) sy0 = y;
      if (x > sx1) sx1 = x;
      if (y > sy1) sy1 = y;
    }
  }
  if (sx1 < 0) {
    throw new Error('Could not extract ink from the newspaper app icon.');
  }

  const pad = Math.round(0.1 * Math.max(sx1 - sx0 + 1, sy1 - sy0 + 1));
  let side = Math.max(sx1 - sx0 + 1, sy1 - sy0 + 1) + pad * 2;
  const cx = (sx0 + sx1) >> 1;
  const cy = (sy0 + sy1) >> 1;
  let x0 = Math.max(0, Math.min(width - side, cx - (side >> 1)));
  let y0 = Math.max(0, Math.min(height - side, cy - (side >> 1)));
  side = Math.min(side, width - x0, height - y0);

  const alpha = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const sx = x0 + x;
      const sy = y0 + y;
      const idx = sy * width + sx;
      const i = idx * 3;
      const o = (y * side + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const a = paper[idx] || lum > 196 ? 0 : Math.min(255, Math.round((210 - lum) * 1.35));
      alpha[o] = 255;
      alpha[o + 1] = 255;
      alpha[o + 2] = 255;
      alpha[o + 3] = a;
    }
  }

  return { alpha, size: side };
}

function readRgbFrame(src) {
  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src],
    { encoding: 'utf8' },
  ).trim();
  const [width, height] = probe.split(',').map(Number);
  if (!width || !height) {
    throw new Error(`Could not read dimensions for ${src}`);
  }
  const pixels = Uint8Array.from(
    execFileSync('ffmpeg', ['-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {
      maxBuffer: width * height * 3 + 1024 * 1024,
    }),
  );
  if (pixels.length !== width * height * 3) {
    throw new Error(`Unexpected raw frame size for ${src}`);
  }
  return { width, height, pixels };
}

function writeRgbaPng(destPng, rgba, width, height) {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${width}x${height}`,
      '-i',
      'pipe:0',
      '-frames:v',
      '1',
      '-update',
      '1',
      destPng,
    ],
    { input: Buffer.from(rgba) },
  );
}

function scaleRgbaPng(src, dest, size) {
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    src,
    '-frames:v',
    '1',
    '-vf',
    `scale=${size}:${size}:flags=lanczos,format=rgba`,
    dest,
  ]);
}

function writeNotificationIcons(srcPng) {
  const artwork = extractInkSilhouette(srcPng);
  const alphaSrc = join(assetsDir, 'notification-silhouette.png');
  const publicIcon = join(root, 'public', 'notification-icon.png');

  mkdirSync(assetsDir, { recursive: true });
  writeRgbaPng(alphaSrc, artwork.alpha, artwork.size, artwork.size);

  const vectorIcon = join(resDir, 'drawable', 'ic_stat_notification.xml');
  if (existsSync(vectorIcon)) {
    unlinkSync(vectorIcon);
  }

  for (const [density, size] of Object.entries(NOTIFICATION_DENSITIES)) {
    const dir = join(resDir, `drawable-${density}`);
    mkdirSync(dir, { recursive: true });
    scaleRgbaPng(alphaSrc, join(dir, 'ic_stat_notification.png'), size);
  }

  scaleRgbaPng(srcPng, publicIcon, 512);
  assertNotificationColorIcon(publicIcon);
  assertNotificationStatusIcon(join(resDir, 'drawable-xxxhdpi', 'ic_stat_notification.png'));
  console.log(`Notification artwork → drawable-*/ic_stat_notification.png + ${publicIcon}`);
}

function generateSplashScreens(iconBackgroundColor) {
  const cli = join(root, 'node_modules', '@capacitor', 'assets', 'bin', 'capacitor-assets');
  if (!existsSync(cli)) {
    console.warn('Skipping splash generation (@capacitor/assets is not installed).');
    return;
  }
  execFileSync(
    process.execPath,
    [
      cli,
      'generate',
      '--android',
      '--iconBackgroundColor',
      iconBackgroundColor,
      '--iconBackgroundColorDark',
      iconBackgroundColor,
      '--splashBackgroundColor',
      splashBg,
      '--splashBackgroundColorDark',
      splashBg,
    ],
    { cwd: root, stdio: 'inherit' },
  );
}

function writeLauncherIcons(srcPng, fillHex) {
  for (const [density, sizes] of Object.entries(DENSITIES)) {
    const dir = join(resDir, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    scalePng(srcPng, join(dir, 'ic_launcher.png'), sizes.icon);
    scalePng(srcPng, join(dir, 'ic_launcher_round.png'), sizes.icon);
    scalePng(srcPng, join(dir, 'ic_launcher_foreground.png'), sizes.adaptive);
    solidPng(fillHex, join(dir, 'ic_launcher_background.png'), sizes.adaptive);
  }
}

function writeAdaptiveIconXml() {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  const anyDpi = join(resDir, 'mipmap-anydpi-v26');
  mkdirSync(anyDpi, { recursive: true });
  writeFileSync(join(anyDpi, 'ic_launcher.xml'), xml);
  writeFileSync(join(anyDpi, 'ic_launcher_round.xml'), xml);
}

function writeFullBleedIcon(src, dest) {
  const { width, height, pixels } = readRgbFrame(src);
  const fill = sampleCornerFill(pixels, width, height);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', dest]);
  return { width, height, hex: rgbToHex(fill), fill };
}

function scalePng(src, dest, size) {
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    src,
    '-frames:v',
    '1',
    '-vf',
    `scale=${size}:${size}:flags=lanczos`,
    dest,
  ]);
}

function solidPng(hex, dest, size) {
  const color = `0x${hex.replace('#', '')}`;
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=${color}:s=${size}x${size}`,
    '-frames:v',
    '1',
    dest,
  ]);
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function assertCornersAreFill(pngPath, hex) {
  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', pngPath],
    { encoding: 'utf8' },
  ).trim();
  const [width, height] = probe.split(',').map(Number);
  const pixels = Uint8Array.from(
    execFileSync('ffmpeg', ['-v', 'error', '-i', pngPath, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']),
  );
  const samples = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [x, y] of samples) {
    const i = (y * width + x) * 3;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const avg = (r + g + b) / 3;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const orange = r > 170 && r > g + 40 && r > b + 50;
    if (avg < 110 || sat > 90 || orange) {
      throw new Error(
        `Expected paper corners on ${pngPath}, got rgb(${r},${g},${b}) at ${x},${y} (fill ${hex})`,
      );
    }
  }
}

function readRgbaFrame(pngPath) {
  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', pngPath],
    { encoding: 'utf8' },
  ).trim();
  const [width, height] = probe.split(',').map(Number);
  const pixels = Uint8Array.from(
    execFileSync('ffmpeg', ['-v', 'error', '-i', pngPath, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], {
      maxBuffer: width * height * 4 + 1024 * 1024,
    }),
  );
  return { width, height, pixels };
}

function assertNotificationColorIcon(pngPath) {
  const { width, height, pixels } = readRgbaFrame(pngPath);
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4;
    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    const sat = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (avg < 140 || sat > 60) {
      throw new Error(
        `Expected paper corners on ${pngPath}, got rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}) at ${x},${y}`,
      );
    }
  }

  let ink = 0;
  for (let y = Math.round(height * 0.2); y < Math.round(height * 0.8); y++) {
    for (let x = Math.round(width * 0.15); x < Math.round(width * 0.85); x++) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (lum < 90) ink += 1;
    }
  }
  if (ink < 80) {
    throw new Error(`Expected newspaper ink in ${pngPath}, found ${ink} dark pixels.`);
  }
}

function assertNotificationStatusIcon(pngPath) {
  const { width, height, pixels } = readRgbaFrame(pngPath);
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4;
    if (pixels[i + 3] > 24) {
      throw new Error(`Expected transparent corners on ${pngPath}, got alpha ${pixels[i + 3]} at ${x},${y}`);
    }
  }

  let opaque = 0;
  for (let i = 0; i < width * height; i++) {
    if (pixels[i * 4 + 3] > 160) opaque += 1;
  }
  if (opaque < 80) {
    throw new Error(`Expected a white status-bar silhouette on ${pngPath}, found ${opaque} opaque pixels.`);
  }
}
