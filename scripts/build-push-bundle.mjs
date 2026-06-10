import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['api/push/_server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'push-server.bundle.cjs',
  logLevel: 'info',
});
