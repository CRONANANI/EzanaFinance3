/**
 * GET /api/strategies/[slug] : one Strategy Desk strategy with its backtest
 * summary and verification checks, computed on the server from stored data
 * (lib/strategies). Individual bets are not returned: only the summary, the
 * equity curve and the checks, so the strategy's selections stay proprietary.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { strategyBySlug } from '@/lib/strategies/catalog';
import { summarise, verify } from '@/lib/strategies/metrics';

export const revalidate = 3600;

async function runBacktest(strategy) {
  if (!strategy.backtest || !isServerSupabaseConfigured()) return null;
  const client = getAdminClient();
  if (strategy.backtest.kind === 'pm-late-favourite') {
    const p = strategy.backtest.params;
    const { data, error } = await client.rpc('strategy_pm_late_favourite', {
      p_min_price: p.minPrice,
      p_max_price: p.maxPrice,
      p_hours: p.hours,
      p_min_liquidity: p.minLiquidity,
    });
    if (error) throw new Error(error.message);
    return (data || []).map((r) => ({ at: r.entry_at, price: Number(r.price), won: Boolean(r.won) }));
  }
  return null;
}

export async function GET(request, { params }) {
  const rl = await checkRateLimit(`strat:${getClientIp(request)}`, { interval: 60000, limit: 30 });
  if (!rl.success) return rateLimitResponse(rl);

  const strategy = strategyBySlug(params.slug);
  if (!strategy) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  /* Two records. The research backtest counts every bet the data holds. The
     forward record counts only bets after the rules were fixed; that is the
     one the Verified badge is judged on, so rules cannot be tuned to it. */
  let research = null;
  let forward = null;
  let checks = null;
  const thin = (sum, bets) => {
    const step = Math.max(1, Math.ceil(sum.curve.length / 200));
    return {
      ...sum,
      curve: sum.curve.filter((_, i) => i % step === 0 || i === sum.curve.length - 1),
      from: bets[0]?.at || null,
      to: bets[bets.length - 1]?.at || null,
    };
  };
  try {
    const bets = await runBacktest(strategy);
    if (bets) {
      research = thin(summarise(bets, { feeRate: strategy.feeRate }), bets);
      const frozen = strategy.rulesFrozenAt;
      const after = frozen ? bets.filter((b) => String(b.at).slice(0, 10) >= frozen) : [];
      const fwd = summarise(after, { feeRate: strategy.feeRate });
      forward = thin(fwd, after);
      checks = verify(fwd, {
        rulesFrozenAt: frozen,
        firstBetAt: after.length ? String(after[0].at).slice(0, 10) : null,
      });
    }
  } catch (e) {
    console.warn(`[strategies] ${strategy.slug}: ${e.message}`);
  }

  return NextResponse.json(
    { ok: true, strategy, research, forward, checks },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
