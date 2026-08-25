#!/usr/bin/env node
/**
 * Capture Google Play phone screenshots (1080×1920, 24-bit PNG) from a local
 * demo build that uses fictional neighbors — never live user data.
 *
 * Usage:
 *   npm run android:play-screenshots
 *
 * Starts Vite with VITE_PLAY_STORE_DEMO=1 unless PLAY_SCREENSHOT_ORIGIN is set.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { packPlayStoreScreenshotsZip } from './pack-play-store-screenshots.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'play-store-assets', 'screenshots');
const tmpDir = join(outDir, '.raw');

const PORT = process.env.PLAY_SCREENSHOT_PORT || '4178';
const ORIGIN = process.env.PLAY_SCREENSHOT_ORIGIN || `http://127.0.0.1:${PORT}`;
const START_LOCAL = !process.env.PLAY_SCREENSHOT_ORIGIN;

const WIDTH = 360;
const HEIGHT = 640;
const SCALE = 3;

function flattenPng(src, dest) {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-pix_fmt', 'rgb24', dest],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${src}: ${result.stderr || result.stdout}`);
  }
}

async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function startDemoServer() {
  const child = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    {
      cwd: root,
      env: {
        ...process.env,
        VITE_PLAY_STORE_DEMO: '1',
        BROWSER: 'none',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return { child, ready: waitForReady(() => output) };
}

function waitForReady(readOutput) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const text = readOutput();
      if (/Local:|ready in/i.test(text)) {
        clearInterval(timer);
        resolve(undefined);
        return;
      }
      if (Date.now() - started > 60000) {
        clearInterval(timer);
        reject(new Error(`Vite did not start:\n${text}`));
      }
    }, 250);
  });
}

async function dismissGates(page) {
  for (let i = 0; i < 8; i++) {
    const handled = await page.evaluate(() => {
      const dismiss = document.querySelector('[aria-label="Dismiss"]');
      if (dismiss instanceof HTMLElement) {
        dismiss.click();
        return true;
      }
      const labeled = Array.from(document.querySelectorAll('button')).find((n) =>
        /^(maybe later|not now|skip|accept & continue|got it — thanks mark)$/i.test(
          (n.textContent || '').trim(),
        ),
      );
      if (labeled) {
        labeled.click();
        return true;
      }
      return false;
    });
    if (!handled) break;
    await wait(400);
  }
}

async function openTab(page, id) {
  const selector = `#mobile_nav_${id}`;
  await page.waitForSelector(selector, { timeout: 20000 });
  for (let i = 0; i < 6; i++) {
    await dismissGates(page);
    await page.click(selector);
    const active = await page
      .waitForSelector(`${selector}[aria-current="page"]`, { timeout: 1500 })
      .then(() => true)
      .catch(() => false);
    if (active) {
      await wait(800);
      return;
    }
    await wait(400);
  }
  throw new Error(`Could not open mobile tab ${id}`);
}

async function waitForImages(page) {
  await page
    .waitForFunction(
      () =>
        Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0) ||
        document.images.length === 0,
      { timeout: 12000 },
    )
    .catch(() => null);
}

async function shot(page, name) {
  await dismissGates(page);
  await waitForImages(page);
  await wait(400);
  const raw = join(tmpDir, `${name}.png`);
  const dest = join(outDir, `${name}.png`);
  await page.screenshot({ path: raw, type: 'png', captureBeyondViewport: false });
  flattenPng(raw, dest);
  console.log(`wrote ${dest}`);
}

async function main() {
  mkdirSync(tmpDir, { recursive: true });

  let server = null;
  if (START_LOCAL) {
    console.log(`Starting demo Vite on ${ORIGIN} (VITE_PLAY_STORE_DEMO=1)`);
    server = startDemoServer();
    await server.ready;
    await wait(800);
  }

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=1080,1920`,
    ],
    defaultViewport: {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: SCALE,
      isMobile: true,
      hasTouch: true,
    },
  });

  const page = await browser.newPage();
  const origin = new URL(ORIGIN).origin;
  const context = page.browserContext();
  await context.overridePermissions(origin, ['geolocation']);
  await page.setGeolocation({ latitude: 38.5816, longitude: -121.4944 });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'light' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);
  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  );
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('sbn_theme', 'light');
      localStorage.setItem(
        'sbn_newspaper_experience_v1',
        JSON.stringify({
          pageSounds: false,
          typewriterSounds: false,
          notificationSounds: false,
          immersiveMode: false,
          reducedMotion: true,
        }),
      );
      document.documentElement.classList.add('light', 'newspaper-preview');
      document.documentElement.classList.remove('dark');
    } catch {
      /* ignore */
    }
  });
  page.setDefaultTimeout(45000);

  try {
    await page.goto(`${ORIGIN}/#/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(1800);
    await waitForImages(page);
    await shot(page, '01-home');

    await page.goto(`${ORIGIN}/feed`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('#mobile_sticky_footer_nav', { timeout: 45000 });
    await wait(1200);
    await dismissGates(page);
    await page.waitForSelector('#mobile_nav_feed[aria-current="page"]', { timeout: 20000 });
    await page.waitForSelector('#feed_post_demo-feed-hey', { timeout: 20000 });
    await page.waitForSelector('#feed_post_demo-feed-job-ask', { timeout: 20000 });
    await wait(1000);
    await shot(page, '02-feed');

    await openTab(page, 'stuff');
    await page.waitForSelector('#item_feed_wrapper', { timeout: 20000 }).catch(() => null);
    await wait(1000);
    await shot(page, '03-stuff');

    await page.evaluate(() => {
      const chair = document.querySelector('#item_card_demo-item-chair button');
      if (chair instanceof HTMLElement) {
        chair.click();
        return;
      }
      const cards = Array.from(document.querySelectorAll('[id^="item_card_"]'));
      const withPhoto = cards.find((card) => card.querySelector('img'));
      const card = withPhoto || cards[0];
      const btn = card?.querySelector('button');
      if (btn instanceof HTMLElement) btn.click();
    });
    await page.waitForSelector('#item_detail_fullscreen', { timeout: 12000 });
    await wait(1500);
    await shot(page, '04-listing');
    await page.evaluate(() => {
      const back = document.querySelector('#item_detail_fullscreen [aria-label="Back"]');
      if (back instanceof HTMLElement) back.click();
    });
    await wait(800);

    await openTab(page, 'map');
    await wait(2000);
    await page.evaluate(() => {
      const zoomOut = document.querySelector('.leaflet-control-zoom-out');
      if (zoomOut instanceof HTMLElement) {
        zoomOut.click();
        zoomOut.click();
      }
    });
    await wait(1800);
    await shot(page, '05-map');

    await openTab(page, 'events');
    await wait(1500);
    await shot(page, '06-events');

    await page.evaluate(() => {
      const picnic = document.querySelector('#event_card_demo-event-picnic button');
      if (picnic instanceof HTMLElement) {
        picnic.click();
        return;
      }
      const card = document.querySelector('[id^="event_card_"]');
      const btn = card?.querySelector('button');
      if (btn instanceof HTMLElement) btn.click();
    });
    await page.waitForSelector('#event_detail_fullscreen', { timeout: 12000 });
    await wait(1500);
    await shot(page, '07-event');
    await page.click('#event_detail_fullscreen [aria-label="Back"]').catch(() => null);
    await wait(800);

    await openTab(page, 'chats');
    await page.waitForSelector('#chat_inbox_list, #empty_chat_inbox_state', { timeout: 20000 });
    await wait(1200);
    await shot(page, '08-messages');

    const goGetScenes = [
      ['goget-listing', '09-goget-listing', '#item_detail_fullscreen', 2500],
      ['goget-chat', '10-goget-chat', '#chat_start_go_get_btn', 2000],
      ['goget-ring', '11-goget-ring', '#go_get_incoming_ring_overlay', 2500],
      ['goget-waiting', '12-goget-waiting', '#go_get_trip_lock_screen, #go_get_ring_waiting', 2000],
      ['goget-navigation', '13-goget-navigation', '#map_navigation_view', 8000],
      ['goget-tracking', '14-goget-tracking', '#go_get_trip_lock_screen, #go_get_live_tracking_card', 3000],
      ['goget-meeting', '15-goget-meeting', '#go_get_trip_lock_screen, .go-get-meeting-pickup-pin, .leaflet-container', 3000],
      ['goget-arrived', '16-goget-arrived', '#go_get_trip_lock_screen, #go_get_arrived_handoff', 2000],
    ];

    for (const [scene, filename, selector, settleMs] of goGetScenes) {
      await page.goto(`${ORIGIN}/feed?scene=${scene}`, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector(selector, { timeout: scene === 'goget-navigation' ? 60000 : 30000 });
      if (scene === 'goget-navigation') {
        await page
          .waitForSelector('#nav_instruction_banner', { timeout: 45000 })
          .catch(() => null);
        await page.evaluate(() => {
          const zoomOut = document.querySelector('.leaflet-control-zoom-out');
          if (zoomOut instanceof HTMLElement) zoomOut.click();
        });
      }
      if (scene === 'goget-meeting') {
        await page.evaluate(() => {
          const zoomOut = document.querySelector('.leaflet-control-zoom-out');
          if (zoomOut instanceof HTMLElement) {
            zoomOut.click();
            zoomOut.click();
          }
        });
      }
      await wait(settleMs);
      await shot(page, filename);
    }

    packPlayStoreScreenshotsZip();
  } finally {
    if (server) {
      try {
        server.child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }
    await Promise.race([
      browser.close(),
      wait(2000),
    ]);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
