import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/inside-capitol/bipartisan-trades?limit=4
 * Tickers with both Democrat and Republican purchases in the last 30 days.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit') || 4)));

    const baseUrl = new URL(request.url);
    const upstream = await fetch(`${baseUrl.origin}/api/fmp/congress-latest?raw=1&limit=400`);
    if (!upstream.ok) {
      return NextResponse.json({ trades: [] });
    }
    const data = await upstream.json();
    const trades = data.trades || [];

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ trades: [] });
    }

    const cutoff = new Date(Date.now() - 30 * 86400000);

    const byTicker = new Map();
    for (const t of trades) {
      const tradeDate = new Date(t.transactionDate || t.disclosureDate || 0);
      if (tradeDate < cutoff) continue;

      const typeStr = String(t.type || '').toLowerCase();
      if (!typeStr.includes('purchase') && !typeStr.includes('buy')) continue;

      const ticker = (t.ticker || t.symbol || '').toUpperCase();
      if (!ticker) continue;

      const party = String(t.party || '').toLowerCase();
      const amount = parseAmount(t.amountLow ?? t.amount, t.amountHigh);

      if (!byTicker.has(ticker)) {
        byTicker.set(ticker, {
          ticker,
          name: t.assetDescription || t.name || ticker,
          dems: 0,
          reps: 0,
          totalAmount: 0,
        });
      }
      const entry = byTicker.get(ticker);
      if (party.includes('dem')) entry.dems++;
      else if (party.includes('rep')) entry.reps++;
      entry.totalAmount += amount;
    }

    const bipartisan = [...byTicker.values()]
      .filter((e) => e.dems > 0 && e.reps > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit)
      .map((e) => ({
        ticker: e.ticker,
        name: e.name,
        dems: e.dems,
        reps: e.reps,
        total: formatMoney(e.totalAmount),
      }));

    return NextResponse.json({ trades: bipartisan });
  } catch (e) {
    console.error('[bipartisan-trades]', e);
    return NextResponse.json({ trades: [] });
  }
}

function parseAmount(low, high) {
  const lo = Number(low);
  const hi = Number(high);
  if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) return (lo + hi) / 2;
  if (Number.isFinite(lo)) return lo;
  if (Number.isFinite(hi)) return hi;
  return 0;
}

function formatMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
