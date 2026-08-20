import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function createReport(config, platform) {
  const startedAt = Date.now();
  const steps = [];

  return {
    platform,
    runId: config.runId,
    origin: config.origin,
    startedAt: new Date(startedAt).toISOString(),
    steps,
    async record(step, fn) {
      const stepStarted = Date.now();
      try {
        const detail = await fn();
        steps.push({
          step,
          status: 'pass',
          durationMs: Date.now() - stepStarted,
          ...(detail ? { detail } : {}),
        });
        console.log(`  ✓ ${step}`);
        return detail;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        steps.push({
          step,
          status: 'fail',
          durationMs: Date.now() - stepStarted,
          error: message,
        });
        console.error(`  ✗ ${step}: ${message}`);
        throw error;
      }
    },
    skip(step, reason) {
      steps.push({ step, status: 'skip', reason });
      console.log(`  ○ ${step} (skipped: ${reason})`);
    },
    finish(outDir) {
      const finishedAt = Date.now();
      const summary = {
        platform,
        runId: config.runId,
        origin: config.origin,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        passed: steps.filter((s) => s.status === 'pass').length,
        failed: steps.filter((s) => s.status === 'fail').length,
        skipped: steps.filter((s) => s.status === 'skip').length,
        steps,
      };

      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(summary, null, 2)}\n`);

      console.log('');
      console.log(`${platform} field test: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`);
      console.log(`Report: ${join(outDir, 'report.json')}`);

      return summary;
    },
  };
}
