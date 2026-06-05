import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { fetchAV } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

function computeReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 10) return null;
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);
  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let xVar = 0;
  let yVar = 0;
  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - xMean;
    const dy = ySlice[i] - yMean;
    num += dx * dy;
    xVar += dx * dx;
    yVar += dy * dy;
  }
  const denom = Math.sqrt(xVar * yVar);
  return denom > 0 ? parseFloat((num / denom).toFixed(4)) : 0;
}

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json();
      const tickers = (body.tickers || [])
        .map((t) => t.toUpperCase().trim())
        .filter(Boolean)
        .slice(0, 10);
      const days = Math.min(Math.max(body.days || 90, 20), 365);

      if (tickers.length < 2) {
        return NextResponse.json({ error: 'At least 2 tickers required' }, { status: 400 });
      }

      const priceMap = {};
      for (const ticker of tickers) {
        try {
          const data = await fetchAV(
            { function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: ticker, outputsize: 'compact' },
            600,
          );
          const ts = data?.['Time Series (Daily)'];
          if (!ts) continue;
          const sorted = Object.entries(ts)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-days);
          priceMap[ticker] = sorted.map(([, v]) =>
            parseFloat(v['5. adjusted close'] || v['4. close']),
          );
        } catch {
          continue;
        }
      }

      const validTickers = tickers.filter((t) => priceMap[t]?.length > 20);
      if (validTickers.length < 2) {
        return NextResponse.json({ error: 'Not enough valid price data' }, { status: 404 });
      }

      const returnsMap = {};
      for (const t of validTickers) returnsMap[t] = computeReturns(priceMap[t]);

      const matrix = {};
      for (const a of validTickers) {
        matrix[a] = {};
        for (const b of validTickers) {
          matrix[a][b] = a === b ? 1.0 : pearsonCorrelation(returnsMap[a], returnsMap[b]);
        }
      }

      return NextResponse.json(
        { tickers: validTickers, matrix, days },
        { headers: { 'Cache-Control': 'public, s-maxage=600' } },
      );
    } catch (err) {
      return NextResponse.json({ error: err?.message }, { status: 500 });
    }
  },
  { requireAuth: true },
);
