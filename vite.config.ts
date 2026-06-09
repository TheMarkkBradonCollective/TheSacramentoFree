import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {Connect, Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';
import {createPushApp} from './server/app';

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
  let pushApp: ReturnType<typeof createPushApp> | null = null;

  const attach = (server: {middlewares: Connect.Server}) => {
    pushApp = pushApp || createPushApp();
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/api')) {
        next();
        return;
      }
      pushApp!(req, res, next);
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
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
