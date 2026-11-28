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
  cancelSuite,
  globalEvalSpend,
  humanReviewSet,
} from '@/lib/sonar/engine/eval/model-bench-runner';
import { estimateStepUsd, paidStepGate } from '@/lib/sonar/engine/eval/bench-budget';
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
 *   GET  ?action=human-set                 the prepared ten-pair blind review set
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
    /* Nov 28 2026: the prepared ten-pair review set (no model calls). */
    if (action === 'human-set')
      return NextResponse.json(await humanReviewSet(admin, { reviewer: g.user?.email || null }));
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
    /* Nov 28 2026: manual cancellation. The worker refuses every later step of the suite. */
    if (body.action === 'cancel') {
      if (!body.suite) return NextResponse.json({ error: 'suite required' }, { status: 400 });
      return NextResponse.json(await cancelSuite(admin, body.suite, g.user?.email || 'admin'));
    }
    /* Every other action makes paid model calls: deployment authorization, an explicit
       confirmation in the request, the manual cap and the global cap (bench-budget.js). */
    if (['availability', 'capture', 'run', 'judge', 'pair'].includes(body.action)) {
      const nowIso = new Date().toISOString();
      const st = await suiteState(admin, manualSuite);
      const glob = await globalEvalSpend(admin);
      const manualCap = Number(process.env.SONAR_BENCH_MANUAL_CAP_USD) || 0;
      const gate =
        body.confirmPaid === true
          ? paidStepGate({
              env: process.env,
              suite: {
                suite: manualSuite,
                maxUsd: manualCap,
                authorization: { by: g.user?.email || 'admin', at: nowIso, maxUsd: manualCap },
                maxConcurrent: 1,
              },
              state: {
                suiteSpentUsd: st.spentUsd,
                suiteReservedUsd: st.reservedUsd,
                globalSpentUsd: glob.spentUsd,
                globalReservedUsd: glob.reservedUsd,
                inFlight: st.inFlight,
                cancelled: st.cancelled,
              },
              estimateUsd: estimateStepUsd({ kind: body.action, depth: body.depth }),
            })
          : { ok: false, reason: 'paid step needs confirmPaid: true in the request' };
      if (!gate.ok)
        return NextResponse.json({ error: gate.reason, refused: true }, { status: 403 });
    }
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
