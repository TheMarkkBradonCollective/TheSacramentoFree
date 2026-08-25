/**
 * Regenerate Android launcher icons and splash screens from public/app-icon.png.
 *
 * app-icon.png is the Sacramento green squircle (download (6).png). Adaptive
 * launcher foregrounds keep transparency; legacy mipmaps are composited on the
 * same green so home-screen icons match the website/PWA.
 *
 * Android status-bar glyphs come from public/notification-icon.png (3D hands
 * artwork). That file is read-only here — only drawable density folders get
 * regenerated ic_stat_notification.png white silhouettes.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appIconSrc = join(root, 'public', 'app-icon.png');
const notificationIconSrc = join(root, 'public', 'notification-icon.png');
const assetsDir = join(root, 'assets');
const compositeDest = join(assetsDir, 'launcher-composite.png');
const resDir = join(root, 'android', 'app', 'src', 'main', 'res');
const splashBg = '#0b0b0c';
/** Sacramento green accent — matches --color-accent in src/index.css */
const launcherBg = '#00845a';

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

if (!existsSync(appIconSrc)) {
  throw new Error(`Missing app icon at ${appIconSrc}`);
}
if (!existsSync(notificationIconSrc)) {
  throw new Error(`Missing notification icon at ${notificationIconSrc}`);
}

mkdirSync(assetsDir, { recursive: true });

const { width, height } = readImageSize(appIconSrc);
writeCompositeLauncher(appIconSrc, compositeDest, Math.max(width, height));
console.log(`Composite launcher ${width}x${height} on ${launcherBg} → ${compositeDest}`);

if (prepareOnly) {
  process.exit(0);
}

if (!iconsOnly) {
  generateSplashScreens(launcherBg);
}

writeLauncherIcons(appIconSrc, compositeDest, launcherBg);
writeAdaptiveIconXml();
writeFileSync(
  join(resDir, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${launcherBg}</color>\n</resources>\n`,
);

assertLauncherForeground(join(resDir, 'mipmap-xxxhdpi', 'ic_launcher_foreground.png'));
assertLegacyLauncher(join(resDir, 'mipmap-xxxhdpi', 'ic_launcher.png'), launcherBg);
console.log('Android launcher icons written from app-icon.png.');

writeNotificationIcons(notificationIconSrc);

function readImageSize(src) {
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

function readRgbaFrame(pngPath) {
  const { width, height } = readImageSize(pngPath);
  const pixels = Uint8Array.from(
    execFileSync('ffmpeg', ['-v', 'error', '-i', pngPath, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], {
      maxBuffer: width * height * 4 + 1024 * 1024,
    }),
  );
  if (pixels.length !== width * height * 4) {
    throw new Error(`Unexpected raw frame size for ${pngPath}`);
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

function writeCompositeLauncher(srcPng, destPng, size) {
  const color = `0x${launcherBg.replace('#', '')}`;
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    `color=c=${color}:s=${size}x${size}`,
    '-i',
    srcPng,
    '-frames:v',
    '1',
    '-filter_complex',
    `[1:v]scale=${size}:${size}:flags=lanczos,format=rgba[icon];[0:v][icon]overlay=0:0:format=auto`,
    destPng,
  ]);
}

function scaleAdaptiveForeground(srcPng, destPng, canvasSize) {
  const iconSize = Math.round(canvasSize * 0.66);
  const pad = Math.round((canvasSize - iconSize) / 2);
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    srcPng,
    '-frames:v',
    '1',
    '-vf',
    `scale=${iconSize}:${iconSize}:flags=lanczos,format=rgba,pad=${canvasSize}:${canvasSize}:${pad}:${pad}:color=black@0.0`,
    destPng,
  ]);
}

function writeLauncherIcons(foregroundSrc, legacySrc, fillHex) {
  for (const [density, sizes] of Object.entries(DENSITIES)) {
    const dir = join(resDir, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    scaleRgbaPng(legacySrc, join(dir, 'ic_launcher.png'), sizes.icon);
    scaleRgbaPng(legacySrc, join(dir, 'ic_launcher_round.png'), sizes.icon);
    scaleAdaptiveForeground(foregroundSrc, join(dir, 'ic_launcher_foreground.png'), sizes.adaptive);
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

function extractWhiteSilhouette(srcPng) {
  const { width, height, pixels } = readRgbaFrame(srcPng);
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const alpha = pixels[i * 4 + 3];
    const o = i * 4;
    if (alpha > 24) {
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = alpha;
    }
  }
  return { rgba: out, width, height };
}

function writeNotificationIcons(srcPng) {
  const artwork = extractWhiteSilhouette(srcPng);
  const alphaSrc = join(assetsDir, 'notification-silhouette.png');
  mkdirSync(assetsDir, { recursive: true });
  writeRgbaPng(alphaSrc, artwork.rgba, artwork.width, artwork.height);

  const vectorIcon = join(resDir, 'drawable', 'ic_stat_notification.xml');
  if (existsSync(vectorIcon)) {
    unlinkSync(vectorIcon);
  }

  for (const [density, size] of Object.entries(NOTIFICATION_DENSITIES)) {
    const dir = join(resDir, `drawable-${density}`);
    mkdirSync(dir, { recursive: true });
    scaleRgbaPng(alphaSrc, join(dir, 'ic_stat_notification.png'), size);
  }

  assertNotificationStatusIcon(join(resDir, 'drawable-xxxhdpi', 'ic_stat_notification.png'));
  console.log(`Notification silhouettes → drawable-*/ic_stat_notification.png (from ${srcPng})`);
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

function hexToRgb(hex) {
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function assertLauncherForeground(pngPath) {
  const { width, height, pixels } = readRgbaFrame(pngPath);
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  let transparentCorners = 0;
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4;
    if (pixels[i + 3] < 24) transparentCorners += 1;
  }
  if (transparentCorners < 2) {
    throw new Error(`Expected transparent corners on adaptive foreground ${pngPath}`);
  }

  let greenish = 0;
  for (let y = Math.round(height * 0.35); y < Math.round(height * 0.65); y++) {
    for (let x = Math.round(width * 0.35); x < Math.round(width * 0.65); x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 24) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (g > 70 && g > r + 20 && b > 30) greenish += 1;
    }
  }
  if (greenish < 80) {
    throw new Error(`Expected Sacramento green artwork in ${pngPath}, found ${greenish} greenish pixels.`);
  }
}

function assertLegacyLauncher(pngPath, hex) {
  const { width, height, pixels } = readRgbaFrame(pngPath);
  const [tr, tg, tb] = hexToRgb(hex);
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (Math.abs(r - tr) > 24 || Math.abs(g - tg) > 24 || Math.abs(b - tb) > 24) {
      throw new Error(
        `Expected ${hex} corners on ${pngPath}, got rgb(${r},${g},${b}) at ${x},${y}`,
      );
    }
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
