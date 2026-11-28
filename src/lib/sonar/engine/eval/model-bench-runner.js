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
import { fetchDeepValuation } from '@/lib/sonar/valuation/fetch';
import { runResearchComposition, resolveSubject } from '@/lib/sonar/composer/execute';
import { inferComposition } from '@/lib/sonar/composer/intents';
import { canonicalIntent } from '@/lib/sonar/semantic/canonical-intent';
import { OWNERSHIP_CAPABILITY } from '@/lib/sonar/composer/ownership';
import { synthesizeWithFallback, collectUsage } from '@/lib/sonar/llm-providers';
import { MODELS } from '@/lib/sonar/model-routing';
import { plain, recordingRunners, replayRunners, blockedAdmin } from './replay.js';
import {
  MODEL_BENCH_VERSION,
  caseById,
  cellsForVariant,
  pairsFor,
  scoreRun,
  retrievalCheck,
  calcCheck,
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

/**
 * The composition production runs before the engine for an ownership ranking, a screen, a
 * company comparison or a government-dependence question (api/sonar/research, Sonar 6.1 to
 * 6.3): same intent, same inferred attachments, same holder resolution, run once at capture
 * and frozen. Not reproduced: the reader's manual attachments, result reuse (a cache), and
 * the semantic measure refinement (an embedding call; the lexical measure is used).
 * Before Nov 28 2026 the benchmark skipped this step, so those questions were judged
 * without the computed results production readers get.
 */
async function benchComposition(question, admin, { deep }) {
  const canonical = canonicalIntent(question);
  if (canonical.unsupported) return { composition: null, note: 'unsupported intent' };
  const ANALYTIC_FAMILIES = {
    multi_stage_screen: 'financial-screen',
    company_comparison: 'company-comparison',
    government_contract_dependency: 'government-dependence',
  };
  const inferred = inferComposition(question, {});
  let attachments = [];
  let primary = null;
  const analyticCap = ANALYTIC_FAMILIES[canonical.family];
  if (analyticCap) {
    const extra = inferred.attachments.filter((a) => a.capability === analyticCap);
    attachments = [...attachments, ...extra];
    if (extra[0]?.subject?.text) primary = { text: String(extra[0].subject.text).slice(0, 80) };
  }
  if (canonical.family === 'institutional_ownership') {
    const own = inferred.attachments.filter((a) => a.capability === OWNERSHIP_CAPABILITY);
    if (own.length && inferred.subject && !inferred.relation) {
      attachments = [...attachments, ...own];
      primary = primary || { text: String(inferred.subject).slice(0, 80) };
    }
  }
  if (!attachments.length)
    return { composition: null, note: `no composition (${canonical.family})` };
  let resolvedPrimary = null;
  if (canonical.family === 'institutional_ownership' && canonical.primary_entity?.text) {
    const pe = canonical.primary_entity;
    for (const text of (pe.alternates || [pe.text]).slice(0, 3)) {
      // eslint-disable-next-line no-await-in-loop
      const v = await resolveSubject(text, admin).catch(() => null);
      if (
        v?.id &&
        v.kind !== 'unresolved' &&
        (pe.status !== 'candidate' || /[A-Z]/.test(text) || v.kind === 'politician')
      ) {
        resolvedPrimary = v;
        primary = { text: v.text };
        break;
      }
    }
    if (!resolvedPrimary && pe.status === 'candidate')
      return { composition: null, note: 'holder not resolved' };
  }
  const cap = deep ? 45_000 : 20_000;
  /* runResearchComposition returns the composition itself (the research route's timeout
     wrapper adds { ok, value }). */
  let composition = null;
  let failure = null;
  try {
    composition = await runResearchComposition(
      {
        question: String(question).slice(0, 600),
        primary,
        attachments: attachments.slice(0, 8),
        userId: null,
        resolvedPrimary,
        deadlineAt: Date.now() + cap - 1_500,
      },
      admin,
    );
  } catch (e) {
    failure = e?.message || 'threw';
  }
  return composition
    ? {
        composition,
        note: `${canonical.family}: ${attachments.map((a) => a.capability).join(', ')}`,
      }
    : { composition: null, note: `composition failed: ${failure || 'empty'}` };
}

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
  const composed = await benchComposition(c.query, admin, { deep: c.depth === 'deep' });
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
    composition: composed.composition || undefined,
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
  /* A deep company question freezes its valuation model too (DCF, multiples, peers), which
     a replay cannot rebuild from the runners. */
  const ticker = resolved?.company?.ticker || null;
  const valuation =
    c.depth === 'deep' && ticker
      ? await fetchDeepValuation(ticker, { ms: 8000, now }).catch(() => null)
      : null;
  const snapshot = {
    caseId: c.id,
    query: c.query,
    depth: c.depth,
    capturedAt: now.toISOString(),
    engine: ENGINE_VERSION,
    resolution: plain(resolved),
    config: plain(config),
    retrievalMs: Date.now() - t0,
    /* For the retrieval audit: what was planned and what was left out, and why. */
    plan: planEvent?.plan
      ? {
          tasks: (planEvent.plan.tasks || []).map((t) => ({
            source: t.source,
            priority: t.priority,
            reason: t.reason,
          })),
          excluded: (planEvent.plan.excluded || []).slice(0, 60),
        }
      : null,
    valuation: plain(valuation),
    composition: plain(composed.composition),
    compositionNote: composed.note,
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

/**
 * Sonar 6.4: terms the frozen evidence itself names, for objectives that must be judged
 * against the evidence (a member of Congress is named as the disclosure names them,
 * "Kevin Hern", never with a "Rep." title the evidence does not carry).
 */
export function evidenceTerms(snap) {
  const members = new Set();
  for (const call of snap?.calls || []) {
    for (const item of call?.output?.items || []) {
      const d = item?.data || {};
      for (const m of d.summary?.byMember || d.byMember || []) if (m?.name) members.add(m.name);
      for (const t of d.summary?.latest || d.latest || []) if (t?.member) members.add(t.member);
    }
  }
  return { members: [...members] };
}

/* Replay one cell on the frozen evidence; score it; store it. */
export async function runCell(
  admin,
  {
    caseId,
    cellId,
    suite,
    trial = 1,
    stepKey = null,
    suiteSnapshots = false,
    variant = null,
    snapshotSuite = null,
  },
) {
  const c = caseOf(caseId);
  if (!c) throw new Error(`unknown case ${caseId}`);
  const cell = cellsForVariant(c, variant, process.env).find((x) => x.id === cellId);
  if (!cell) throw new Error(`unknown cell ${cellId} for ${caseId}`);
  if (!suite) throw new Error('suite required');
  const snap = await latestSnapshot(
    admin,
    caseId,
    snapshotSuite || (suiteSnapshots ? suite : null),
  );
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
      /* Sonar 6.4: the evidence contract only where the cell asks for it, so suites that
         started before it keep the writer prompt they began with. */
      evidenceContract: cell.evidenceContract === true,
      composition: snap.composition || undefined,
      /* The production function's own ceiling, as the research route sets it. */
      deadlineAt: startedAt + RUN_BUDGET_MS,
      emit: () => {},
      evidenceOverride: {
        resolution: snap.resolution,
        runners: replayRunners(snap, replayLog),
        memory: [],
        valuation: snap.valuation || null,
      },
    }).catch((e) => {
      failed = e?.message || 'threw';
      return null;
    }),
  );
  const wallMs = Date.now() - startedAt;
  const runForScore = run || { failed, researchMetadata: { durationMs: wallMs, partial: true } };
  const score = scoreRun(runForScore, { ...c, evidenceTerms: evidenceTerms(snap) });
  if (score.durationMs == null) score.durationMs = wallMs;
  /* Retrieval is a property of the frozen snapshot (identical across cells); calculations
     and role outcomes are properties of this run. */
  score.retrieval = retrievalCheck(c, snap);
  score.calcs = calcCheck(c, run);
  score.roles = run?.researchMetadata?.outcomes || null;
  score.specialists = {
    planned:
      (run?.team?.specialists || run?.researchMetadata?.team?.supporting || []).length || null,
    done: (run?.researchMetadata?.roleOutcomes || []).filter(
      (r) => r.role.startsWith('specialist:') && (r.outcome === 'ok' || r.outcome === 'truncated'),
    ).length,
    calls: (run?.researchMetadata?.roleOutcomes || []).filter((r) =>
      r.role.startsWith('specialist:'),
    ).length,
  };
  score.evidenceClass = c.evidenceClass || 'complete';
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
    roleOutcomes: run?.researchMetadata?.roleOutcomes || [],
    compositionNote: snap.compositionNote || null,
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
        period: e.period?.label || e.period || null,
        date: e.date || null,
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
      /* Same request shape for both judges: no up-front thinking where the model allows
         it, medium effort (suites before Nov 28 15:00 UTC used each model's default). */
      think: 'off',
      effort: 'medium',
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
  const ask = await askJudge(judge, judgePrompt(c, r.run), 1400);
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
  const ask = await askJudge(judge, pairPrompt(c, x, y), 1800);
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

async function executeStep(admin, suite, step, { snapshotSuite = null } = {}) {
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
      snapshotSuite,
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
    /* Reuse another suite's frozen evidence (identical inputs, no capture phase). */
    snapshotsFrom = null,
  },
) {
  const t0 = Date.now();
  if (until && t0 > new Date(until).getTime()) return { idle: 'expired' };
  const plan = suitePlan({ deepTrials, env, variant }).filter(
    (st) => !snapshotsFrom || st.kind !== 'capture',
  );
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
      const out = await executeStep(admin, suite, step, { snapshotSuite: snapshotsFrom });
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
    : 'id, engine, benchmark_id, config_version, created_at, metrics->score, metrics->usage, metrics->cellLabel, metrics->trial, metrics->judge, metrics->scores, metrics->verdict, metrics->xIs, metrics->left, metrics->right, metrics->label, metrics->models, metrics->wallMs, metrics->failed, metrics->replay, metrics->servedModel, metrics->crossDomain, metrics->usd, metrics->reviewer, metrics->stepKey';
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
  const human = [];
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
    else if (r.engine === 'model-bench-human')
      human.push({
        caseId: r.benchmark_id,
        left: get(r, 'left'),
        right: get(r, 'right'),
        verdict: get(r, 'verdict'),
        reviewer: get(r, 'reviewer'),
      });
  }
  /* Worker rows only: a row without a step key came from a manual admin-page run and is
     not part of the suite's plan. */
  const rows = (data || [])
    .filter((r) => r.engine === 'model-bench' && (withText ? r.metrics?.stepKey : r.stepKey))
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
    human: {
      verdicts: human.length,
      reviewers: [...new Set(human.map((h) => h.reviewer).filter(Boolean))].length,
      byPair: Object.values(
        human.reduce((acc, h) => {
          const k = `${h.left}|${h.right}`;
          const b = (acc[k] ||= { left: h.left, right: h.right, right_w: 0, left_w: 0, tie: 0 });
          const w = h.verdict?.overall?.winner;
          b[w === 'right' ? 'right_w' : w === 'left' ? 'left_w' : 'tie'] += 1;
          return acc;
        }, {}),
      ),
    },
    spend: {
      runsUsd: rows.reduce((a, r) => a + (r.usage?.total?.usd || 0), 0),
      judgingUsd: judgeUsd,
    },
  };
}

/* ---------------------------------------------------------------- human review --- */

/* Which side shows first for a pair: a stable hash, so a reviewer's queue is the same on
   reload and the order is not the plan's left/right. */
function flipOf(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 2 === 1;
}

/**
 * The blind human-review queue for a suite: one item per case and trial for the given
 * comparison (default current vs D), the two answers as A and B in a stable random order,
 * never the model or the cell. Items this reviewer already judged are marked.
 */
export async function humanQueue(admin, { suite, left = 'current', right = 'D', reviewer = null }) {
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .select('id, benchmark_id, config_version, metrics->trial, metrics->output')
    .eq('suite_run', suite)
    .eq('engine', 'model-bench')
    .in('config_version', [left, right])
    .not('metrics->>stepKey', 'is', null)
    .limit(500);
  if (error) throw new Error(error.message);
  const { data: done } = await admin
    .from('sonar_research_evaluations')
    .select('metrics->itemKey, metrics->reviewer')
    .eq('suite_run', suite)
    .eq('engine', 'model-bench-human')
    .limit(2000);
  const judged = new Set(
    (done || []).filter((d) => !reviewer || d.reviewer === reviewer).map((d) => d.itemKey),
  );
  const by = {};
  for (const r of data || []) (by[`${r.benchmark_id}|${r.trial}`] ||= {})[r.config_version] = r;
  const items = [];
  for (const [k, v] of Object.entries(by)) {
    if (!v[left] || !v[right]) continue;
    const [caseId, trial] = k.split('|');
    const c = caseOf(caseId);
    const itemKey = `${caseId}|${trial}|${left}|${right}`;
    const flip = flipOf(itemKey);
    const [a, b] = flip ? [v[right], v[left]] : [v[left], v[right]];
    items.push({
      itemKey,
      caseId,
      trial: Number(trial),
      category: c?.category || caseId,
      evidenceClass: c?.evidenceClass || 'complete',
      question: c?.query || '',
      a: { text: a.output?.text || '' },
      b: { text: b.output?.text || '' },
      judged: judged.has(itemKey),
    });
  }
  return { suite, left, right, items: items.sort((x, y) => x.itemKey.localeCompare(y.itemKey)) };
}

/** Store one reviewer's blind verdict ("a" | "b" | "tie" per criterion), mapped back to cells. */
export async function saveHumanVerdict(
  admin,
  { suite, itemKey, verdicts = {}, note = '', reviewer },
) {
  const [caseId, trial, left, right] = String(itemKey || '').split('|');
  if (!caseId || !left || !right) throw new Error('itemKey required');
  const flip = flipOf(itemKey);
  const map = (w) => (w === 'tie' ? 'tie' : (w === 'a') !== flip ? 'left' : 'right');
  const keys = ['overall', 'correctness', 'usefulness', 'relationships'];
  const verdict = {};
  for (const k of keys)
    if (['a', 'b', 'tie'].includes(verdicts[k])) verdict[k] = { winner: map(verdicts[k]) };
  if (!verdict.overall) throw new Error('an overall verdict is required');
  await insertRow(admin, {
    suite_run: suite,
    engine: 'model-bench-human',
    config_version: `${left}|${right}`,
    benchmark_id: caseId,
    metrics: {
      itemKey,
      trial: Number(trial),
      left,
      right,
      reviewer,
      verdict,
      note: String(note || '').slice(0, 1000),
    },
  });
  return { ok: true, itemKey, verdict };
}
