import { NextResponse } from 'next/server';
import { FmpAPI } from '@/lib/services/fmp';
import { getPitchRaw } from '@/lib/org-pitch-store';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const pitch = getPitchRaw(params.pitchId);
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
}
