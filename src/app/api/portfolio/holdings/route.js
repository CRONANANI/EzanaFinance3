import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();

  const { data: accounts } = await supabase
    .from('unified_accounts')
    .select(
      'id, source_provider, institution_name, account_name, account_mask, account_type, balance_total, last_synced_at',
    )
    .eq('user_id', user.id);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({
      connected: false,
      aggregated: [],
      summary: null,
      accounts: [],
      providers: [],
    });
  }

  const { data: allPositions } = await supabase
    .from('unified_positions')
    .select(
      'account_id, source_provider, snapshot_date, ticker, name, quantity, avg_cost, aggregate_cost_basis, price, market_value, security_type, data_freshness',
    )
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false });

  const seen = new Set();
  const positions = [];
  for (const p of allPositions || []) {
    const key = `${p.account_id}::${p.ticker}`;
    if (seen.has(key)) continue;
    seen.add(key);
    positions.push(p);
  }

  const byTicker = {};
  for (const p of positions) {
    const ticker = p.ticker.toUpperCase();
    if (!byTicker[ticker]) {
      byTicker[ticker] = {
        ticker,
        name: p.name,
        totalQuantity: 0,
        totalValue: 0,
        totalCostBasis: 0,
        lastPrice: 0,
        providers: new Set(),
        freshness: 'realtime',
      };
    }
    const row = byTicker[ticker];
    row.totalQuantity += Number(p.quantity) || 0;
    row.totalValue += Number(p.market_value) || 0;
    row.totalCostBasis +=
      Number(p.aggregate_cost_basis) || (Number(p.avg_cost) || 0) * (Number(p.quantity) || 0);
    if (Number(p.price)) row.lastPrice = Number(p.price);
    row.providers.add(p.source_provider);
    if (p.data_freshness === 'end_of_day') row.freshness = 'end_of_day';
  }

  const aggregated = Object.values(byTicker).map((h) => ({
    ticker: h.ticker,
    name: h.name,
    totalQuantity: h.totalQuantity,
    totalValue: h.totalValue,
    totalCostBasis: h.totalCostBasis,
    lastPrice: h.lastPrice,
    gainLossPercent:
      h.totalCostBasis > 0 ? ((h.totalValue - h.totalCostBasis) / h.totalCostBasis) * 100 : 0,
    sector: '',
    providers: Array.from(h.providers),
    freshness: h.freshness,
  }));

  const totalValue = aggregated.reduce((s, h) => s + (h.totalValue || 0), 0);
  const totalCostBasis = aggregated.reduce((s, h) => s + (h.totalCostBasis || 0), 0);
  const totalGainLoss = totalValue - totalCostBasis;

  const providersUsed = Array.from(new Set(accounts.map((a) => a.source_provider)));

  return NextResponse.json({
    connected: true,
    aggregated,
    summary: {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent: totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      provider: a.source_provider,
      institutionName: a.institution_name,
      accountName: a.account_name,
      mask: a.account_mask,
      type: a.account_type,
      balance: a.balance_total,
      lastSyncedAt: a.last_synced_at,
    })),
    providers: providersUsed,
  });
}
