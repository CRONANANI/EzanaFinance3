/**
 * Sonar analyst quality: capture frozen evidence fixtures from production (Phase 4.2).
 * OFFLINE ONLY. Not in CI. Reads production through the engine's own sources.
 *
 * Usage (from the repo root, with production credentials in the environment):
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs scripts/sonar-analyst-snapshot.mjs \
 *     [--benchmarks]              the four regression benchmarks (default when nothing else is given)
 *     [--cases id1,id2]           evaluation case ids (sonar-skills/<skill>/tests/evaluation-cases.json)
 *     [--mode quick|standard|deep] override every case's mode
 *     [--org <org uuid>]          required for first-person fund questions; see TENANT DATA below
 *     [--force]                   overwrite an existing snapshot
 *     [--out eval/sonar/snapshots]
 *
 * What it does, per case:
 *   1. understandQuery -> scoreDomains -> resolveResearch against production (the same calls
 *      runResearch makes), and the active retrieval config (loadActiveConfig).
 *   2. runResearch with `evidenceOverride` = { resolution, runners: <recording wrappers around
 *      the engine's RUNNERS>, memory: [] }, so every planned evidence task runs through the
 *      real source code and its raw output ({ items, layout }) is recorded with its params.
 *   3. Aborts the run (AbortSignal) on the engine's `evidence` event: retrieval is complete,
 *      so no specialist, synthesis or red-team model call is made and nothing is billed.
 *   4. Writes eval/sonar/snapshots/<case-id>.json: question, mode, capturedAt (the replay
 *      clock), engine version, understanding, resolution, config, the plan event, and every
 *      runner call ({ source, params, paramsKey, ms, ok, error, output }).
 *
 * The replay (scripts/sonar-analyst-quality.mjs) serves those outputs in place of live
 * retrieval with `now = capturedAt`, so scores do not move with the data. Re-capture a case
 * when its plan changes on purpose (the quality report lists replay misses).
 *
 * Requires the engine hook `opts.evidenceOverride` in runResearch (see the header of
 * sonar-analyst-quality.mjs). Without it the script stops with an explanation instead of
 * writing an empty snapshot.
 *
 * SONAR_EVAL_ENGINE_MODULE=<path> swaps the engine module (testing the harness only).
 *
 * TENANT DATA: a first-person fund question ("our fund ...") only runs with --org, and its
 * snapshot is marked `tenant: true` because it contains that organization's positions.
 * Never commit a tenant snapshot; keep it local.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ROOT, loadEvalCases, isOrgQuestion } from './lib/sonar-eval-cases.mjs';
import {
  BENCHMARK_CASES,
  SNAPSHOT_VERSION,
  plain,
  recordingRunners,
} from './lib/sonar-quality.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const OUT_DIR = path.resolve(ROOT, opt('--out') || 'eval/sonar/snapshots');
const MODE = opt('--mode');
const ORG = opt('--org');
const FORCE = args.includes('--force');

function selectCases() {
  const ids = (opt('--cases') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  if (args.includes('--benchmarks') || !ids.length) out.push(...BENCHMARK_CASES);
  if (ids.length) {
    const all = loadEvalCases();
    for (const id of ids) {
      const c = all.find((x) => x.id === id) || BENCHMARK_CASES.find((x) => x.id === id);
      if (!c) throw new Error(`unknown case id ${id}`);
      if (!out.includes(c)) out.push(c);
    }
  }
  return out.map((c) => ({ ...c, mode: MODE || c.mode }));
}

async function main() {
  const [
    { getAdminClient, isServerSupabaseConfigured },
    engine,
    sources,
    understand,
    spec,
    resolution,
    configStore,
  ] = await Promise.all([
    import('@/lib/supabase'),
    process.env.SONAR_EVAL_ENGINE_MODULE
      ? import(pathToFileURL(path.resolve(process.env.SONAR_EVAL_ENGINE_MODULE)).href)
      : import('@/lib/sonar/engine/engine'),
    import('@/lib/sonar/engine/sources'),
    import('@/lib/sonar/understand'),
    import('@/lib/sonar/engine/research-spec'),
    import('@/lib/sonar/engine/resolution'),
    import('@/lib/sonar/engine/config-store'),
  ]);
  if (!isServerSupabaseConfigured()) {
    console.error(
      'sonar-analyst-snapshot: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (production, read only use).',
    );
    process.exit(1);
  }
  const admin = getAdminClient();
  mkdirSync(OUT_DIR, { recursive: true });
  const cases = selectCases();
  let failures = 0;
  for (const c of cases) {
    const file = path.join(OUT_DIR, `${c.id}.json`);
    if (existsSync(file) && !FORCE) {
      console.log(`skip ${c.id}: snapshot exists (use --force to re-capture)`);
      continue;
    }
    const tenant = isOrgQuestion(c.question);
    if (tenant && !ORG) {
      console.log(
        `skip ${c.id}: first-person fund question; pass --org <uuid> (tenant snapshot, do not commit)`,
      );
      continue;
    }
    const now = new Date();
    const q = c.question;
    try {
      // eslint-disable-next-line no-await-in-loop
      const understood = await understand.understandQuery(q, {});
      const domains = spec.scoreDomains(q, understood);
      // eslint-disable-next-line no-await-in-loop
      const resolved = await resolution
        .resolveResearch(understood, { query: q, admin, ms: 5000, domains })
        .catch(() => ({
          subject: null,
          countries: [],
          universe: null,
          notes: ['resolution_failed'],
        }));
      // eslint-disable-next-line no-await-in-loop
      const config = await configStore.loadActiveConfig(admin).catch(() => null);
      const calls = [];
      const controller = new AbortController();
      let planEvent = null;
      const scope = { userId: null, orgId: tenant ? ORG : null };
      const t0 = Date.now();
      // eslint-disable-next-line no-await-in-loop
      await engine.runResearch(q, {
        admin,
        runId: crypto.randomUUID(),
        depth: c.mode,
        now,
        config: config || undefined,
        scope,
        signal: controller.signal,
        emit: (type, data) => {
          if (type === 'plan') planEvent = plain(data);
          /* Retrieval is done: stop before any model call. */
          if (type === 'evidence') controller.abort();
        },
        evidenceOverride: {
          resolution: resolved,
          runners: recordingRunners(sources.RUNNERS, calls),
          memory: [],
        },
      });
      const planned = planEvent?.plan?.tasks?.length || 0;
      if (planned && !calls.length) {
        throw new Error(
          'runResearch ignored evidenceOverride (no runner call was recorded). Add the hook described in sonar-analyst-quality.mjs first.',
        );
      }
      const snapshot = {
        version: SNAPSHOT_VERSION,
        caseId: c.id,
        question: q,
        mode: c.mode,
        capturedAt: now.toISOString(),
        engine: engine.ENGINE_VERSION,
        tenant,
        scope,
        understood: plain({
          raw: understood.raw,
          corrected: understood.corrected,
          intent: understood.intent,
          entities: understood.entities,
        }),
        resolution: plain(resolved),
        config: plain(config),
        plan: planEvent,
        retrievalMs: Date.now() - t0,
        calls,
      };
      writeFileSync(file, `${JSON.stringify(snapshot, null, 1)}\n`);
      const items = calls.reduce((n, k) => n + (k.output?.items?.length || 0), 0);
      console.log(
        `wrote ${path.relative(ROOT, file)}: ${calls.length} calls, ${items} items, ${calls.filter((k) => !k.ok).length} failed${tenant ? ' (TENANT: do not commit)' : ''}`,
      );
    } catch (e) {
      failures += 1;
      console.error(`fail ${c.id}: ${e?.message || e}`);
    }
  }
  if (failures) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
