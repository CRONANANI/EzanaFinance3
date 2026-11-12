import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { validateSpec } from '@/lib/quants/strategy-spec';
import { MAX_STRATEGIES, NO_STORE, RUN_SUMMARY_COLUMNS, specHash } from '@/lib/quants/lab-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cleanName = (v) =>
  String(v || '')
    .trim()
    .slice(0, 80);

/**
 * GET /api/quants/strategies
 * The caller's strategies, newest first, each with its latest version's spec
 * and the summary of its most recent backtest. RLS scopes every read to the
 * caller; the user id is never taken from the request.
 */
export const GET = withApiGuard(
  async () => {
    try {
      const supabase = getUserClient();
      const { data: strategies, error } = await supabase
        .from('quant_strategies')
        .select('id, name, description, status, latest_version, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(MAX_STRATEGIES);
      if (error) return safeErrorResponse(error, { context: 'quants/strategies list' });
      const ids = (strategies || []).map((s) => s.id);
      if (!ids.length) return NextResponse.json({ strategies: [] }, NO_STORE);

      const [versionsRes, runsRes] = await Promise.all([
        supabase
          .from('quant_strategy_versions')
          .select('id, strategy_id, version, spec, backtestable, created_at')
          .in('strategy_id', ids)
          .order('version', { ascending: false }),
        supabase
          .from('quant_backtest_runs')
          .select(RUN_SUMMARY_COLUMNS)
          .in('strategy_id', ids)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);
      const latestVersion = new Map();
      for (const v of versionsRes.data || []) {
        if (!latestVersion.has(v.strategy_id)) latestVersion.set(v.strategy_id, v);
      }
      const latestRun = new Map();
      for (const r of runsRes.data || []) {
        if (!latestRun.has(r.strategy_id)) latestRun.set(r.strategy_id, r);
      }
      return NextResponse.json(
        {
          strategies: strategies.map((s) => ({
            ...s,
            version: latestVersion.get(s.id) || null,
            latestRun: latestRun.get(s.id) || null,
          })),
        },
        NO_STORE,
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/strategies list' });
    }
  },
  { requireAuth: true },
);

/**
 * POST /api/quants/strategies  { name, description?, spec }
 * Creates the strategy and its version 1.
 */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const name = cleanName(body?.name);
      if (!name) return NextResponse.json({ error: 'Give the strategy a name' }, { status: 400 });
      const checked = validateSpec(body?.spec);
      if (!checked.ok) {
        return NextResponse.json(
          { error: 'The strategy definition is not valid', details: checked.errors },
          { status: 400 },
        );
      }
      const supabase = getUserClient();
      const { count } = await supabase
        .from('quant_strategies')
        .select('id', { count: 'exact', head: true });
      if ((count || 0) >= MAX_STRATEGIES) {
        return NextResponse.json(
          {
            error: `You can keep up to ${MAX_STRATEGIES} strategies. Archive or delete one first.`,
          },
          { status: 409 },
        );
      }
      const { data: strategy, error } = await supabase
        .from('quant_strategies')
        .insert({
          user_id: user.id,
          name,
          description: String(body?.description || '').slice(0, 2000) || null,
        })
        .select('id, name, description, status, latest_version, created_at, updated_at')
        .single();
      if (error) return safeErrorResponse(error, { context: 'quants/strategies create' });

      const { data: version, error: vErr } = await supabase
        .from('quant_strategy_versions')
        .insert({
          strategy_id: strategy.id,
          user_id: user.id,
          version: 1,
          spec: checked.spec,
          spec_hash: specHash(checked.spec),
          backtestable: checked.unsupported.length === 0,
        })
        .select('id, strategy_id, version, spec, backtestable, created_at')
        .single();
      if (vErr) {
        await supabase.from('quant_strategies').delete().eq('id', strategy.id);
        return safeErrorResponse(vErr, { context: 'quants/strategies create version' });
      }
      return NextResponse.json(
        { strategy: { ...strategy, version, latestRun: null }, unsupported: checked.unsupported },
        { status: 201, ...NO_STORE },
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/strategies create' });
    }
  },
  { requireAuth: true, strict: true },
);
