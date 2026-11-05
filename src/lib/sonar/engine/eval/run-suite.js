/**
 * Run the Sonar benchmark suite against live data (Section 13). SERVER ONLY;
 * needs the deployment's env (Supabase service role, model and market keys).
 *
 *   engine 'v3'        runResearch() at a depth, optionally with a config
 *   engine 'baseline'  the current landing pipeline (runLandingPipeline)
 *
 * Returns per-benchmark scores plus the summary; with `write`, persists every
 * score to sonar_research_evaluations under one suite id.
 */
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { runLandingPipeline } from '@/lib/sonar/landing-pipeline';
import { runResearch } from '../engine';
import { BENCHMARKS, BENCHMARK_VERSION } from './benchmarks';
import { scoreRun, baselineToRun, summarize } from './score';

export async function runSuite({
  engine = 'v3',
  depth = 'standard',
  config = null,
  only = null,
  write = false,
  log = console.log,
} = {}) {
  const admin = getAdminClient();
  const suite = `${engine}:${config?.version || 'active'}:${new Date().toISOString()}`;
  const list = BENCHMARKS.filter((b) => !only || only.includes(b.id));
  const perBenchmark = [];
  for (const b of list) {
    const t0 = Date.now();
    let run;
    try {
      if (engine === 'baseline') {
        const r = await runLandingPipeline(b.query, { admin });
        run = baselineToRun(r, { durationMs: Date.now() - t0 });
      } else {
        run = await runResearch(b.query, {
          admin,
          runId: crypto.randomUUID(),
          /* A benchmark that names its own depth (the deep research
             flagship) runs at it. */
          depth: b.depth || depth,
          config: config || undefined,
        });
      }
    } catch (e) {
      run = {
        researchScope: {},
        researchMetadata: { durationMs: Date.now() - t0, partial: true },
        failed: e?.message || 'threw',
      };
    }
    const s = scoreRun(run, b);
    perBenchmark.push({ ...s, runId: run.runId || null });
    log(`${b.id.padEnd(24)} composite=${s.composite} latency=${s.metrics.latencyMs}ms`);
    if (write) {
      await admin.from('sonar_research_evaluations').insert({
        suite_run: suite,
        benchmark_version: BENCHMARK_VERSION,
        engine,
        config_version: config?.version || null,
        benchmark_id: b.id,
        run_id: null,
        composite: s.composite,
        metrics: s.metrics,
      });
    }
  }
  return {
    suite,
    engine,
    configVersion: config?.version || null,
    perBenchmark,
    summary: summarize(perBenchmark),
  };
}
