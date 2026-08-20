import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

export async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dismissGates(page) {
  for (let i = 0; i < 8; i++) {
    const handled = await page.evaluate(() => {
      const dismiss = document.querySelector('[aria-label="Dismiss"]');
      if (dismiss instanceof HTMLElement) {
        dismiss.click();
        return true;
      }

      const labeled = Array.from(document.querySelectorAll('button')).find((node) =>
        /^(maybe later|not now|skip|accept & continue|got it|ok)$/i.test((node.textContent || '').trim()),
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

export async function dismissLocationBanner(page) {
  await page.evaluate(() => {
    const banner = Array.from(document.querySelectorAll('div, p')).find((node) =>
      /location permission denied/i.test(node.textContent || ''),
    );
    if (!banner) return;
    const close = banner.closest('div')?.querySelector('button');
    close?.click();
  });
}

export function flattenPng(src, dest) {
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-pix_fmt', 'rgb24', dest],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${src}: ${result.stderr || result.stdout}`);
  }
}

export async function screenshot(page, outDir, name, platform = 'web') {
  mkdirSync(outDir, { recursive: true });
  const rawDir = join(outDir, '.raw');
  mkdirSync(rawDir, { recursive: true });

  await dismissGates(page);
  await dismissLocationBanner(page);
  await wait(400);

  const raw = join(rawDir, `${name}.png`);
  const dest = join(outDir, `${name}.png`);
  await page.screenshot({ path: raw, type: 'png', captureBeyondViewport: false });
  flattenPng(raw, dest);
  console.log(`    screenshot [${platform}]: ${dest}`);
  return dest;
}

export async function launchBrowser(config) {
  return puppeteer.launch({
    executablePath: config.chromePath,
    headless: process.env.FIELD_TEST_HEADED === '1' ? false : 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1080,1920',
    ],
    defaultViewport: {
      width: config.viewport.width,
      height: config.viewport.height,
      deviceScaleFactor: config.viewport.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    },
  });
}

export async function preparePage(page, config) {
  const origin = new URL(config.origin).origin;
  const context = page.browserContext();
  await context.overridePermissions(origin, ['geolocation']);
  await page.setGeolocation(config.geolocation);
  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  );
  page.setDefaultTimeout(45000);
}

export async function gotoApp(page, config, hash = '#/') {
  await page.goto(`${config.origin}/${hash.replace(/^\/?/, '#/')}`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await wait(1000);
  await dismissGates(page);
}

export async function signIn(page, config, account, outDir, platform) {
  await gotoApp(page, config, '#/login');
  await screenshot(page, outDir, '01-login', platform);

  await page.waitForSelector('#auth-signin-email');
  await page.click('#auth-signin-email', { clickCount: 3 });
  await page.type('#auth-signin-email', account.email, { delay: 15 });
  await page.click('#auth-signin-password', { clickCount: 3 });
  await page.type('#auth-signin-password', account.password, { delay: 15 });
  await page.click('button[type="submit"]');

  await page.waitForSelector('#mobile_sticky_footer_nav, [role="dialog"], #onboarding_viewport', {
    timeout: 45000,
  });
  await wait(1200);
  await dismissGates(page);

  if (await page.$('#onboarding_viewport')) {
    await completeOnboarding(page, account);
    await screenshot(page, outDir, '02-onboarding-complete', platform);
  }

  await page.waitForSelector('#mobile_sticky_footer_nav', { timeout: 45000 });
  await wait(800);
  await dismissGates(page);
  await screenshot(page, outDir, '02-signed-in-feed', platform);
}

export async function completeOnboarding(page, account) {
  await page.waitForSelector('#onboarding_form');
  await page.click('#on_display_name', { clickCount: 3 });
  await page.type('#on_display_name', account.name, { delay: 10 });
  await page.select('#on_neighborhood', account.neighborhood);
  await page.click('#on_bio', { clickCount: 3 });
  await page.type('#on_bio', 'Automated field test account.', { delay: 8 });
  await page.click('#onboarding_submit_btn');
  await wait(1500);
}

export async function signOut(page) {
  await openTab(page, 'profile');
  await wait(600);

  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const signOut = buttons.find((node) => /sign out/i.test(node.textContent || ''));
    if (signOut instanceof HTMLElement) {
      signOut.click();
      return true;
    }
    return false;
  });

  if (!clicked) {
    throw new Error('Could not find Sign out button on Account tab.');
  }

  await wait(1500);
  await page.waitForSelector('#auth-signin-email, [href*="login"]', { timeout: 20000 }).catch(() => null);
}

export async function openTab(page, id) {
  const selector = `#mobile_nav_${id}`;
  await page.waitForSelector(selector, { timeout: 20000 });

  for (let attempt = 0; attempt < 6; attempt++) {
    await dismissGates(page);
    await page.click(selector);
    const active = await page
      .waitForSelector(`${selector}[aria-current="page"]`, { timeout: 1500 })
      .then(() => true)
      .catch(() => false);
    if (active) {
      await wait(700);
      return;
    }
    await wait(400);
  }

  throw new Error(`Could not open mobile tab "${id}".`);
}

export async function clickConfirmDialog(page, confirmLabel) {
  await page.waitForSelector('#confirm_dialog_message', { timeout: 10000 });
  const clicked = await page.evaluate((label) => {
    const dialog = document.querySelector('#confirm_dialog_message')?.closest('[role="dialog"]');
    if (!dialog) return false;
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const match =
      buttons.find((node) => (node.textContent || '').trim() === label) ||
      buttons.find((node) => /confirm|picked up|dropped off|mark traded|ok/i.test((node.textContent || '').trim()));
    if (match instanceof HTMLElement) {
      match.click();
      return true;
    }
    return false;
  }, confirmLabel);

  if (!clicked) {
    throw new Error(`Could not click confirm dialog button "${confirmLabel}".`);
  }

  await wait(800);
}

export async function clickButtonByText(page, pattern, options = {}) {
  const { scope = 'document', timeout = 15000 } = options;
  await page.waitForFunction(
    (textPattern, rootSelector) => {
      const root = rootSelector === 'document' ? document : document.querySelector(rootSelector);
      if (!root) return false;
      const regex = new RegExp(textPattern, 'i');
      return Array.from(root.querySelectorAll('button, [role="button"]')).some((node) =>
        regex.test((node.textContent || '').trim()),
      );
    },
    { timeout },
    pattern,
    scope,
  );

  const clicked = await page.evaluate(
    (textPattern, rootSelector) => {
      const root = rootSelector === 'document' ? document : document.querySelector(rootSelector);
      if (!root) return false;
      const regex = new RegExp(textPattern, 'i');
      const match = Array.from(root.querySelectorAll('button, [role="button"]')).find((node) =>
        regex.test((node.textContent || '').trim()),
      );
      if (match instanceof HTMLElement) {
        match.click();
        return true;
      }
      return false;
    },
    pattern,
    scope,
  );

  if (!clicked) {
    throw new Error(`Could not click button matching /${pattern}/i.`);
  }

  await wait(600);
}

export async function openListingByTitle(page, title) {
  const opened = await page.evaluate((listingTitle) => {
    const cards = Array.from(document.querySelectorAll('[id^="item_card_"]'));
    const card = cards.find((node) => (node.textContent || '').includes(listingTitle));
    const button = card?.querySelector('button');
    if (button instanceof HTMLElement) {
      button.click();
      return true;
    }
    return false;
  }, title);

  if (!opened) {
    throw new Error(`Could not find listing card for "${title}".`);
  }

  await page.waitForSelector('#item_detail_fullscreen', { timeout: 15000 });
  await wait(800);
}

export async function closeListingDetail(page) {
  await page.evaluate(() => {
    const back = document.querySelector('#item_detail_fullscreen [aria-label="Back"]');
    if (back instanceof HTMLElement) back.click();
  });
  await wait(600);
}

export async function openNewPostModal(page) {
  await openTab(page, 'feed');
  await page.waitForSelector('[aria-label="New post"]', { timeout: 15000 });
  await page.click('[aria-label="New post"]');
  await page.waitForSelector('#post_modal_box', { timeout: 15000 });
  await wait(400);
}

export async function setGpsPin(page) {
  const gpsButton = await page.$('#post_location_coordinates_section button[title="Detect current location via GPS"]');
  if (gpsButton) {
    await gpsButton.click();
    await wait(2000);
  }
}

export async function postListing(page, { type, title, details, tradeSeeking, category, isoCategory }) {
  await openNewPostModal(page);

  const typeButtonId =
    type === 'giveaway' ? '#type_giveaway_btn' : type === 'looking' ? '#type_looking_btn' : '#type_trade_btn';
  await page.click(typeButtonId);
  await wait(300);

  if (category) {
    await page.select('#post_category', category);
  }
  if (isoCategory) {
    await page.select('#post_iso_category', isoCategory);
  }

  await page.click('#post_title', { clickCount: 3 });
  await page.type('#post_title', title, { delay: 12 });
  await page.click('#post_details', { clickCount: 3 });
  await page.type('#post_details', details, { delay: 10 });

  if (tradeSeeking) {
    await page.click('#post_trade_seeking', { clickCount: 3 });
    await page.type('#post_trade_seeking', tradeSeeking, { delay: 10 });
  }

  if (type !== 'looking') {
    await setGpsPin(page);
  }

  await page.click('#submit_listing_btn');
  await page.waitForFunction(
    () => !document.querySelector('#post_modal_box'),
    { timeout: 45000 },
  );
  await wait(1500);
}

export async function messageListingPoster(page) {
  await clickButtonByText(page, '^Message$');
  await openTab(page, 'chats');
  await page.waitForSelector('#chat_panel_header, #chat_app_viewport', { timeout: 20000 });
  await wait(1000);
}

export async function openChatForListing(page, listingTitle) {
  await openTab(page, 'chats');
  await page.waitForSelector('#chat_inbox_list', { timeout: 20000 });
  await wait(800);

  const opened = await page.evaluate((title) => {
    const rows = Array.from(document.querySelectorAll('[id^="chat_row_"]'));
    const match = rows.find((row) => (row.textContent || '').includes(title));
    if (match instanceof HTMLElement) {
      match.click();
      return true;
    }
    if (rows[0] instanceof HTMLElement) {
      rows[0].click();
      return true;
    }
    return false;
  }, listingTitle);

  if (!opened) {
    throw new Error(`Could not open chat for listing "${listingTitle}".`);
  }

  await page.waitForSelector('#chat_panel_header', { timeout: 15000 });
  await wait(800);
}

export async function submitClaimHandoff(page, kind = 'pickup') {
  const label = kind === 'dropoff' ? 'I dropped off' : 'I picked up';
  await clickButtonByText(page, label);
  await clickConfirmDialog(page, kind === 'dropoff' ? 'I dropped off' : 'I picked up');
  await wait(1200);
}

export async function confirmPendingClaim(page, kind = 'pickup') {
  const label = kind === 'dropoff' ? 'Confirm drop-off' : 'Confirm pickup';
  await clickButtonByText(page, label);
  await clickConfirmDialog(page, label);
  await wait(1200);
}

export async function markTradeCompleted(page) {
  await page.waitForSelector('#chat_mark_traded_btn', { timeout: 15000 });
  await page.click('#chat_mark_traded_btn');
  await clickConfirmDialog(page, 'Mark traded');
  await wait(1200);
}

export async function browseAppShell(page, outDir, platform) {
  await openTab(page, 'feed');
  await page.waitForSelector('#item_feed_wrapper', { timeout: 20000 }).catch(() => null);
  await screenshot(page, outDir, '10-tab-feed', platform);

  await openTab(page, 'events');
  await wait(1000);
  await screenshot(page, outDir, '11-tab-events', platform);

  await openTab(page, 'map');
  await wait(2000);
  await screenshot(page, outDir, '12-tab-map', platform);

  await openTab(page, 'chats');
  await wait(1000);
  await screenshot(page, outDir, '13-tab-messages', platform);

  await openTab(page, 'profile');
  await wait(1000);
  await screenshot(page, outDir, '14-tab-account', platform);
}
