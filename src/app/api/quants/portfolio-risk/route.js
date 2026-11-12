import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { MAX_PORTFOLIO_HOLDINGS, portfolioRisk, sectorExposure } from '@/lib/quants/risk';
import { FmpAPI } from '@/lib/services/fmp';
import { cleanTicker } from '@/lib/quants/strategy-spec';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const NO_STORE = { headers: { 'Cache-Control': 'private, no-store' } };
const BENCHMARK = 'SPY';
/** About one trading year, plus a holiday margin. */
const LOOKBACK_DAYS = 380;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * GET /api/quants/portfolio-risk
 * Risk of the caller's mock portfolio at today's weights, replayed over about
 * a year of daily returns. Reads the portfolio through RLS, so a user can only
 * ever see their own. Nothing is written.
 */
export const GET = withApiGuard(
  async (request, user) => {
    try {
      const { data, error } = await getUserClient()
        .from('mock_portfolios')
        .select('portfolio')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return safeErrorResponse(error, { context: 'quants/portfolio-risk read' });

      const raw = data?.portfolio?.positions;
      const all = [];
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [sym, p] of Object.entries(raw)) {
          const ticker = cleanTicker(p?.symbol || sym);
          const quantity = num(p?.qty);
          if (ticker && quantity > 0) {
            all.push({ ticker, quantity, rough: quantity * num(p?.currentPrice || p?.avgCost) });
          }
        }
      }
      if (!all.length) return NextResponse.json({ empty: true, reason: 'no_positions' }, NO_STORE);

      /* The largest positions carry the risk; the tail beyond the cap is named, not hidden. */
      all.sort((a, b) => b.rough - a.rough);
      const holdings = all.slice(0, MAX_PORTFOLIO_HOLDINGS);
      const beyondCap = all.slice(MAX_PORTFOLIO_HOLDINGS).map((h) => h.ticker);

      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10);
      const load = async (ticker) => {
        try {
          return (await getDailyBars(ticker, from, to)).candles || [];
        } catch {
          return [];
        }
      };
      const [benchmark, ...candles] = await Promise.all([
        load(BENCHMARK),
        ...holdings.map((h) => load(h.ticker)),
      ]);
      const series = {};
      holdings.forEach((h, i) => {
        series[h.ticker] = candles[i];
      });

      const report = portfolioRisk({
        holdings: holdings.map(({ ticker, quantity }) => ({ ticker, quantity })),
        cash: num(data?.portfolio?.cash),
        series,
        benchmark,
      });
      if (report.empty) {
        return NextResponse.json(
          { empty: true, reason: 'no_history', skipped: report.skipped },
          NO_STORE,
        );
      }
      /* Sector of each holding, from the cached company profile. A lookup
         that fails leaves that holding unclassified; it never blocks the report. */
      const sectorOf = {};
      await Promise.all(
        report.holdings.map(async (h) => {
          try {
            const profile = await FmpAPI.getCompanyProfile(h.ticker.replace(/\./g, '-'));
            const sector = typeof profile?.sector === 'string' ? profile.sector.trim() : '';
            if (sector) sectorOf[h.ticker] = sector;
          } catch {
            /* unclassified */
          }
        }),
      );
      const sectors = Object.keys(sectorOf).length ? sectorExposure(report.holdings, sectorOf) : [];
      return NextResponse.json({ ...report, sectors, benchmark: BENCHMARK, beyondCap }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/portfolio-risk' });
    }
  },
  { requireAuth: true },
);
