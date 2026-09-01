#!/usr/bin/env node
/**
 * Record live demo-app footage for the Facebook video ad (Stuff + listing only).
 * Map/Go Get tiles in this environment watermark "API KEY REQUIRED", so those
 * stay as stills from the Play screenshot set.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workDir = join(root, 'facebook-promo-assets', '.work');
const framesDir = join(workDir, 'demo-frames');
const PORT = process.env.FACEBOOK_AD_PORT || '4180';
const ORIGIN = process.env.PLAY_SCREENSHOT_ORIGIN || `http://127.0.0.1:${PORT}`;
const START_LOCAL = !process.env.PLAY_SCREENSHOT_ORIGIN;
const FPS = 10;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startDemoServer() {
  const child = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    {
      cwd: root,
      env: { ...process.env, VITE_PLAY_STORE_DEMO: '1', BROWSER: 'none' },
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
    await wait(300);
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
      await wait(500);
      return;
    }
    await wait(300);
  }
  throw new Error(`Could not open mobile tab ${id}`);
}

async function captureSeconds(page, framesDir, startIndex, seconds) {
  const interval = 1000 / FPS;
  const count = Math.round(seconds * FPS);
  let idx = startIndex;
  for (let i = 0; i < count; i++) {
    const t0 = Date.now();
    await page.screenshot({
      path: join(framesDir, `${String(idx).padStart(5, '0')}.jpg`),
      type: 'jpeg',
      quality: 82,
      captureBeyondViewport: false,
    });
    idx += 1;
    const spent = Date.now() - t0;
    if (spent < interval) await wait(interval - spent);
  }
  return idx;
}

export async function recordFacebookAdDemo() {
  mkdirSync(workDir, { recursive: true });
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  let server = null;
  if (START_LOCAL) {
    console.log(`Starting demo Vite on ${ORIGIN} (VITE_PLAY_STORE_DEMO=1)`);
    server = startDemoServer();
    await server.ready;
    await wait(500);
  }

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: {
      width: 360,
      height: 640,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  });

  const page = await browser.newPage();
  const origin = new URL(ORIGIN).origin;
  await page.browserContext().overridePermissions(origin, ['geolocation']);
  await page.setGeolocation({ latitude: 38.5816, longitude: -121.4944 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
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
          reducedMotion: false,
        }),
      );
      document.documentElement.classList.add('light', 'newspaper-preview');
      document.documentElement.classList.remove('dark');
    } catch {
      /* ignore */
    }
  });
  page.setDefaultTimeout(45000);

  const dest = join(workDir, 'demo-capture.mp4');

  try {
    await page.goto(`${ORIGIN}/feed`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('#mobile_sticky_footer_nav', { timeout: 45000 });
    await wait(700);
    await dismissGates(page);
    await openTab(page, 'stuff');
    await page.waitForSelector('#item_feed_wrapper', { timeout: 20000 }).catch(() => null);
    await wait(600);

    let idx = 0;
    idx = await captureSeconds(page, framesDir, idx, 1.2);
    await page.mouse.move(180, 420);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel({ deltaY: 95 });
      await page.evaluate(() => {
        let el = document.getElementById('item_feed_wrapper');
        while (el) {
          const oy = getComputedStyle(el).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
            el.scrollTop += 70;
            return;
          }
          el = el.parentElement;
        }
        (document.scrollingElement || document.documentElement).scrollTop += 70;
      });
      idx = await captureSeconds(page, framesDir, idx, 0.2);
    }

    await page.evaluate(() => {
      const couch = document.querySelector('#item_card_demo-item-couch button');
      if (couch instanceof HTMLElement) {
        couch.click();
        return;
      }
      const cards = Array.from(document.querySelectorAll('[id^="item_card_"]'));
      const withPhoto = cards.find((card) => card.querySelector('img'));
      const btn = (withPhoto || cards[0])?.querySelector('button');
      if (btn instanceof HTMLElement) btn.click();
    });
    idx = await captureSeconds(page, framesDir, idx, 3.6);

    if (idx < 24) {
      throw new Error(`Demo capture too short (${idx} frames)`);
    }

    const packed = spawnSync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-framerate',
        String(FPS),
        '-i',
        join(framesDir, '%05d.jpg'),
        '-vf',
        'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '19',
        '-an',
        dest,
      ],
      { encoding: 'utf8' },
    );
    if (packed.status !== 0) {
      throw new Error(`Could not encode demo capture: ${packed.stderr || packed.stdout}`);
    }
    console.log(`recorded ${idx} frames → ${dest}`);
    return dest;
  } finally {
    if (server) {
      try {
        server.child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }
    await Promise.race([browser.close(), wait(1500)]);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  recordFacebookAdDemo()
    .then((path) => {
      console.log(path);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
