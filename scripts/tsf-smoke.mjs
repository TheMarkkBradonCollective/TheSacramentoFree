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

  // ── Sound engine: render each voice offline and measure the waveform ──
  const audio = await page.evaluate(async () => {
    const mod = await import('/src/preview/newspaperSound.ts');
    const names = [
      'key', 'keySpace', 'bell', 'pageTurn', 'press', 'stamp',
      'notify', 'notifyImportant', 'message', 'paperOpen', 'paperClose', 'ink',
    ];
    const out = {};
    for (const name of names) {
      const ctx = new OfflineAudioContext(1, 48000 * 2, 48000);
      mod.renderNewspaperSound(ctx, name, 0.01, ctx.destination);
      const buffer = await ctx.startRendering();
      const data = buffer.getChannelData(0);
      let peak = 0;
      let sumSquares = 0;
      let lastAudible = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
        sumSquares += data[i] * data[i];
        if (v > 0.001) lastAudible = i;
      }
      out[name] = {
        peak: +peak.toFixed(4),
        rms: +Math.sqrt(sumSquares / data.length).toFixed(5),
        ms: Math.round((lastAudible / 48000) * 1000),
      };
    }
    return out;
  });

  const silent = Object.entries(audio).filter(([, m]) => m.peak < 0.01);
  check('every sound renders audible output', silent.length === 0, silent.map(([n]) => n).join(', '));

  const clipping = Object.entries(audio).filter(([, m]) => m.peak > 1);
  check('no sound clips', clipping.length === 0, clipping.map(([n, m]) => `${n}=${m.peak}`).join(', '));

  const tooLong = Object.entries(audio).filter(([, m]) => m.ms > 1800);
  check('sounds stay short', tooLong.length === 0, tooLong.map(([n, m]) => `${n}=${m.ms}ms`).join(', '));
  console.log('      ' + Object.entries(audio).map(([n, m]) => `${n} ${m.ms}ms peak ${m.peak}`).join('\n      '));

  check('no uncaught page errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));

  // ── Reduced motion must hold the page still ──
  const calm = await browser.newPage();
  await calm.setViewport({ width: 1440, height: 900 });
  await calm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await calm.goto(`${BASE}/?skin=newspaper`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  check(
    'reduced motion disables immersive mode',
    await calm.evaluate(
      () =>
        document.documentElement.classList.contains('tsf-calm-motion') &&
        !document.documentElement.classList.contains('tsf-immersive'),
    ),
  );

  await calm.evaluate(() => {
    window.__tsfTurns = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1 && node.classList?.contains('tsf-page-turn')) window.__tsfTurns += 1;
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    [...document.querySelectorAll('a, button')].find((el) => /how it works/i.test(el.textContent || ''))?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  check(
    'reduced motion skips the page turn',
    (await calm.evaluate(() => window.__tsfTurns)) === 0,
  );

  // A reader who explicitly turns reduced motion off should get the paper back,
  // even though their device asks for stillness.
  await calm.evaluate(() => {
    const raw = localStorage.getItem('sbn_newspaper_experience_v1');
    const prefs = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      'sbn_newspaper_experience_v1',
      JSON.stringify({ ...prefs, reducedMotion: false, immersiveMode: true }),
    );
  });
  await calm.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  check(
    'explicit opt-in overrides the device motion setting',
    await calm.evaluate(() => document.documentElement.classList.contains('tsf-immersive')),
  );

  await calm.evaluate(() => {
    window.__tsfTurns = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1 && node.classList?.contains('tsf-page-turn')) window.__tsfTurns += 1;
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    [...document.querySelectorAll('a, button')].find((el) => /rules/i.test(el.textContent || ''))?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  check('opted-in reader sees the page turn', (await calm.evaluate(() => window.__tsfTurns)) > 0);

  const focusRule = await calm.evaluate(() => {
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (
          rule.selectorText?.includes('newspaper-preview') &&
          rule.selectorText.includes(':focus-visible') &&
          rule.style?.outline
        ) {
          return rule.style.outline;
        }
      }
    }
    return null;
  });
  check('focus states are printed as an outline', Boolean(focusRule), focusRule || 'none found');

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
