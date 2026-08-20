import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { loadConfig } from './lib/config.mjs';
import { provisionFieldTestAccounts } from './lib/accounts.mjs';
import { createReport } from './lib/report.mjs';
import { launchBrowser, preparePage, wait } from './lib/browser.mjs';
import {
  runNeighborConfirmSession,
  runNeighborSession,
  runPosterConfirmSession,
  runPosterSession,
  runSequentialApkFlow,
} from './lib/flows.mjs';

function resolveAndroidHome(config) {
  const candidates = [
    config.androidHome,
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    `${process.env.HOME}/Android/Sdk`,
    '/opt/android-sdk',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'platform-tools', 'adb'))) {
      return candidate;
    }
  }

  throw new Error(
    'Android SDK not found. Set ANDROID_HOME or run scripts/setup-android-sdk.sh before field:test:apk.',
  );
}

function adb(config, args, options = {}) {
  const adbPath = join(resolveAndroidHome(config), 'platform-tools', 'adb');
  const result = spawnSync(adbPath, args, {
    encoding: 'utf8',
    ...options,
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`adb ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

async function ensureDevice(config) {
  if (config.startEmulator && config.avdName) {
    console.log(`Starting emulator ${config.avdName}…`);
    const androidHome = resolveAndroidHome(config);
    const emulatorPath = join(androidHome, 'emulator', 'emulator');
    spawnSync(emulatorPath, ['-avd', config.avdName, '-no-audio', '-no-boot-anim'], {
      detached: true,
      stdio: 'ignore',
    }).unref();

    execSync(`${join(androidHome, 'platform-tools', 'adb')} wait-for-device`, { stdio: 'inherit' });
  }

  for (let i = 0; i < 60; i++) {
    const boot = adb(config, ['shell', 'getprop', 'sys.boot_completed'], { allowFailure: true });
    if ((boot.stdout || '').trim() === '1') break;
    await wait(2000);
  }

  const devices = adb(config, ['devices']).stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split('\t')[0])
    .filter(Boolean);

  if (devices.length === 0) {
    throw new Error('No Android device/emulator connected. Plug in a device or start an AVD.');
  }

  return devices[0];
}

function installApk(config, deviceId) {
  if (!existsSync(config.apkPath)) {
    throw new Error(
      `APK not found at ${config.apkPath}. Build one first with npm run android:apk:debug`,
    );
  }

  adb(config, ['-s', deviceId, 'install', '-r', '-g', config.apkPath]);
}

function launchApp(config, deviceId) {
  adb(config, [
    '-s',
    deviceId,
    'shell',
    'am',
    'start',
    '-n',
    config.mainActivity,
    '-a',
    'android.intent.action.MAIN',
    '-c',
    'android.intent.category.LAUNCHER',
  ]);
}

function grantRuntimePermissions(config, deviceId) {
  for (const permission of [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.POST_NOTIFICATIONS',
  ]) {
    adb(config, ['-s', deviceId, 'shell', 'pm', 'grant', config.packageName, permission], {
      allowFailure: true,
    });
  }
}

function adbScreenshot(config, deviceId, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const raw = spawnSync(
    join(resolveAndroidHome(config), 'platform-tools', 'adb'),
    ['-s', deviceId, 'exec-out', 'screencap', '-p'],
    { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 },
  );
  if (raw.status !== 0) {
    throw new Error(`adb screencap failed: ${raw.stderr?.toString() || 'unknown error'}`);
  }
  writeFileSync(dest, raw.stdout);
  console.log(`    adb screenshot: ${dest}`);
}

async function connectAndroidWebView(config) {
  const adbPath = join(resolveAndroidHome(config), 'platform-tools', 'adb');
  spawnSync(adbPath, ['forward', 'tcp:9222', 'localabstract:chrome_devtools_remote'], {
    encoding: 'utf8',
  });

  await wait(1500);

  const response = await fetch('http://127.0.0.1:9222/json/list');
  if (!response.ok) {
    throw new Error(
      'Could not list Android WebView targets. Use a debug APK (npm run android:apk:debug) so WebView debugging is enabled.',
    );
  }

  const targets = await response.json();
  const pageTarget =
    targets.find((target) => target.type === 'page' && !target.url.startsWith('chrome://')) ||
    targets.find((target) => target.type === 'page');

  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error('No debuggable WebView page found. Open the app and retry.');
  }

  return puppeteer.connect({
    browserWSEndpoint: pageTarget.webSocketDebuggerUrl,
    defaultViewport: null,
  });
}

export async function runWebFieldTest(config, accounts) {
  const report = createReport(config, 'web');
  mkdirSync(config.webOutDir, { recursive: true });

  const browser = await report.record('web-launch-browser', async () => launchBrowser(config));

  try {
    const posterContext = await browser.createBrowserContext();
    const neighborContext = await browser.createBrowserContext();
    const posterPage = await posterContext.newPage();
    const neighborPage = await neighborContext.newPage();

    await preparePage(posterPage, config);
    await preparePage(neighborPage, config);

    const posterCtx = {
      page: posterPage,
      config,
      outDir: config.webOutDir,
      platform: 'web',
      poster: accounts.poster,
      neighbor: accounts.neighbor,
      runId: config.runId,
      report,
    };

    const neighborCtx = {
      page: neighborPage,
      config,
      outDir: config.webOutDir,
      platform: 'web',
      poster: accounts.poster,
      neighbor: accounts.neighbor,
      runId: config.runId,
      report,
    };

    const posterTitles = await runPosterSession(posterCtx);
    const neighborTitles = await runNeighborSession(neighborCtx, posterTitles);
    await runPosterConfirmSession(posterCtx, { ...posterTitles, ...neighborTitles });
    await runNeighborConfirmSession(neighborCtx, neighborTitles);

    report.skip('web-go-get', 'Go Get coordination is Android-native only.');
  } finally {
    await browser.close().catch(() => null);
  }

  return report.finish(config.webOutDir);
}

export async function runApkFieldTest(config, accounts) {
  const report = createReport(config, 'apk');
  mkdirSync(config.apkOutDir, { recursive: true });

  let browser;
  let deviceId;

  try {
    deviceId = await report.record('apk-device-ready', async () => ensureDevice(config));

    await report.record('apk-install', async () => {
      installApk(config, deviceId);
    });

    await report.record('apk-launch', async () => {
      grantRuntimePermissions(config, deviceId);
      launchApp(config, deviceId);
      await wait(4000);
      adbScreenshot(config, deviceId, join(config.apkOutDir, '00-app-launched-device.png'));
    });

    browser = await report.record('apk-webview-connect', async () => connectAndroidWebView(config));

    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());
    await preparePage(page, config);

    const ctx = {
      page,
      config,
      outDir: config.apkOutDir,
      platform: 'apk',
      poster: accounts.poster,
      neighbor: accounts.neighbor,
      runId: config.runId,
      report,
      adbScreenshot: (name) => adbScreenshot(config, deviceId, join(config.apkOutDir, name)),
    };

    await runSequentialApkFlow(ctx);
    report.skip('apk-go-get-native', 'Go Get turn-by-turn navigation requires live GPS and two coordinated native sessions.');
  } finally {
    if (browser) {
      await browser.disconnect().catch(() => null);
    }
  }

  return report.finish(config.apkOutDir);
}

export async function runSelectedModes({ web = true, apk = true } = {}) {
  const config = loadConfig();
  mkdirSync(config.outRoot, { recursive: true });

  let accounts;
  if (!config.skipAccountProvision) {
    accounts = await provisionFieldTestAccounts(config);
    console.log(`Field test accounts ready (poster: ${accounts.poster.email}, neighbor: ${accounts.neighbor.email})`);
  } else {
    accounts = {
      poster: {
        email: config.posterEmail,
        password: config.posterPassword,
        name: config.posterName,
        neighborhood: config.neighborhood,
      },
      neighbor: {
        email: config.neighborEmail,
        password: config.neighborPassword,
        name: config.neighborName,
        neighborhood: config.neighborhood,
      },
    };
  }

  const summaries = [];

  if (web) {
    console.log('\n=== Web field test ===');
    summaries.push(await runWebFieldTest(config, accounts));
  }

  if (apk) {
    console.log('\n=== APK field test ===');
    summaries.push(await runApkFieldTest(config, accounts));
  }

  const failed = summaries.some((summary) => summary.failed > 0);
  if (failed) {
    process.exitCode = 1;
  }

  return summaries;
}
