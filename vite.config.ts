import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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

  if (supabaseUrl) defines['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify(supabaseUrl);
  if (supabaseKey) defines['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'] = JSON.stringify(supabaseKey);
  if (vapidPublic) defines['import.meta.env.VITE_VAPID_PUBLIC_KEY'] = JSON.stringify(vapidPublic);

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

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss(), pushApiPlugin()],
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
