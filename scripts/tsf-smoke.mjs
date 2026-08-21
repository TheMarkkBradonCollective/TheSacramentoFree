/**
 * Headless smoke check for The Sacramento Free newspaper skin.
 *
 * Verifies the things a screenshot cannot reliably catch: that the page-turn
 * layer actually mounts on navigation, that the palette really is grayscale,
 * and that the original skin is untouched.
 *
 *   node scripts/tsf-smoke.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] || 'http://localhost:3000';
const CHROME = '/usr/bin/google-chrome-stable';

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Pull every computed colour on the page and flag any that carry real chroma. */
const COLLECT_COLOURS = `(() => {
  const offenders = new Set();
  const parse = (value) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(value || '');
    if (!m) return null;
    const [r, g, b, a] = m[1].split(',').map((n) => parseFloat(n));
    if (a === 0) return null;
    return [r, g, b];
  };
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'fill', 'stroke']) {
      const rgb = parse(cs[prop]);
      if (!rgb) continue;
      const [r, g, b] = rgb;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (spread <= 12) continue;
      // A desaturated proof-mark red is allowed for danger states.
      const reddish = r > g && r > b && spread < 90;
      if (reddish) continue;
      offenders.add(el.tagName.toLowerCase() + '.' + (el.className && el.className.baseVal === undefined ? String(el.className).split(' ').slice(0, 2).join('.') : '') + ' {' + prop + ': ' + cs[prop] + '}');
    }
  }
  return [...offenders].slice(0, 25);
})()`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-prefers-reduced-motion=0'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  // Headless Chrome reports reduced-motion by default; emulate a normal reader
  // so the motion path is exercised rather than the accessibility fallback.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  // ── Newspaper skin ──
  await page.goto(`${BASE}/?skin=newspaper`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  check(
    'newspaper-preview class applied',
    await page.evaluate(() => document.documentElement.classList.contains('newspaper-preview')),
  );

  const motion = await page.evaluate(() => ({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    immersive: document.documentElement.classList.contains('tsf-immersive'),
    calm: document.documentElement.classList.contains('tsf-calm-motion'),
  }));
  check('immersive mode active on desktop', motion.immersive, JSON.stringify(motion));

  check('masthead rendered', (await page.$$('.tsf-masthead')).length > 0);
  check(
    'masthead wordmark reads correctly',
    (await page.$eval('.tsf-masthead__name', (el) => el.textContent.trim())) === 'Sacramento Free',
  );

  const mastheadSize = await page.$eval('.tsf-masthead__name', (el) => parseFloat(getComputedStyle(el).fontSize));
  check('masthead is dramatic (>= 56px on desktop)', mastheadSize >= 56, `${mastheadSize}px`);

  const fonts = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      body: getComputedStyle(document.body).fontFamily,
      masthead: root.getPropertyValue('--font-masthead').trim(),
      typewriter: root.getPropertyValue('--font-typewriter').trim(),
    };
  });
  check('serif body type', /Libre Baskerville|Source Serif/.test(fonts.body), fonts.body.slice(0, 48));
  check('typewriter face registered', /Courier Prime/.test(fonts.typewriter), fonts.typewriter.slice(0, 48));

  const offenders = await page.evaluate(COLLECT_COLOURS);
  check('palette is grayscale', offenders.length === 0, offenders.join(' | ').slice(0, 400));

  // ── Page turn on navigation ──
  await page.evaluate(() => {
    window.__tsfTurns = 0;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1 && node.classList?.contains('tsf-page-turn')) window.__tsfTurns += 1;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a, button')].find((el) =>
      /how it works/i.test(el.textContent || ''),
    );
    link?.click();
  });
  await new Promise((r) => setTimeout(r, 900));

  const turns = await page.evaluate(() => window.__tsfTurns);
  check('page-turn layer mounts on navigation', turns > 0, `${turns} turn(s)`);

  check('no uncaught page errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));

  // ── Original skin must be untouched ──
  const original = await browser.newPage();
  await original.setViewport({ width: 1440, height: 900 });
  await original.goto(`${BASE}/?skin=original`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  check(
    'original skin has no newspaper class',
    !(await original.evaluate(() => document.documentElement.classList.contains('newspaper-preview'))),
  );

  const accent = await original.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
  );
  check('original accent still brand orange', accent.toLowerCase() === '#ff4500', accent);

  const emerald = await original.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-emerald-500').trim(),
  );
  check('original Tailwind palette untouched', /0\.1[0-9]/.test(emerald), emerald);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
