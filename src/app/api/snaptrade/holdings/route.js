import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { getSnapTradeClient, getSnapTradeCreds, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const creds = await getSnapTradeCreds(user.id);
    if (!creds) return NextResponse.json({ connected: false, aggregated: [] });

    const supabase = getAdminClient();
    const { data: accounts } = await supabase
      .from('snaptrade_accounts')
      .select('snaptrade_account_id, account_name, institution_name')
      .eq('user_id', user.id);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ connected: false, aggregated: [] });
    }

    const snaptrade = getSnapTradeClient();

    const positionsByAccount = await Promise.all(
      accounts.map(async (a) => {
        try {
          const res = await snaptrade.accountInformation.getUserAccountPositions({
            userId: creds.userId,
            userSecret: creds.userSecret,
            accountId: a.snaptrade_account_id,
          });
          return res.data || [];
        } catch (e) {
          const info = readSnapTradeError(e);
          console.warn('[snaptrade/holdings] positions failed', a.snaptrade_account_id, info);
          return [];
        }
      }),
    );

    const byTicker = {};
    for (const positions of positionsByAccount) {
      for (const p of positions) {
        const sym =
          p.symbol?.symbol?.raw_symbol || p.symbol?.symbol?.symbol || p.symbol?.raw_symbol;
        if (!sym) continue;
        const ticker = sym.toUpperCase();
        const qty = Number(p.units || 0);
        const price = Number(p.price || 0);
        const value = qty * price;
        const avgCost = Number(p.average_purchase_price || 0);
        const costBasis = avgCost * qty;
        const name = p.symbol?.symbol?.description || p.symbol?.description || ticker;
        if (!byTicker[ticker]) {
          byTicker[ticker] = {
            ticker,
            name,
            totalQuantity: 0,
            totalValue: 0,
            totalCostBasis: 0,
            lastPrice: 0,
          };
        }
        byTicker[ticker].totalQuantity += qty;
        byTicker[ticker].totalValue += value;
        byTicker[ticker].totalCostBasis += costBasis;
        byTicker[ticker].lastPrice = price;
      }
    }

    const aggregated = Object.values(byTicker).map((h) => ({
      ...h,
      gainLossPercent:
        h.totalCostBasis > 0 ? ((h.totalValue - h.totalCostBasis) / h.totalCostBasis) * 100 : 0,
      sector: '',
    }));

    const totalValue = aggregated.reduce((s, h) => s + (h.totalValue || 0), 0);
    const totalCostBasis = aggregated.reduce((s, h) => s + (h.totalCostBasis || 0), 0);
    const totalGainLoss = totalValue - totalCostBasis;

    return NextResponse.json({
      connected: true,
      aggregated,
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent: totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
      },
    });
  } catch (err) {
    const info = readSnapTradeError(err);
    console.error('[snaptrade/holdings]', info);
    return NextResponse.json(
      { error: 'Something went wrong.', code: 'snaptrade_failed' },
      { status: 502 },
    );
  }
}
