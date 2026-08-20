/**
 * Regenerate Android launcher icons and splash screens from public/Logo.jpeg.
 *
 * The community logo is a 3D orange squircle on a white JPEG. PWA home-screen
 * icons mask that square and look correct. Android adaptive icons do not: they
 * show the white JPEG canvas (and @capacitor/assets' 16.7% inset) as a white
 * ring around the artwork.
 *
 * This script paints the white/shadow canvas with the logo's orange, writes
 * full-bleed mipmaps, and replaces the adaptive-icon XML so both layers fill
 * the 108dp canvas with no inset.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoSrc = join(root, 'public', 'Logo.jpeg');
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

const NOTIFICATION_DENSITIES = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

function isNotificationSubject(r, g, b, fill) {
  if (isCanvasPixel(r, g, b)) return false;
  const dr = Math.abs(r - fill[0]);
  const dg = Math.abs(g - fill[1]);
  const db = Math.abs(b - fill[2]);
  if (dr < 42 && dg < 42 && db < 42) return false;
  return true;
}

function writeNotificationSilhouettePng(srcJpeg, destPng) {
  const probe = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', srcJpeg],
    { encoding: 'utf8' },
  ).trim();
  const [width, height] = probe.split(',').map(Number);
  if (!width || !height) {
    throw new Error(`Could not read dimensions for ${srcJpeg}`);
  }

  const pixels = Uint8Array.from(
    execFileSync('ffmpeg', ['-v', 'error', '-i', srcJpeg, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {
      maxBuffer: width * height * 3 + 1024 * 1024,
    }),
  );
  const fill = sampleOrange(pixels, width, height);
  const rgba = new Uint8Array(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = pixels[i * 3];
    const g = pixels[i * 3 + 1];
    const b = pixels[i * 3 + 2];
    const o = i * 4;
    if (isNotificationSubject(r, g, b, fill)) {
      rgba[o] = 255;
      rgba[o + 1] = 255;
      rgba[o + 2] = 255;
      rgba[o + 3] = 255;
    }
  }

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

function writeNotificationIcons(srcJpeg) {
  const silhouetteSrc = join(assetsDir, 'notification-silhouette.png');
  const publicIcon = join(root, 'public', 'notification-icon.png');
  writeNotificationSilhouettePng(srcJpeg, silhouetteSrc);

  const vectorIcon = join(resDir, 'drawable', 'ic_stat_notification.xml');
  if (existsSync(vectorIcon)) {
    unlinkSync(vectorIcon);
  }

  for (const [density, size] of Object.entries(NOTIFICATION_DENSITIES)) {
    const dir = join(resDir, `drawable-${density}`);
    mkdirSync(dir, { recursive: true });
    scalePng(silhouetteSrc, join(dir, 'ic_stat_notification.png'), size);
  }

  scalePng(silhouetteSrc, publicIcon, 192);
  console.log(`Notification silhouette → drawable-*/ic_stat_notification.png + ${publicIcon}`);
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

  const fill = sampleOrange(pixels, width, height);
  floodFillBackground(pixels, width, height, fill);
  dilateFill(pixels, width, height, fill, 3);

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel', 'error',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      '-s', `${width}x${height}`,
      '-i', 'pipe:0',
      '-frames:v', '1',
      '-update', '1',
      dest,
    ],
    { input: Buffer.from(pixels) },
  );

  return { width, height, hex: rgbToHex(fill), fill };
}

function sampleOrange(pixels, width, height) {
  const oranges = [];
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 3;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (r > 200 && r > g + 80 && r > b + 100 && g > 50 && g < 170) {
        oranges.push([r, g, b]);
      }
    }
  }
  if (oranges.length < 50) {
    throw new Error('Could not sample the logo orange fill color.');
  }
  oranges.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return oranges[(oranges.length / 2) | 0];
}

function isCanvasPixel(r, g, b) {
  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const sat = maxc - minc;
  if (minc >= 210 && sat < 25) return true;
  if (sat <= 35 && minc >= 95) return true;
  return false;
}

function floodFillBackground(pixels, width, height, fill) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
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
    if (!isCanvasPixel(pixels[i], pixels[i + 1], pixels[i + 2])) continue;
    pixels[i] = fill[0];
    pixels[i + 1] = fill[1];
    pixels[i + 2] = fill[2];
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
}

function dilateFill(pixels, width, height, fill, radius) {
  const match = (i) => pixels[i] === fill[0] && pixels[i + 1] === fill[1] && pixels[i + 2] === fill[2];
  const snapshot = Uint8Array.from(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      if (match(i)) continue;
      let near = false;
      for (let dy = -radius; dy <= radius && !near; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const ni = (ny * width + nx) * 3;
          if (snapshot[ni] === fill[0] && snapshot[ni + 1] === fill[1] && snapshot[ni + 2] === fill[2]) {
            near = true;
            break;
          }
        }
      }
      if (!near) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // Eat anti-aliased white/peach fringe only — leave the hands and bill.
      if (isCanvasPixel(r, g, b) || (r > 180 && g > 120 && b > 70)) {
        pixels[i] = fill[0];
        pixels[i + 1] = fill[1];
        pixels[i + 2] = fill[2];
      }
    }
  }
}

function scalePng(src, dest, size) {
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel', 'error',
    '-i', src,
    '-frames:v', '1',
    '-vf', `scale=${size}:${size}:flags=lanczos`,
    dest,
  ]);
}

function solidPng(hex, dest, size) {
  const color = `0x${hex.replace('#', '')}`;
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel', 'error',
    '-f', 'lavfi',
    '-i', `color=c=${color}:s=${size}x${size}`,
    '-frames:v', '1',
    dest,
  ]);
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function assertCornersAreFill(pngPath, hex) {
  const [r, g, b] = hexToRgb(hex);
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
    const dr = Math.abs(pixels[i] - r);
    const dg = Math.abs(pixels[i + 1] - g);
    const db = Math.abs(pixels[i + 2] - b);
    if (dr > 18 || dg > 18 || db > 18) {
      throw new Error(
        `Expected orange corners on ${pngPath}, got rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}) at ${x},${y}`,
      );
    }
  }
}

function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

writeNotificationIcons(logoSrc);
