/**
 * GET /api/org/quant-lab/risk            the council fund at today's weights
 * GET /api/org/quant-lab/risk?sample=1   the same, for the sample council's
 *                                        holdings (master admin and demo only)
 *
 * Feeds "Fund risk at today's weights" in the council tab of Quant Lab
 * (/for-the-quants). The holdings are the council's position book
 * (getOrgPositionBook, read as the signed-in member through the RLS-scoped
 * client and scoped to the member's own council). Each holding's daily
 * closes for about a year go through the lab's own risk engine
 * (portfolioRisk and replaySeries in src/lib/quants/risk.js, the engine the
 * mock portfolio's risk uses): historical simulation of today's weights,
 * against SPY. It is not the fund's own performance history. A holding
 * without enough price history is left out and named. Nothing is written.
 *
 * The sample variant reads no council records beyond the caller's own
 * membership: it takes the sample council's twelve holdings and their real
 * market closes, so the figures are real for those holdings and labelled
 * sample content on the page.
 */
import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildTradingDeskSample } from '@/lib/org-trading-desk-sample';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { MAX_PORTFOLIO_HOLDINGS, portfolioRisk, replaySeries } from '@/lib/quants/risk';
import { cleanTicker } from '@/lib/quants/strategy-spec';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const BENCHMARK = 'SPY';
/** About one trading year, plus a holiday margin. */
const LOOKBACK_DAYS = 380;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const supabase = getUserClient();
      const member = await getCurrentOrgMember(supabase);
      if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

      const wantSample = new URL(request.url).searchParams.get('sample') === '1';
      if (wantSample && !isCommunityDemoViewer(user)) {
        return NextResponse.json({ error: 'Not available' }, { status: 403 });
      }
      const book = wantSample
        ? buildTradingDeskSample({
            userId: member.user_id,
            memberId: member.id,
            role: member.role,
          }).book.positions
        : await getOrgPositionBook(supabase, member.org_id);

      const all = [];
      for (const p of book || []) {
        const ticker = cleanTicker(p.ticker || p.ticker_symbol);
        const quantity = num(p.shares);
        if (ticker && quantity > 0) all.push({ ticker, quantity, rough: num(p.value) });
      }
      if (!all.length) {
        return NextResponse.json({ empty: true, reason: 'no_positions' }, { headers: PRIVATE });
      }
      /* The largest positions carry the risk; the tail beyond the cap is named. */
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
      const input = {
        holdings: holdings.map(({ ticker, quantity }) => ({ ticker, quantity })),
        series,
        benchmark,
      };
      const report = portfolioRisk(input);
      if (report.empty) {
        return NextResponse.json(
          { empty: true, reason: 'no_history', skipped: report.skipped || [] },
          { headers: PRIVATE },
        );
      }
      return NextResponse.json(
        {
          ...report,
          replay: replaySeries(input),
          benchmark: BENCHMARK,
          beyondCap,
          sample: wantSample,
        },
        { headers: PRIVATE },
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'org/quant-lab/risk' });
    }
  },
  { requireAuth: true },
);
