import { NextResponse } from 'next/server';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import {
  MODEL_BENCH_VERSION,
  MODEL_BENCH_PROPOSED_CASES,
  cellsForVariant,
  casesForVariant,
  pairsFor,
  suitePlan,
} from '@/lib/sonar/engine/eval/model-bench';
import {
  availability,
  capture,
  runCell,
  judgeRow,
  pairJudge,
  loadResults,
  suiteState,
  humanQueue,
  saveHumanVerdict,
} from '@/lib/sonar/engine/eval/model-bench-runner';
import { ACTIVE_MODEL_BENCH, MODEL_BENCH_SUITES } from '@/lib/sonar/engine/eval/model-bench-active';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Sonar model-quality benchmark (admin only). Steps run one per request; the unattended
 * suite runs through /api/cron/sonar-model-bench. Results are rows in
 * sonar_research_evaluations. Nothing here changes what users are served.
 *
 *   GET  ?action=plan                     cases, cells, pairs, proposed cases, suite progress
 *   GET  ?action=results&suite=ID[&text=1] aggregates, pairs, and (text=1) the answers
 *   POST { action:'availability' | 'capture' | 'run' | 'judge' | 'pair', ... }
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

export async function GET(request) {
  const g = await gate(request);
  if (g.res) return g.res;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'plan';
  const admin = getAdminClient();
  try {
    if (action === 'plan') {
      const suite = url.searchParams.get('suite') || ACTIVE_MODEL_BENCH.suite;
      const conf = MODEL_BENCH_SUITES.find((x) => x.suite === suite) || ACTIVE_MODEL_BENCH;
      const plan = suitePlan({
        deepTrials: conf.deepTrials,
        env: process.env,
        variant: conf.variant,
      });
      const state = await suiteState(admin, suite);
      const byPhase = {};
      for (const s of plan) {
        const b = (byPhase[s.phase] ||= { total: 0, done: 0 });
        b.total += 1;
        if (state.done.has(s.key)) b.done += 1;
      }
      return NextResponse.json({
        version: MODEL_BENCH_VERSION,
        active: ACTIVE_MODEL_BENCH,
        progress: { suite, byPhase, spentUsd: Math.round(state.spentUsd * 100) / 100 },
        cases: casesForVariant(conf.variant).map((c) => ({
          id: c.id,
          category: c.category,
          depth: c.depth,
          query: c.query,
          evidenceClass: c.evidenceClass || 'complete',
          cells: cellsForVariant(c, conf.variant, process.env).map((x) => ({
            id: x.id,
            label: x.label,
            depth: x.depth || c.depth,
          })),
          pairs: pairsFor(c, conf.variant).map(([left, right, label]) => ({ left, right, label })),
        })),
        proposed: MODEL_BENCH_PROPOSED_CASES.map(({ id, category, depth, query }) => ({
          id,
          category,
          depth,
          query,
        })),
      });
    }
    if (action === 'human-queue') {
      const suite = url.searchParams.get('suite') || ACTIVE_MODEL_BENCH.suite;
      return NextResponse.json(
        await humanQueue(admin, {
          suite,
          left: url.searchParams.get('left') || 'current',
          right: url.searchParams.get('right') || 'D',
          reviewer: g.user?.email || null,
        }),
      );
    }
    if (action === 'results') {
      const suite = url.searchParams.get('suite') || ACTIVE_MODEL_BENCH.suite;
      return NextResponse.json(
        await loadResults(admin, suite, { withText: url.searchParams.get('text') === '1' }),
      );
    }
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'model bench read failed' }, { status: 500 });
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
  const suite = body.suite || ACTIVE_MODEL_BENCH.suite;
  /* Manual steps write to their own suite id so they never mix with the worker's plan. */
  const manualSuite = body.suite || `manual:${ACTIVE_MODEL_BENCH.suite}`;
  try {
    if (body.action === 'human')
      return NextResponse.json(
        await saveHumanVerdict(admin, { ...body, suite, reviewer: g.user?.email || 'admin' }),
      );
    if (body.action === 'availability')
      return NextResponse.json(await availability(admin, { suite: manualSuite }));
    if (body.action === 'capture')
      return NextResponse.json(await capture(admin, { suite: manualSuite, caseId: body.caseId }));
    if (body.action === 'run')
      return NextResponse.json(
        await runCell(admin, { ...body, suite: manualSuite, suiteSnapshots: true }),
      );
    if (body.action === 'judge')
      return NextResponse.json(await judgeRow(admin, { ...body, suite: manualSuite }));
    if (body.action === 'pair')
      return NextResponse.json(await pairJudge(admin, { ...body, suite: manualSuite }));
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'model bench step failed' }, { status: 500 });
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
