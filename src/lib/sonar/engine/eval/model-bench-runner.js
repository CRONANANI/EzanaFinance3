/**
 * Sonar model benchmark runner: the steps (availability, evidence capture, cell replay,
 * absolute judge, paired judge) and the worker that walks a suite plan. Used by the
 * admin route (one step per click) and by the /api/cron/sonar-model-bench worker
 * (unattended). Every result is a row in sonar_research_evaluations keyed by suite and
 * step; nothing here changes the models users are served.
 */
import crypto from 'node:crypto';
import { runResearch, ENGINE_VERSION } from '@/lib/sonar/engine/engine';
import { RUNNERS } from '@/lib/sonar/engine/sources';
import { understandQuery } from '@/lib/sonar/understand';
import { scoreDomains } from '@/lib/sonar/engine/research-spec';
import { resolveResearch } from '@/lib/sonar/engine/resolution';
import { loadActiveConfig } from '@/lib/sonar/engine/config-store';
import { synthesizeWithFallback, collectUsage } from '@/lib/sonar/llm-providers';
import { MODELS } from '@/lib/sonar/model-routing';
import { plain, recordingRunners, replayRunners, blockedAdmin } from './replay.js';
import {
  MODEL_BENCH_VERSION,
  caseById,
  cellsForVariant,
  pairsFor,
  scoreRun,
  summarizeUsage,
  aggregate,
  aggregatePairs,
  meanJudge,
  qualityScore,
  runText,
  judgePrompt,
  parseJudge,
  pairPrompt,
  parsePair,
  suitePlan,
} from './model-bench.js';

/* A replayed run gets the production research route's ceiling (300 s function, 12 s
   reserved for scoring and the write). */
const RUN_BUDGET_MS = 288_000;

const caseOf = (id) => caseById(id);

async function insertRow(admin, row) {
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .insert({ benchmark_version: MODEL_BENCH_VERSION, ...row })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/* One tiny call per intended model. fallbackModel is the model itself, so a model the
   account cannot use shows up as a failure rather than as a silent Haiku answer. */
export async function availability(admin, { suite, stepKey } = {}) {
  const ids = [
    MODELS.haiku45,
    MODELS.haiku55,
    MODELS.sonnet55,
    MODELS.opus55,
    MODELS.sonnet5,
    MODELS.sonnet45,
  ];
  const out = [];
  for (const model of ids) {
    // eslint-disable-next-line no-await-in-loop
    const { result, calls } = await collectUsage(() =>
      synthesizeWithFallback({
        system: 'Reply with the single word OK.',
        user: 'OK?',
        maxTokens: 16,
        model,
        fallbackModel: model,
        chainMs: 60_000,
      }).catch((e) => ({ error: e?.message })),
    );
    const anth = calls.filter((c) => c.provider === 'anthropic');
    const ok = anth.find((c) => c.ok);
    out.push({
      model,
      available: Boolean(ok && String(ok.served || '').startsWith(model.replace(/-\d{8}$/, ''))),
      served: ok?.served || null,
      status: ok ? 200 : (anth[0]?.status ?? null),
      ms: ok?.ms ?? anth[0]?.ms ?? null,
      fellBackFrom: ok?.fellBackFrom || null,
      answeredBy: result?.provider || null,
    });
  }
  const result = { checkedAt: new Date().toISOString(), models: out };
  if (admin && suite)
    await insertRow(admin, {
      suite_run: suite,
      engine: 'model-bench-availability',
      benchmark_id: 'availability',
      metrics: { ...result, stepKey },
    });
  return result;
}

/* Freeze a case: run understanding, resolution and retrieval against production data,
   record every runner call, and stop at the 'evidence' event before any synthesis. */
export async function capture(admin, { suite, caseId, stepKey }) {
  const c = caseOf(caseId);
  if (!c) throw new Error(`unknown case ${caseId}`);
  const now = new Date();
  const understood = await understandQuery(c.query, {});
  const domains = scoreDomains(c.query, understood);
  const resolved = await resolveResearch(understood, {
    query: c.query,
    admin,
    ms: 5000,
    domains,
  }).catch(() => ({
    subject: null,
    countries: [],
    universe: null,
    notes: ['resolution_failed'],
  }));
  const config = await loadActiveConfig(admin).catch(() => null);
  const calls = [];
  const controller = new AbortController();
  let planEvent = null;
  const t0 = Date.now();
  await runResearch(c.query, {
    admin,
    runId: crypto.randomUUID(),
    depth: c.depth,
    now,
    config: config || undefined,
    scope: { userId: null, orgId: null },
    signal: controller.signal,
    emit: (type, data) => {
      if (type === 'plan') planEvent = plain(data);
      if (type === 'evidence') controller.abort();
    },
    evidenceOverride: {
      resolution: resolved,
      runners: recordingRunners(RUNNERS, calls),
      memory: [],
    },
  }).catch(() => null);
  if ((planEvent?.plan?.tasks?.length || 0) && !calls.length)
    throw new Error('capture recorded no runner call; evidenceOverride was ignored');
  const snapshot = {
    caseId: c.id,
    query: c.query,
    depth: c.depth,
    capturedAt: now.toISOString(),
    engine: ENGINE_VERSION,
    resolution: plain(resolved),
    config: plain(config),
    retrievalMs: Date.now() - t0,
    calls,
  };
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .insert({
      suite_run: suite || `snapshot:${now.toISOString()}`,
      benchmark_version: MODEL_BENCH_VERSION,
      engine: 'model-bench-snapshot',
      config_version: ENGINE_VERSION,
      benchmark_id: c.id,
      metrics: { ...snapshot, stepKey: stepKey || null },
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    caseId: c.id,
    calls: calls.length,
    failedCalls: calls.filter((x) => !x.ok).length,
    retrievalMs: snapshot.retrievalMs,
  };
}

async function latestSnapshot(admin, caseId, suite) {
  let q = admin
    .from('sonar_research_evaluations')
    .select('id, metrics')
    .eq('engine', 'model-bench-snapshot')
    .eq('benchmark_id', caseId);
  if (suite) q = q.eq('suite_run', suite);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`no snapshot for ${caseId}; capture it first`);
  return { id: data.id, ...data.metrics };
}

/* Replay one cell on the frozen evidence; score it; store it. */
export async function runCell(
  admin,
  { caseId, cellId, suite, trial = 1, stepKey = null, suiteSnapshots = false, variant = null },
) {
  const c = caseOf(caseId);
  if (!c) throw new Error(`unknown case ${caseId}`);
  const cell = cellsForVariant(c, variant, process.env).find((x) => x.id === cellId);
  if (!cell) throw new Error(`unknown cell ${cellId} for ${caseId}`);
  if (!suite) throw new Error('suite required');
  const snap = await latestSnapshot(admin, caseId, suiteSnapshots ? suite : null);
  const replayLog = [];
  const leaks = [];
  const startedAt = Date.now();
  let failed = null;
  const { result: run, calls } = await collectUsage(() =>
    runResearch(c.query, {
      admin: blockedAdmin(leaks),
      runId: crypto.randomUUID(),
      depth: cell.depth || c.depth,
      now: new Date(snap.capturedAt),
      config: snap.config || undefined,
      scope: { userId: null, orgId: null },
      modelRouting: cell.routing,
      outputScale: cell.outputScale || 1,
      /* The production function's own ceiling, as the research route sets it. */
      deadlineAt: startedAt + RUN_BUDGET_MS,
      emit: () => {},
      evidenceOverride: {
        resolution: snap.resolution,
        runners: replayRunners(snap, replayLog),
        memory: [],
      },
    }).catch((e) => {
      failed = e?.message || 'threw';
      return null;
    }),
  );
  const wallMs = Date.now() - startedAt;
  const runForScore = run || { failed, researchMetadata: { durationMs: wallMs, partial: true } };
  const score = scoreRun(runForScore, c);
  if (score.durationMs == null) score.durationMs = wallMs;
  const usage = summarizeUsage(calls);
  const metrics = {
    stepKey,
    cellLabel: cell.label,
    depth: cell.depth || c.depth,
    trial,
    routing: cell.routing,
    variant,
    outputScale: cell.outputScale || 1,
    snapshotId: snap.id,
    servedModel: run?.researchMetadata?.model || null,
    crossDomain: run?.researchMetadata?.crossDomain ?? null,
    failed,
    wallMs,
    replay: {
      exact: replayLog.filter((r) => r.match === 'exact').length,
      loose: replayLog.filter((r) => r.match === 'loose').length,
      miss: replayLog.filter((r) => r.match === 'miss').length,
      dbLeaks: leaks.length,
    },
    score,
    usage,
    calls: calls.map((x) => ({ ...x })),
    /* Enough of the answer to read it and to judge it later. */
    output: {
      text: runText(run).slice(0, 20000),
      keyFindings: (run?.keyFindings || []).slice(0, 12),
      evidence: (run?.evidence || []).slice(0, 40).map((e) => ({
        id: e.id,
        marker: e.marker,
        title: e.title,
        text: String(e.text || '').slice(0, 300),
        source: e.source || null,
        category: e.category || null,
      })),
      limitations: run?.limitations || [],
    },
  };
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .insert({
      suite_run: suite,
      benchmark_version: MODEL_BENCH_VERSION,
      engine: 'model-bench',
      config_version: cell.id,
      benchmark_id: c.id,
      composite: score.objectives.total ? score.objectives.met / score.objectives.total : 0,
      metrics,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    caseId,
    cellId,
    completed: score.completed,
    partial: score.partial,
    objectives: score.objectives,
    usd: usage.total.usd,
    ms: score.durationMs,
    modelMismatches: usage.modelMismatches.length,
  };
}

/* ---------------------------------------------------------------- judging -------- */

async function loadRun(admin, { suite, caseId, cellId, trial }) {
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .select('id, metrics')
    .eq('engine', 'model-bench')
    .eq('suite_run', suite)
    .eq('benchmark_id', caseId)
    .eq('config_version', cellId)
    .eq('metrics->>trial', String(trial))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`no run for ${caseId} × ${cellId} trial ${trial}`);
  const out = data.metrics?.output || {};
  return {
    id: data.id,
    metrics: data.metrics,
    run: { brief: out.text || '', evidence: out.evidence || [] },
  };
}

async function askJudge(model, { system, user }, maxTokens) {
  const { result, calls } = await collectUsage(() =>
    synthesizeWithFallback({
      system,
      user,
      maxTokens,
      model,
      fallbackModel: model,
      chainMs: 150_000,
    }),
  );
  const usage = summarizeUsage(calls);
  return {
    answer: result?.answer || null,
    usd: usage.total.usd,
    mismatches: usage.modelMismatches.length,
  };
}

/** Absolute rubric grade of one run by one judge. The judge never sees the model. */
export async function judgeRow(
  admin,
  { suite, caseId, cellId, trial = 1, judge = MODELS.opus55, stepKey = null },
) {
  const c = caseOf(caseId);
  const r = await loadRun(admin, { suite, caseId, cellId, trial });
  const ask = await askJudge(judge, judgePrompt(c, r.run), 900);
  const scores = parseJudge(ask.answer);
  await insertRow(admin, {
    suite_run: suite,
    engine: 'model-bench-judge',
    config_version: cellId,
    benchmark_id: caseId,
    composite: scores?.overall ?? null,
    metrics: {
      stepKey,
      trial,
      judge,
      runId: r.id,
      scores,
      usd: ask.usd,
      mismatches: ask.mismatches,
      raw: scores ? null : String(ask.answer || '').slice(0, 500),
    },
  });
  return { caseId, cellId, judge, overall: scores?.overall ?? null };
}

/** Paired comparison of two cells' runs by one judge in one order. */
export async function pairJudge(
  admin,
  {
    suite,
    caseId,
    left,
    right,
    trial = 1,
    judge = MODELS.opus55,
    xIs = 'left',
    stepKey = null,
    variant = null,
  },
) {
  const c = caseOf(caseId);
  const L = await loadRun(admin, { suite, caseId, cellId: left, trial });
  const R = await loadRun(admin, { suite, caseId, cellId: right, trial });
  const [x, y] = xIs === 'left' ? [L.run, R.run] : [R.run, L.run];
  const ask = await askJudge(judge, pairPrompt(c, x, y), 1400);
  const verdict = parsePair(ask.answer, { xIs });
  const label =
    (pairsFor(c, variant).find((p) => p[0] === left && p[1] === right) || [])[2] ||
    `${left} vs ${right}`;
  await insertRow(admin, {
    suite_run: suite,
    engine: 'model-bench-pair',
    config_version: `${left}|${right}`,
    benchmark_id: caseId,
    metrics: {
      stepKey,
      trial,
      judge,
      xIs,
      left,
      right,
      label,
      leftRunId: L.id,
      rightRunId: R.id,
      verdict,
      usd: ask.usd,
      mismatches: ask.mismatches,
      raw: verdict ? null : String(ask.answer || '').slice(0, 500),
    },
  });
  return { caseId, left, right, judge, xIs, overall: verdict?.overall?.winner ?? null };
}

/* ---------------------------------------------------------------- worker --------- */

const ATTEMPT_STALE_MS = 7 * 60_000;
const RESULT_ENGINES = new Set([
  'model-bench',
  'model-bench-snapshot',
  'model-bench-judge',
  'model-bench-pair',
  'model-bench-availability',
]);

/** What is done, attempted and spent in a suite (one light query). */
export async function suiteState(admin, suite) {
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .select(
      'engine, created_at, key:metrics->>stepKey, runUsd:metrics->usage->total->usd, usd:metrics->usd',
    )
    .eq('suite_run', suite)
    .limit(5000);
  if (error) throw new Error(error.message);
  const done = new Set();
  const attempts = new Map();
  let spentUsd = 0;
  for (const r of data || []) {
    spentUsd += Number(r.runUsd) || Number(r.usd) || 0;
    if (!r.key) continue;
    if (RESULT_ENGINES.has(r.engine)) done.add(r.key);
    else if (r.engine === 'model-bench-attempt') {
      const a = attempts.get(r.key) || { n: 0, last: 0 };
      a.n += 1;
      a.last = Math.max(a.last, new Date(r.created_at).getTime());
      attempts.set(r.key, a);
    }
  }
  return { done, attempts, spentUsd };
}

function exhausted(a, now) {
  return a && a.n >= 2 && now - a.last > ATTEMPT_STALE_MS;
}

/**
 * Which steps a lane may take now: the earliest phase with unfinished steps, the lane's
 * shard of it (plan index mod lanes, so two lanes never race for one step), not done,
 * not attempted in the last 7 minutes, fewer than 2 attempts.
 */
export function eligibleSteps(plan, state, { lane, lanes, now = Date.now() }) {
  const settled = (s) => state.done.has(s.key) || exhausted(state.attempts.get(s.key), now);
  const open = Math.min(...plan.filter((s) => !settled(s)).map((s) => s.phase), Infinity);
  if (!Number.isFinite(open)) return { open: null, steps: [] };
  const steps = plan.filter((s, i) => {
    if (s.phase !== open || i % lanes !== lane || state.done.has(s.key)) return false;
    const a = state.attempts.get(s.key);
    if (!a) return true;
    return a.n < 2 && now - a.last > ATTEMPT_STALE_MS;
  });
  return { open, steps };
}

async function executeStep(admin, suite, step) {
  const base = { suite, stepKey: step.key };
  if (step.kind === 'availability') return availability(admin, base);
  if (step.kind === 'capture') return capture(admin, { ...base, caseId: step.caseId });
  if (step.kind === 'run')
    return runCell(admin, {
      ...base,
      caseId: step.caseId,
      cellId: step.cellId,
      trial: step.trial,
      suiteSnapshots: true,
      variant: step.variant || null,
    });
  if (step.kind === 'judge')
    return judgeRow(admin, {
      ...base,
      caseId: step.caseId,
      cellId: step.cellId,
      trial: step.trial,
      judge: step.judge,
    });
  if (step.kind === 'pair')
    return pairJudge(admin, {
      ...base,
      caseId: step.caseId,
      left: step.left,
      right: step.right,
      trial: step.trial,
      judge: step.judge,
      xIs: step.xIs,
      variant: step.variant || null,
    });
  throw new Error(`unknown step kind ${step.kind}`);
}

/**
 * One worker invocation for one lane. Long steps (capture, run) start only at the top of
 * the invocation; short ones (availability, judging) repeat until the budget is used.
 * Stops on the suite's expiry or spend cap.
 */
export async function workerTick(
  admin,
  {
    suite,
    lane = 0,
    lanes = 1,
    until,
    maxUsd,
    deepTrials = 3,
    budgetMs = 170_000,
    env = {},
    variant = null,
  },
) {
  const t0 = Date.now();
  if (until && t0 > new Date(until).getTime()) return { idle: 'expired' };
  const plan = suitePlan({ deepTrials, env, variant });
  const ran = [];
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const state = await suiteState(admin, suite);
    if (maxUsd && state.spentUsd >= maxUsd)
      return { idle: 'spend cap', spentUsd: state.spentUsd, ran };
    const { open, steps } = eligibleSteps(plan, state, { lane, lanes });
    const step = steps[0];
    if (!step)
      return { idle: open == null ? 'suite complete' : 'nothing for this lane', phase: open, ran };
    const long = step.kind === 'run' || step.kind === 'capture';
    const elapsed = Date.now() - t0;
    if ((long && elapsed > 5_000) || (!long && elapsed > budgetMs)) return { ran, phase: open };
    // eslint-disable-next-line no-await-in-loop
    await insertRow(admin, {
      suite_run: suite,
      engine: 'model-bench-attempt',
      benchmark_id: step.caseId || step.kind,
      metrics: { stepKey: step.key, lane },
    });
    try {
      // eslint-disable-next-line no-await-in-loop
      const out = await executeStep(admin, suite, step);
      ran.push({ key: step.key, ok: true, out });
    } catch (e) {
      ran.push({ key: step.key, ok: false, error: String(e?.message || e).slice(0, 300) });
    }
    if (long) return { ran, phase: open };
  }
}

/* ---------------------------------------------------------------- results -------- */

/** Every result of a suite, assembled: runs with judges, pair verdicts, aggregates. */
export async function loadResults(admin, suite, { withText = false } = {}) {
  const cols = withText
    ? 'id, engine, benchmark_id, config_version, metrics, created_at'
    : 'id, engine, benchmark_id, config_version, created_at, metrics->score, metrics->usage, metrics->cellLabel, metrics->trial, metrics->judge, metrics->scores, metrics->verdict, metrics->xIs, metrics->left, metrics->right, metrics->label, metrics->models, metrics->wallMs, metrics->failed, metrics->replay, metrics->servedModel, metrics->crossDomain, metrics->usd';
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .select(cols)
    .eq('suite_run', suite)
    .neq('engine', 'model-bench-attempt')
    .neq('engine', 'model-bench-snapshot')
    .order('created_at', { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);
  const get = (r, k) => (withText ? r.metrics?.[k] : r[k]);
  const judges = {};
  const pairs = [];
  let availabilityResult = null;
  let judgeUsd = 0;
  for (const r of data || []) {
    if (r.engine === 'model-bench-judge') {
      const k = `${r.benchmark_id}|${r.config_version}|${get(r, 'trial')}`;
      (judges[k] ||= []).push(get(r, 'scores'));
      judgeUsd += Number(get(r, 'usd')) || 0;
    } else if (r.engine === 'model-bench-pair') {
      pairs.push({
        caseId: r.benchmark_id,
        left: get(r, 'left'),
        right: get(r, 'right'),
        label: get(r, 'label'),
        trial: get(r, 'trial'),
        judge: get(r, 'judge'),
        xIs: get(r, 'xIs'),
        verdict: get(r, 'verdict'),
      });
      judgeUsd += Number(get(r, 'usd')) || 0;
    } else if (r.engine === 'model-bench-availability') availabilityResult = get(r, 'models');
  }
  const rows = (data || [])
    .filter((r) => r.engine === 'model-bench')
    .map((r) => {
      const judge = meanJudge(
        judges[`${r.benchmark_id}|${r.config_version}|${get(r, 'trial')}`] || [],
      );
      const score = get(r, 'score');
      return {
        id: r.id,
        caseId: r.benchmark_id,
        cellId: r.config_version,
        cellLabel: get(r, 'cellLabel'),
        trial: get(r, 'trial'),
        score,
        usage: get(r, 'usage'),
        judge,
        quality: score ? qualityScore(score, judge) : null,
        ...(withText ? { output: r.metrics?.output } : {}),
      };
    });
  const byCase = {};
  for (const r of rows) (byCase[r.caseId] ||= []).push(r);
  const pairsByCase = {};
  for (const p of pairs) (pairsByCase[p.caseId] ||= []).push(p);
  return {
    suite,
    availability: availabilityResult,
    rows,
    overall: aggregate(rows),
    perCase: Object.fromEntries(Object.entries(byCase).map(([k, v]) => [k, aggregate(v)])),
    pairs: aggregatePairs(pairs),
    pairsPerCase: Object.fromEntries(
      Object.entries(pairsByCase).map(([k, v]) => [k, aggregatePairs(v)]),
    ),
    pairVerdicts: pairs,
    spend: {
      runsUsd: rows.reduce((a, r) => a + (r.usage?.total?.usd || 0), 0),
      judgingUsd: judgeUsd,
    },
  };
}
