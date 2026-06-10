import * as esbuild from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('scripts', { recursive: true });

await esbuild.build({
  entryPoints: ['api/push/_server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'push-server.bundle.mjs',
  logLevel: 'info',
});
