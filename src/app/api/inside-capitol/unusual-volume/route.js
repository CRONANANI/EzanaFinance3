import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/inside-capitol/unusual-volume?limit=3
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit') || 3)));

    const baseUrl = new URL(request.url);
    const upstream = await fetch(`${baseUrl.origin}/api/fmp/congress-latest?raw=1&limit=500`);
    if (!upstream.ok) {
      return NextResponse.json({ unusual: [] });
    }
    const data = await upstream.json();
    const trades = data.trades || [];

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ unusual: [] });
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);

    const byPolitician = new Map();
    for (const t of trades) {
      const name = t.name || t.representative || '';
      if (!name) continue;
      const tradeDate = new Date(t.transactionDate || t.disclosureDate || 0);
      if (tradeDate < fourWeeksAgo) continue;

      if (!byPolitician.has(name)) {
        byPolitician.set(name, {
          name,
          party: t.party || 'Unknown',
          weekTrades: 0,
          monthTrades: 0,
          totalAmount: 0,
          tickers: new Set(),
        });
      }
      const entry = byPolitician.get(name);
      entry.monthTrades++;
      if (tradeDate >= oneWeekAgo) entry.weekTrades++;
      entry.totalAmount += parseAmount(t.amountLow ?? t.amount, t.amountHigh);
      if (t.ticker) entry.tickers.add(t.ticker);
    }

    const unusual = [...byPolitician.values()]
      .map((p) => ({
        ...p,
        avgWeek: p.monthTrades / 4,
        unusualness: p.weekTrades / Math.max(1, p.monthTrades / 4),
      }))
      .filter((p) => p.unusualness >= 1.5 && p.weekTrades >= 2)
      .sort((a, b) => b.unusualness - a.unusualness)
      .slice(0, limit)
      .map((p) => ({
        slug: p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: p.name,
        initials: p.name
          .split(' ')
          .map((s) => s[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        party:
          String(p.party || '').toLowerCase().includes('dem')
            ? 'Democrat'
            : String(p.party || '').toLowerCase().includes('rep')
              ? 'Republican'
              : 'Unknown',
        tradesWeek: p.weekTrades,
        avgWeek: Math.max(1, Math.round(p.avgWeek)),
        total: formatMoney(p.totalAmount),
        top: [...p.tickers].slice(0, 3),
      }));

    return NextResponse.json({ unusual });
  } catch (e) {
    console.error('[unusual-volume]', e);
    return NextResponse.json({ unusual: [] });
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
