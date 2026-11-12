import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { normalizeConfig, validateSpec } from '@/lib/quants/strategy-spec';
import { ENGINE_VERSION, runBacktest } from '@/lib/quants/backtest-engine';
import {
  MAX_RUNS_PER_DAY,
  NO_STORE,
  RUN_SUMMARY_COLUMNS,
  STALE_RUN_MS,
  UUID_RE,
  loadRunBars,
} from '@/lib/quants/lab-server';
import { loadRunEvents } from '@/lib/quants/event-sources';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/* A run is at most 21 price downloads (8s timeout each, in parallel) and a
   few milliseconds of arithmetic on daily bars, so it fits one request. The
   run row is still written as 'running' first and finished afterwards, which
   is the shape a queue worker will need when parameter sweeps arrive. */
export const maxDuration = 60;

/** Trades kept on the stored run. The metrics always use every trade. */
const MAX_STORED_TRADES = 2000;

/**
 * GET /api/quants/backtests?strategyId=<uuid>
 * The caller's recent runs, summaries only.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const strategyId = new URL(request.url).searchParams.get('strategyId') || '';
      let q = getUserClient()
        .from('quant_backtest_runs')
        .select(RUN_SUMMARY_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(50);
      if (strategyId) {
        if (!UUID_RE.test(strategyId)) return NextResponse.json({ runs: [] }, NO_STORE);
        q = q.eq('strategy_id', strategyId);
      }
      const { data, error } = await q;
      if (error) return safeErrorResponse(error, { context: 'quants/backtests list' });
      return NextResponse.json({ runs: data || [] }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/backtests list' });
    }
  },
  { requireAuth: true },
);

/**
 * POST /api/quants/backtests  { strategyId, versionId?, config? }
 * Runs one saved strategy version over historical daily bars and stores the
 * result. The rules come from the stored version, never from the request, so
 * the run is tied to an immutable definition.
 */
export const POST = withApiGuard(
  async (request, user) => {
    const supabase = getUserClient();
    let runId = null;
    try {
      const body = await request.json().catch(() => ({}));
      const strategyId = String(body?.strategyId || '');
      if (!UUID_RE.test(strategyId)) {
        return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
      }

      let vq = supabase
        .from('quant_strategy_versions')
        .select('id, strategy_id, version, spec, spec_hash')
        .eq('strategy_id', strategyId);
      vq =
        body?.versionId && UUID_RE.test(String(body.versionId))
          ? vq.eq('id', body.versionId)
          : vq.order('version', { ascending: false }).limit(1);
      const { data: versions, error: vErr } = await vq;
      if (vErr) return safeErrorResponse(vErr, { context: 'quants/backtests version' });
      const version = versions?.[0];
      if (!version) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });

      const checked = validateSpec(version.spec);
      if (!checked.ok) {
        return NextResponse.json(
          { error: 'This strategy version is not valid', details: checked.errors },
          { status: 400 },
        );
      }
      if (checked.unsupported.length) {
        return NextResponse.json(
          {
            error:
              'This strategy uses conditions that cannot be backtested yet. Remove them to run it.',
            details: checked.unsupported.map((u) => `${u.id}: ${u.reason}`),
          },
          { status: 422 },
        );
      }
      const { config, errors } = normalizeConfig(body?.config || {});
      if (errors.length) {
        return NextResponse.json({ error: errors[0], details: errors }, { status: 400 });
      }

      /* Quotas: one run at a time, and a daily ceiling. */
      const now = Date.now();
      const [{ data: active }, { count: today }] = await Promise.all([
        supabase
          .from('quant_backtest_runs')
          .select('id')
          .eq('status', 'running')
          .gte('created_at', new Date(now - STALE_RUN_MS).toISOString())
          .limit(1),
        supabase
          .from('quant_backtest_runs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(now - 86400000).toISOString()),
      ]);
      if (active?.length) {
        return NextResponse.json(
          { error: 'A backtest is already running. Wait for it to finish.' },
          { status: 429 },
        );
      }
      if ((today || 0) >= MAX_RUNS_PER_DAY) {
        return NextResponse.json(
          { error: `Daily limit of ${MAX_RUNS_PER_DAY} backtests reached.` },
          { status: 429 },
        );
      }

      const { data: run, error: rErr } = await supabase
        .from('quant_backtest_runs')
        .insert({
          user_id: user.id,
          strategy_id: strategyId,
          version_id: version.id,
          status: 'running',
          config,
          engine_version: ENGINE_VERSION,
          spec_hash: version.spec_hash,
        })
        .select('id, created_at')
        .single();
      if (rErr) return safeErrorResponse(rErr, { context: 'quants/backtests insert' });
      runId = run.id;

      const [loaded, disclosures] = await Promise.all([
        loadRunBars(checked.spec, config),
        loadRunEvents(checked.spec, config),
      ]);
      const result = runBacktest({
        spec: checked.spec,
        config,
        bars: loaded.bars,
        benchmarkBars: loaded.benchmarkBars,
        sources: loaded.sources,
        events: disclosures.events,
      });

      const truncated = result.trades.length > MAX_STORED_TRADES;
      const warnings = [
        ...disclosures.notices,
        ...result.warnings,
        ...(truncated
          ? [
              `The ledger stores the first ${MAX_STORED_TRADES} of ${result.trades.length} trades. Every statistic uses all of them.`,
            ]
          : []),
      ];
      const results = {
        curve: result.curve,
        drawdown: result.drawdown,
        monthly: result.monthly,
        trades: truncated ? result.trades.slice(0, MAX_STORED_TRADES) : result.trades,
        rejected: result.rejected.slice(0, 200),
        costs: result.costs,
        assumptions: result.assumptions,
        adjustments: loaded.adjustments,
        benchmark: checked.spec.benchmark,
        version: version.version,
      };
      const finished = {
        status: 'completed',
        metrics: result.metrics,
        results,
        warnings,
        data_coverage: result.coverage,
        completed_at: new Date().toISOString(),
      };
      const { error: uErr } = await supabase
        .from('quant_backtest_runs')
        .update(finished)
        .eq('id', runId);
      if (uErr) return safeErrorResponse(uErr, { context: 'quants/backtests store' });

      return NextResponse.json(
        {
          run: {
            id: runId,
            strategy_id: strategyId,
            version_id: version.id,
            config,
            engine_version: ENGINE_VERSION,
            created_at: run.created_at,
            ...finished,
          },
        },
        NO_STORE,
      );
    } catch (err) {
      /* Engine errors are written for the user ("no price history in this
         window"); anything else is logged and reported generically. */
      const message = err instanceof Error ? err.message : 'The backtest failed';
      if (runId) {
        await supabase
          .from('quant_backtest_runs')
          .update({
            status: 'failed',
            error: message.slice(0, 500),
            completed_at: new Date().toISOString(),
          })
          .eq('id', runId);
        return NextResponse.json({ error: message, runId }, { status: 422, ...NO_STORE });
      }
      return safeErrorResponse(err, { context: 'quants/backtests run' });
    }
  },
  { requireAuth: true, strict: true },
);
