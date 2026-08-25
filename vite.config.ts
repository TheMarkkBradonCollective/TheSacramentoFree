import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import type {Connect, Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';
import {readAppVersion} from './scripts/read-app-version.mjs';

/** MBC App Market slug — must match main repo My-Projects.json / apk-catalog. */
const APK_SLUG = 'buynothing';
const APK_PACKAGE_ID = 'org.sacramentobuynothing.app';
const APK_DISPLAY_NAME = 'SacramentoBuyNothing';

/** Map common Vercel env names into Vite client build variables. */
function clientEnvDefines(mode: string): Record<string, string> {
  const env = loadEnv(mode, process.cwd(), '');
  const defines: Record<string, string> = {};

  const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_KEY ||
    env.SUPABASE_ANON_KEY;
  const vapidPublic = env.VITE_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
  const appUrl = env.VITE_APP_URL || env.APP_URL;

  if (supabaseUrl) defines['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify(supabaseUrl);
  if (supabaseKey) defines['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'] = JSON.stringify(supabaseKey);
  if (vapidPublic) defines['import.meta.env.VITE_VAPID_PUBLIC_KEY'] = JSON.stringify(vapidPublic);
  if (appUrl) defines['import.meta.env.VITE_APP_URL'] = JSON.stringify(appUrl);

  return defines;
}

function pushApiPlugin(): Plugin {
  // Lazy-load dev push API so `vite build` never imports Supabase/server code.
  let pushApp: ReturnType<typeof import('./server/app').createPushApp> | null = null;

  const attach = (server: {middlewares: Connect.Server}) => {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/api')) {
        next();
        return;
      }
      const handle = (app: NonNullable<typeof pushApp>) => {
        (app as Connect.NextHandleFunction)(req, res, next);
      };
      if (pushApp) {
        handle(pushApp);
        return;
      }
      import('./server/app')
        .then((mod) => {
          pushApp = mod.createPushApp();
          handle(pushApp);
        })
        .catch(next);
    });
  };

  return {
    name: 'push-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

/**
 * Build the MBC App Market `apk` block (Findr / StrainVerse pattern) when
 * public/buynothing.apk was copied into dist/.
 */
function buildApkManifest(distDir: string, appVersion: ReturnType<typeof readAppVersion>) {
  const apkPath = path.join(distDir, `${APK_SLUG}.apk`);
  if (!fs.existsSync(apkPath)) return undefined;

  const buf = fs.readFileSync(apkPath);
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const versionedUrl = `/${APK_SLUG}-v${appVersion.versionName}.apk`;
  const versionedPath = path.join(distDir, `${APK_SLUG}-v${appVersion.versionName}.apk`);
  if (!fs.existsSync(versionedPath)) {
    fs.copyFileSync(apkPath, versionedPath);
  }

  return {
    ready: true,
    packageId: APK_PACKAGE_ID,
    name: APK_DISPLAY_NAME,
    label: `${APK_DISPLAY_NAME} v${appVersion.versionName}`,
    version: appVersion.versionName,
    versionCode: appVersion.versionCode,
    url: `/${APK_SLUG}.apk`,
    downloadName: `${APK_SLUG}-v${appVersion.versionName}.apk`,
    versionedUrl,
    fileSize: buf.length,
    sha256,
    releaseNotes: `${APK_DISPLAY_NAME} v${appVersion.versionName} Android APK — Capacitor build with native FCM push for the MBC App Market.`,
    archives: [] as unknown[],
  };
}

/**
 * Injects a build timestamp into service-worker.js (and the legacy sw.js) so
 * the browser always detects a byte change on every deploy and triggers the
 * SW update chain automatically. Also writes /dist/version.json so the client
 * can poll for new deploys as a fallback (e.g. iOS Safari), and embeds the
 * MBC App Market apk block when a root-level APK is present.
 */
function swVersionPlugin(): Plugin {
  let appVersion = readAppVersion();
  let outDir = path.resolve(__dirname, 'dist');

  return {
    name: 'sw-version',
    apply: 'build',
    config() {
      appVersion = readAppVersion();
      return {
        define: {
          'import.meta.env.VITE_APP_BETA_VERSION_LABEL': JSON.stringify(appVersion.label),
        },
      };
    },
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const timestamp = String(Date.now());
      fs.mkdirSync(outDir, { recursive: true });
      appVersion = readAppVersion();

      for (const swFile of ['service-worker.js', 'sw.js']) {
        const swPath = path.join(outDir, swFile);
        if (fs.existsSync(swPath)) {
          const src = fs.readFileSync(swPath, 'utf-8');
          fs.writeFileSync(swPath, src.replaceAll('__BUILD_TIMESTAMP__', timestamp));
        }
      }

      const apk = buildApkManifest(outDir, appVersion);
      const payload: Record<string, unknown> = {
        v: timestamp,
        t: new Date().toISOString(),
        label: appVersion.label,
        channel: appVersion.channel,
        versionName: appVersion.versionName,
        versionCode: appVersion.versionCode,
        version: appVersion.versionName,
        name: APK_DISPLAY_NAME,
        updatedAt: new Date().toISOString(),
      };
      if (apk) payload.apk = apk;

      fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify(payload));
    },
  };
}

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss(), pushApiPlugin(), swVersionPlugin()],
    define: clientEnvDefines(mode),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.CURSOR_CLOUD_AGENT
        ? {
            protocol: 'wss',
            clientPort: 443,
          }
        : undefined,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Keep large, infrequently-changing third-party libraries in their own
      // long-cache-friendly vendor chunks, and force staff/moderation-only
      // views into a dedicated chunk so they never get merged with the
      // community map/chat/profile code that every signed-in user needs
      // (Rollup's default chunking otherwise groups modules by identical
      // dynamic-import reachability, which would bundle them together since
      // both are only reachable from the device shells).
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('/node_modules/leaflet/')) return 'vendor-leaflet';
            if (id.includes('/node_modules/motion/') || id.includes('/node_modules/framer-motion/')) return 'vendor-motion';
            if (id.includes('/node_modules/@supabase/')) return 'vendor-supabase';
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'vendor-react';
            if (id.includes('/src/components/staff/')) return 'staff-panels';
            return undefined;
          },
        },
      },
    },
  };
});
