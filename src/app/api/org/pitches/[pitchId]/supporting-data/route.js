import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { FmpAPI } from '@/lib/services/fmp';
import { getPitchContext, fetchPitchRaw } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const symbol = pitch.ticker;
    try {
      const [profile, quote, income, balance, cashflow, metrics, dcf, rating, peers] =
        await Promise.all([
          FmpAPI.getCompanyProfile(symbol),
          FmpAPI.getQuote(symbol),
          FmpAPI.getIncomeStatement(symbol, 'annual', 3),
          FmpAPI.getBalanceSheet(symbol, 'annual', 3),
          FmpAPI.getCashFlow(symbol, 'annual', 3),
          FmpAPI.getKeyMetrics(symbol, 'annual', 3),
          FmpAPI.getDCF(symbol),
          FmpAPI.getRating(symbol),
          FmpAPI.getStockPeers(symbol),
        ]);

      return NextResponse.json({
        symbol,
        profile,
        quote,
        income: income || [],
        balance: balance || [],
        cashflow: cashflow || [],
        metrics: metrics || [],
        dcf,
        rating,
        peers: peers || [],
      });
    } catch (e) {
      return NextResponse.json({ error: e.message || 'FMP fetch failed' }, { status: 502 });
    }
  },
  { requireAuth: true },
);
