import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import type {Connect, Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';

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
 * Injects a build timestamp into service-worker.js (and the legacy sw.js) so
 * the browser always detects a byte change on every deploy and triggers the
 * SW update chain automatically. Also writes /dist/version.json so the client
 * can poll for new deploys as a fallback (e.g. iOS Safari).
 */
function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const timestamp = String(Date.now());
      const distDir = path.resolve(__dirname, 'dist');

      for (const swFile of ['service-worker.js', 'sw.js']) {
        const swPath = path.join(distDir, swFile);
        if (fs.existsSync(swPath)) {
          const src = fs.readFileSync(swPath, 'utf-8');
          fs.writeFileSync(swPath, src.replaceAll('__BUILD_TIMESTAMP__', timestamp));
        }
      }

      fs.writeFileSync(
        path.join(distDir, 'version.json'),
        JSON.stringify({ v: timestamp, t: new Date().toISOString() }),
      );
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
  };
});
