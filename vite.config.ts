import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {Connect, Plugin} from 'vite';
import {defineConfig} from 'vite';
import {createPushApp} from './server/app';

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

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pushApiPlugin()],
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
