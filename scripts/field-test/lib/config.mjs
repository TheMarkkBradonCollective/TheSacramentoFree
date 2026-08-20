import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

export const ROOT_DIR = root;
export const FIXTURE_PHOTO = join(root, 'scripts/field-test/fixtures/test-photo.png');

export function loadConfig() {
  const runId = process.env.FIELD_TEST_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
  const outRoot = process.env.FIELD_TEST_OUT_DIR || join(root, 'field-test-assets', runId);

  return {
    runId,
    outRoot,
    webOutDir: join(outRoot, 'web'),
    apkOutDir: join(outRoot, 'apk'),
    origin: process.env.FIELD_TEST_ORIGIN || process.env.PLAY_SCREENSHOT_ORIGIN || 'https://www.sacramentobuynothing.com',
    chromePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    posterEmail: process.env.FIELD_TEST_POSTER_EMAIL || 'field-test-poster@sacramentobuynothing.com',
    posterPassword: process.env.FIELD_TEST_POSTER_PASSWORD || 'FieldTest-Poster-2026!',
    neighborEmail: process.env.FIELD_TEST_NEIGHBOR_EMAIL || 'field-test-neighbor@sacramentobuynothing.com',
    neighborPassword: process.env.FIELD_TEST_NEIGHBOR_PASSWORD || 'FieldTest-Neighbor-2026!',
    posterName: process.env.FIELD_TEST_POSTER_NAME || 'Field Test Poster',
    neighborName: process.env.FIELD_TEST_NEIGHBOR_NAME || 'Field Test Neighbor',
    neighborhood: process.env.FIELD_TEST_NEIGHBORHOOD || 'Midtown',
    geolocation: {
      latitude: Number(process.env.FIELD_TEST_LAT || 38.5816),
      longitude: Number(process.env.FIELD_TEST_LNG || -121.4944),
    },
    apkPath:
      process.env.FIELD_TEST_APK_PATH ||
      join(root, 'dist/android/sac-buy-nothing-debug.apk'),
    androidHome: process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '',
    avdName: process.env.FIELD_TEST_AVD || '',
    startEmulator: process.env.FIELD_TEST_START_EMULATOR === '1',
    packageName: 'org.sacramentobuynothing.app',
    mainActivity: 'org.sacramentobuynothing.app/.MainActivity',
    skipAccountProvision: process.env.FIELD_TEST_SKIP_ACCOUNTS === '1',
    skipCleanup: process.env.FIELD_TEST_SKIP_CLEANUP === '1',
    viewport: {
      width: 360,
      height: 640,
      deviceScaleFactor: 3,
    },
  };
}

export function listingTitle(prefix, runId) {
  return `[FieldTest ${runId}] ${prefix}`;
}
