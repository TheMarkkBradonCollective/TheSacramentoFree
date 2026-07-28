/**
 * Regenerate Android launcher icons and splash screens from public/Logo.jpeg.
 * Uses @capacitor/assets with the app's dark brand background (#0b0b0c).
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoSrc = join(root, 'public', 'Logo.jpeg');
const assetsDir = join(root, 'assets');
const logoDest = join(assetsDir, 'logo.png');

mkdirSync(assetsDir, { recursive: true });
copyFileSync(logoSrc, logoDest);

const brandBg = '#0b0b0c';
const cli = join(root, 'node_modules', '@capacitor', 'assets', 'bin', 'capacitor-assets');

execFileSync(
  process.execPath,
  [
    cli,
    'generate',
    '--android',
    '--iconBackgroundColor',
    brandBg,
    '--iconBackgroundColorDark',
    brandBg,
    '--splashBackgroundColor',
    brandBg,
    '--splashBackgroundColorDark',
    brandBg,
  ],
  { cwd: root, stdio: 'inherit' },
);
