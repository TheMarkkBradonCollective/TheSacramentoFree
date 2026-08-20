#!/usr/bin/env node
/**
 * End-to-end field test for Sacramento Buy Nothing.
 *
 * Exercises give / get (looking) / trade flows on web and Android APK,
 * capturing screenshots at every step.
 *
 * Usage:
 *   npm run field:test              # web + APK
 *   npm run field:test:web          # browser only
 *   npm run field:test:apk          # Android APK only (device/emulator required)
 *
 * Required env (account provisioning):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env:
 *   FIELD_TEST_ORIGIN               default: https://www.sacramentobuynothing.com
 *   FIELD_TEST_APK_PATH             default: dist/android/sac-buy-nothing-debug.apk
 *   FIELD_TEST_AVD + FIELD_TEST_START_EMULATOR=1
 *   FIELD_TEST_HEADED=1             show the browser window during web runs
 *   FIELD_TEST_SKIP_ACCOUNTS=1       reuse existing credentials only
 */
import { runSelectedModes } from './field-test/run.mjs';

const args = new Set(process.argv.slice(2));
const webOnly = args.has('--web');
const apkOnly = args.has('--apk');

if (webOnly && apkOnly) {
  console.error('Use only one of --web or --apk, not both.');
  process.exit(1);
}

const web = apkOnly ? false : true;
const apk = webOnly ? false : true;

runSelectedModes({ web, apk }).catch((error) => {
  console.error(error);
  process.exit(1);
});
