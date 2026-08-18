#!/usr/bin/env node
/**
 * Capture Google Play phone screenshots (1080×1920, 24-bit PNG) from the live app.
 *
 * Usage:
 *   PLAY_REVIEW_EMAIL=... PLAY_REVIEW_PASSWORD=... node scripts/capture-play-store-screenshots.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'play-store-assets', 'screenshots');
const tmpDir = join(outDir, '.raw');

const ORIGIN = process.env.PLAY_SCREENSHOT_ORIGIN || 'https://www.sacramentobuynothing.com';
const EMAIL = process.env.PLAY_REVIEW_EMAIL || 'playstore-review@sacramentobuynothing.com';
const PASSWORD = process.env.PLAY_REVIEW_PASSWORD || '';

// CSS viewport stays under the 768px mobile breakpoint; scale up to 1080×1920 PNG.
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

async function dismissGates(page) {
  for (let i = 0; i < 8; i++) {
    const handled = await page.evaluate(() => {
      const dismiss = document.querySelector('[aria-label="Dismiss"]');
      if (dismiss instanceof HTMLElement) {
        dismiss.click();
        return true;
      }
      const labeled = Array.from(document.querySelectorAll('button')).find((n) =>
        /^(maybe later|not now|skip|accept & continue)$/i.test((n.textContent || '').trim()),
      );
      if (labeled) {
        const dialog = labeled.closest('[role="dialog"]');
        const checkbox = dialog?.querySelector('input[type="checkbox"]');
        if (checkbox instanceof HTMLInputElement && !checkbox.checked) checkbox.click();
        labeled.click();
        return true;
      }
      return false;
    });
    if (!handled) break;
    await wait(700);
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
    await wait(500);
  }
  throw new Error(`Could not open mobile tab ${id}`);
}

async function dismissLocationBanner(page) {
  await page.evaluate(() => {
    const banner = Array.from(document.querySelectorAll('div, p')).find((n) =>
      /location permission denied/i.test(n.textContent || ''),
    );
    if (!banner) return;
    const close = banner.closest('div')?.querySelector('button');
    close?.click();
  });
}

async function shot(page, name) {
  await dismissGates(page);
  await dismissLocationBanner(page);
  await wait(500);
  const raw = join(tmpDir, `${name}.png`);
  const dest = join(outDir, `${name}.png`);
  await page.screenshot({ path: raw, type: 'png', captureBeyondViewport: false });
  flattenPng(raw, dest);
  console.log(`wrote ${dest}`);
}

async function main() {
  if (!PASSWORD) {
    console.error('Set PLAY_REVIEW_PASSWORD to capture signed-in screenshots.');
    process.exit(1);
  }

  mkdirSync(tmpDir, { recursive: true });

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
  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  );
  page.setDefaultTimeout(45000);

  try {
    const onlyExtra = process.env.PLAY_SCREENSHOT_SET === 'extra';

    if (!onlyExtra) {
      await page.goto(`${ORIGIN}/#/`, { waitUntil: 'networkidle2', timeout: 60000 });
      await wait(1500);
      await shot(page, '01-home');
    }

    await page.goto(`${ORIGIN}/#/login`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(800);
    await page.waitForSelector('#auth-signin-email');
    await page.click('#auth-signin-email', { clickCount: 3 });
    await page.type('#auth-signin-email', EMAIL, { delay: 20 });
    await page.click('#auth-signin-password', { clickCount: 3 });
    await page.type('#auth-signin-password', PASSWORD, { delay: 20 });
    await page.click('button[type="submit"]');
    await page.waitForSelector('#mobile_sticky_footer_nav, [role="dialog"]', { timeout: 45000 });
    await wait(1200);
    await dismissGates(page);
    await page.waitForSelector('#mobile_sticky_footer_nav', { timeout: 45000 });
    await wait(2000);
    await dismissGates(page);
    await wait(800);

    await openTab(page, 'feed');
    await page.waitForSelector('#item_feed_wrapper', { timeout: 20000 }).catch(() => null);
    await wait(1500);
    if (!onlyExtra) await shot(page, '02-feed');

    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[id^="item_card_"]'));
      const withPhoto = cards.find((card) => card.querySelector('img'));
      const card = withPhoto || cards[0];
      const btn = card?.querySelector('button');
      if (btn instanceof HTMLElement) btn.click();
    });
    await page.waitForSelector('#item_detail_fullscreen', { timeout: 12000 });
    await wait(1500);
    await shot(page, '07-listing');
    await page.evaluate(() => {
      const back = document.querySelector('#item_detail_fullscreen [aria-label="Back"]');
      if (back instanceof HTMLElement) back.click();
    });
    await wait(800);

    await openTab(page, 'events');
    await wait(1500);
    if (!onlyExtra) await shot(page, '03-events');

    await page.evaluate(() => {
      const card = document.querySelector('[id^="event_card_"]');
      const btn = card?.querySelector('button');
      if (btn instanceof HTMLElement) btn.click();
    });
    await page.waitForFunction(
      () => {
        const back = document.querySelector('[aria-label="Back"]');
        const sheet = document.querySelector('.sbn-app-sheet');
        return !!(back && sheet);
      },
      { timeout: 12000 },
    );
    await wait(1500);
    await shot(page, '08-event');
    await page.click('[aria-label="Back"]').catch(() => null);
    await wait(800);

    if (!onlyExtra) {
      await openTab(page, 'map');
      await wait(2500);
      await shot(page, '04-map');

      await openTab(page, 'chats');
      await wait(1500);
      await shot(page, '05-messages');

      await openTab(page, 'profile');
      await wait(1500);
      await shot(page, '06-account');
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
