import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { runResearch, ENGINE_VERSION } from '@/lib/sonar/engine/engine';
import { RUNNERS } from '@/lib/sonar/engine/sources';
import { understandQuery } from '@/lib/sonar/understand';
import { scoreDomains } from '@/lib/sonar/engine/research-spec';
import { resolveResearch } from '@/lib/sonar/engine/resolution';
import { loadActiveConfig } from '@/lib/sonar/engine/config-store';
import { synthesizeWithFallback, collectUsage } from '@/lib/sonar/llm-providers';
import { MODELS } from '@/lib/sonar/model-routing';
import {
  plain,
  recordingRunners,
  replayRunners,
  blockedAdmin,
} from '@/lib/sonar/engine/eval/replay';
import {
  MODEL_BENCH_VERSION,
  MODEL_BENCH_CASES,
  cellsFor,
  scoreRun,
  summarizeUsage,
  aggregate,
  runText,
  judgePrompt,
  parseJudge,
} from '@/lib/sonar/engine/eval/model-bench';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Sonar model-quality benchmark runner (admin only). Production holds the Anthropic key,
 * so the benchmark runs here, one step per request, and every result is a row in
 * sonar_research_evaluations (engine 'model-bench'; frozen evidence rows use engine
 * 'model-bench-snapshot'). Nothing here changes what users are served.
 *
 *   GET  ?action=plan                 cases and their cells
 *   GET  ?action=results&suite=ID     rows of a suite and the side-by-side aggregate
 *   POST { action:'availability' }    one tiny call per model: status and served model
 *   POST { action:'capture', caseId } freeze a case's evidence (no model is billed for
 *                                     synthesis: the run stops once evidence is in)
 *   POST { action:'run', caseId, cellId, suite, trial }   replay one cell on the frozen evidence
 *   POST { action:'judge', rowId, model? }                optional blind rubric grade of a row
 */
async function gate(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return { res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isAdminUser(user))
    return { res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
}

const caseOf = (id) => MODEL_BENCH_CASES.find((c) => c.id === id);

export async function GET(request) {
  const g = await gate(request);
  if (g.res) return g.res;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'plan';
  const admin = getAdminClient();
  if (action === 'plan') {
    const { data: snaps } = await admin
      .from('sonar_research_evaluations')
      .select('benchmark_id, created_at')
      .eq('engine', 'model-bench-snapshot')
      .order('created_at', { ascending: false });
    const captured = {};
    for (const s of snaps || []) captured[s.benchmark_id] ||= s.created_at;
    return NextResponse.json({
      version: MODEL_BENCH_VERSION,
      cases: MODEL_BENCH_CASES.map((c) => ({
        id: c.id,
        category: c.category,
        depth: c.depth,
        query: c.query,
        capturedAt: captured[c.id] || null,
        cells: cellsFor(c, process.env).map((x) => ({
          id: x.id,
          label: x.label,
          depth: x.depth || c.depth,
          routing: x.routing,
        })),
      })),
    });
  }
  if (action === 'results') {
    const suite = url.searchParams.get('suite');
    if (!suite) return NextResponse.json({ error: 'suite required' }, { status: 400 });
    const { data, error } = await admin
      .from('sonar_research_evaluations')
      .select('id, benchmark_id, config_version, composite, metrics, created_at')
      .eq('engine', 'model-bench')
      .eq('suite_run', suite)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = (data || []).map((r) => ({
      id: r.id,
      caseId: r.benchmark_id,
      cellId: r.config_version,
      cellLabel: r.metrics?.cellLabel,
      score: r.metrics?.score,
      usage: r.metrics?.usage,
      judge: r.metrics?.judge || null,
      createdAt: r.created_at,
    }));
    const byCase = {};
    for (const r of rows) (byCase[r.caseId] ||= []).push(r);
    return NextResponse.json({
      suite,
      rows,
      overall: aggregate(rows),
      perCase: Object.fromEntries(Object.entries(byCase).map(([k, v]) => [k, aggregate(v)])),
    });
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

export async function POST(request) {
  const g = await gate(request);
  if (g.res) return g.res;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'json body required' }, { status: 400 });
  }
  const admin = getAdminClient();
  try {
    if (body.action === 'availability') return NextResponse.json(await availability());
    if (body.action === 'capture') return NextResponse.json(await capture(admin, body));
    if (body.action === 'run') return NextResponse.json(await runCell(admin, body));
    if (body.action === 'judge') return NextResponse.json(await judge(admin, body));
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'model bench step failed' }, { status: 500 });
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

/* One tiny call per intended model. fallbackModel is the model itself, so a model the
   account cannot use shows up as a failure rather than as a silent Haiku answer. */
async function availability() {
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
  return { checkedAt: new Date().toISOString(), models: out };
}

/* Freeze a case: run understanding, resolution and retrieval against production data,
   record every runner call, and stop at the 'evidence' event before any synthesis. */
async function capture(admin, { caseId }) {
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
      suite_run: `snapshot:${now.toISOString()}`,
      benchmark_version: MODEL_BENCH_VERSION,
      engine: 'model-bench-snapshot',
      config_version: ENGINE_VERSION,
      benchmark_id: c.id,
      metrics: snapshot,
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

async function latestSnapshot(admin, caseId) {
  const { data, error } = await admin
    .from('sonar_research_evaluations')
    .select('id, metrics')
    .eq('engine', 'model-bench-snapshot')
    .eq('benchmark_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`no snapshot for ${caseId}; capture it first`);
  return { id: data.id, ...data.metrics };
}

/* Replay one cell on the frozen evidence; score it; store it. */
async function runCell(admin, { caseId, cellId, suite, trial = 1 }) {
  const c = caseOf(caseId);
  if (!c) throw new Error(`unknown case ${caseId}`);
  const cell = cellsFor(c, process.env).find((x) => x.id === cellId);
  if (!cell) throw new Error(`unknown cell ${cellId} for ${caseId}`);
  if (!suite) throw new Error('suite required');
  const snap = await latestSnapshot(admin, caseId);
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
      /* The production function's own ceiling, as the research route sets it. */
      deadlineAt: startedAt + (maxDuration - 12) * 1000,
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
    cellLabel: cell.label,
    depth: cell.depth || c.depth,
    trial,
    routing: cell.routing,
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

/* Blind rubric grade. The judge never sees the cell or the model. */
async function judge(admin, { rowId, model = MODELS.opus55 }) {
  const { data: row, error } = await admin
    .from('sonar_research_evaluations')
    .select('id, benchmark_id, metrics')
    .eq('id', rowId)
    .single();
  if (error) throw new Error(error.message);
  const c = caseOf(row.benchmark_id);
  const out = row.metrics?.output || {};
  const fakeRun = { evidence: out.evidence || [], brief: out.text || '' };
  const { system, user } = judgePrompt(c, fakeRun);
  const { result, calls } = await collectUsage(() =>
    synthesizeWithFallback({
      system,
      user,
      maxTokens: 800,
      model,
      fallbackModel: model,
      chainMs: 120_000,
    }),
  );
  const parsed = parseJudge(result?.answer);
  const judgeUsage = summarizeUsage(calls);
  const metrics = {
    ...row.metrics,
    judge: parsed ? { ...parsed, model, usd: judgeUsage.total.usd } : { error: 'unparsed', model },
  };
  const { error: upErr } = await admin
    .from('sonar_research_evaluations')
    .update({ metrics })
    .eq('id', rowId);
  if (upErr) throw new Error(upErr.message);
  return { id: rowId, judge: metrics.judge };
}
