import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { normalizeConfig, specLookback, validateSpec } from '@/lib/quants/strategy-spec';
import { ENGINE_VERSION } from '@/lib/quants/backtest-engine';
import {
  MAX_WORK,
  VALIDATION_VERSION,
  applyParamSet,
  buildGrid,
  estimateWork,
  normalizeValidationOptions,
  runValidation,
} from '@/lib/quants/validation';
import {
  MAX_VALIDATIONS_PER_DAY,
  NO_STORE,
  STALE_RUN_MS,
  UUID_RE,
  VALIDATION_SUMMARY_COLUMNS,
  loadRunBars,
} from '@/lib/quants/lab-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/* A validation is dozens to a few hundred engine runs over bars that are
   downloaded once. The work is capped before it starts (MAX_WORK) and has a
   wall-clock budget below, so it always fits one request. */
export const maxDuration = 60;

/** Time allowed for the simulation itself, leaving room for the downloads and the write. */
const COMPUTE_BUDGET_MS = 40_000;

/**
 * GET /api/quants/validations?strategyId=<uuid>
 * The caller's recent validations, summaries only.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const strategyId = new URL(request.url).searchParams.get('strategyId') || '';
      let q = getUserClient()
        .from('quant_validation_runs')
        .select(VALIDATION_SUMMARY_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(30);
      if (strategyId) {
        if (!UUID_RE.test(strategyId)) return NextResponse.json({ validations: [] }, NO_STORE);
        q = q.eq('strategy_id', strategyId);
      }
      const { data, error } = await q;
      if (error) return safeErrorResponse(error, { context: 'quants/validations list' });
      return NextResponse.json({ validations: data || [] }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/validations list' });
    }
  },
  { requireAuth: true },
);

/**
 * POST /api/quants/validations  { strategyId, versionId?, config?, options? }
 * Validates one saved strategy version: split, cost sensitivity, optional
 * parameter sweep, walk-forward. The rules come from the stored version.
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
      if (vErr) return safeErrorResponse(vErr, { context: 'quants/validations version' });
      const version = versions?.[0];
      if (!version) return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });

      const checked = validateSpec(version.spec);
      if (!checked.ok || checked.unsupported.length) {
        return NextResponse.json(
          { error: 'This strategy version cannot be backtested, so it cannot be validated.' },
          { status: 422 },
        );
      }
      const spec = checked.spec;
      const { config, errors: configErrors } = normalizeConfig(body?.config || {});
      if (configErrors.length) {
        return NextResponse.json(
          { error: configErrors[0], details: configErrors },
          { status: 400 },
        );
      }
      const { options, errors: optionErrors } = normalizeValidationOptions(
        spec,
        body?.options || {},
      );
      if (optionErrors.length) {
        return NextResponse.json(
          { error: optionErrors[0], details: optionErrors },
          { status: 400 },
        );
      }

      /* Refuse oversized requests before downloading anything. Weekdays in the
         window stand in for trading sessions. */
      const calendarDays = (Date.parse(config.endDate) - Date.parse(config.startDate)) / 86400000;
      const sessions = Math.ceil((calendarDays * 5) / 7);
      const work = estimateWork({ tickers: spec.universe.length, sessions, options });
      if (work > MAX_WORK) {
        return NextResponse.json(
          {
            error:
              'This validation is too large. Use fewer parameter values, fewer folds, fewer tickers or a shorter window.',
            details: [
              `Estimated size ${Math.round(work / 1000).toLocaleString('en-US')}k against a limit of ${Math.round(MAX_WORK / 1000).toLocaleString('en-US')}k.`,
            ],
          },
          { status: 400 },
        );
      }

      /* Quotas: one at a time, and a daily ceiling. */
      const now = Date.now();
      const [{ data: active }, { count: today }] = await Promise.all([
        supabase
          .from('quant_validation_runs')
          .select('id')
          .eq('status', 'running')
          .gte('created_at', new Date(now - STALE_RUN_MS).toISOString())
          .limit(1),
        supabase
          .from('quant_validation_runs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(now - 86400000).toISOString()),
      ]);
      if (active?.length) {
        return NextResponse.json(
          { error: 'A validation is already running. Wait for it to finish.' },
          { status: 429 },
        );
      }
      if ((today || 0) >= MAX_VALIDATIONS_PER_DAY) {
        return NextResponse.json(
          { error: `Daily limit of ${MAX_VALIDATIONS_PER_DAY} validations reached.` },
          { status: 429 },
        );
      }

      const { data: row, error: rErr } = await supabase
        .from('quant_validation_runs')
        .insert({
          user_id: user.id,
          strategy_id: strategyId,
          version_id: version.id,
          status: 'running',
          config,
          options,
          engine_version: ENGINE_VERSION,
          validation_version: VALIDATION_VERSION,
          spec_hash: version.spec_hash,
        })
        .select('id, created_at')
        .single();
      if (rErr) return safeErrorResponse(rErr, { context: 'quants/validations insert' });
      runId = row.id;

      /* Warm-up history must cover the slowest indicator of ANY combination. */
      let lookback = specLookback(spec);
      for (const params of buildGrid(options.axes)) {
        const applied = applyParamSet(spec, params);
        if (applied.ok) lookback = Math.max(lookback, specLookback(applied.spec));
      }
      const loaded = await loadRunBars(spec, config, lookback);
      const deadline = Date.now() + COMPUTE_BUDGET_MS;
      const report = runValidation({
        spec,
        config,
        bars: loaded.bars,
        benchmarkBars: loaded.benchmarkBars,
        options,
        shouldStop: () => Date.now() > deadline,
      });

      const best =
        report.sweep && report.sweep.bestIndex >= 0
          ? report.sweep.rows[report.sweep.bestIndex]
          : null;
      const summary = {
        inSampleSharpe: report.split.inSample.sharpe,
        outOfSampleSharpe: report.split.outOfSample.sharpe,
        outOfSampleReturn: report.split.outOfSample.totalReturn,
        walkForwardReturn: report.walkForward.combined?.totalReturn ?? null,
        walkForwardSharpe: report.walkForward.combined?.sharpe ?? null,
        profitableFolds: report.walkForward.profitableFolds,
        testedFolds: report.walkForward.testedFolds,
        combinations: report.sweep?.combinations ?? 0,
        deflatedSharpe: report.sweep?.deflatedSharpe ?? null,
        bestParams: best?.params ?? null,
      };
      const { warnings, coverage, ...rest } = report;
      const results = {
        ...rest,
        coverage,
        benchmark: spec.benchmark,
        version: version.version,
        axisLabels: Object.fromEntries(options.axes.map((a) => [a.path, a.label])),
      };
      const finished = {
        status: 'completed',
        summary,
        results,
        warnings,
        completed_at: new Date().toISOString(),
      };
      const { error: uErr } = await supabase
        .from('quant_validation_runs')
        .update(finished)
        .eq('id', runId);
      if (uErr) return safeErrorResponse(uErr, { context: 'quants/validations store' });

      return NextResponse.json(
        {
          validation: {
            id: runId,
            strategy_id: strategyId,
            version_id: version.id,
            config,
            options,
            engine_version: ENGINE_VERSION,
            validation_version: VALIDATION_VERSION,
            created_at: row.created_at,
            ...finished,
          },
        },
        NO_STORE,
      );
    } catch (err) {
      /* Engine and validation errors are written for the user. */
      const message = err instanceof Error ? err.message : 'The validation failed';
      if (runId) {
        await supabase
          .from('quant_validation_runs')
          .update({
            status: 'failed',
            error: message.slice(0, 500),
            completed_at: new Date().toISOString(),
          })
          .eq('id', runId);
        return NextResponse.json({ error: message, runId }, { status: 422, ...NO_STORE });
      }
      return safeErrorResponse(err, { context: 'quants/validations run' });
    }
  },
  { requireAuth: true, strict: true },
);
