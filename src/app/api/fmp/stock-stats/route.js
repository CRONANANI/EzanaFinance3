import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE    = 'https://financialmodelingprep.com/stable';

function fmtMarketCap(n) {
  if (!n || isNaN(n)) return '--';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${Number(n).toLocaleString()}`;
}

function capType(n) {
  if (!n || isNaN(n)) return '--';
  if (n >= 200e9) return 'Mega Cap';
  if (n >= 10e9)  return 'Large Cap';
  if (n >= 2e9)   return 'Mid Cap';
  return 'Small Cap';
}

export async function GET(request) {
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }

  try {
    // Fetch key-metrics and ratios in parallel — both give us what we need
    const [metricsRes, ratiosRes, mcapRes] = await Promise.all([
      fetch(`${BASE}/key-metrics?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`, { next: { revalidate: 3600 } }),
      fetch(`${BASE}/ratios?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`,      { next: { revalidate: 3600 } }),
      fetch(`${BASE}/historical-market-capitalization?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`, { next: { revalidate: 3600 } }),
    ]);

    const metricsRaw = metricsRes.ok ? await metricsRes.json() : [];
    const ratiosRaw  = ratiosRes.ok  ? await ratiosRes.json()  : [];
    const mcapRaw    = mcapRes.ok    ? await mcapRes.json()    : [];

    // Use most recent entry (index 0)
    const m = Array.isArray(metricsRaw) ? metricsRaw[0] : null;
    const r = Array.isArray(ratiosRaw)  ? ratiosRaw[0]  : null;
    const latestMcap = Array.isArray(mcapRaw) && mcapRaw.length > 0
      ? mcapRaw.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marketCap
      : null;

    // Market cap — prefer historical (most accurate), fall back to key-metrics
    const mcapNum = latestMcap ?? m?.marketCap ?? null;

    // P/E ratio
    const pe = r?.priceToEarningsRatio ?? m?.peRatio ?? null;

    // Dividend yield — ratios returns it as a decimal (0.004), convert to %
    const divYieldRaw = r?.dividendYield ?? r?.dividendYieldPercentage ?? null;
    const divYield = divYieldRaw != null
      ? (divYieldRaw < 1 ? (divYieldRaw * 100).toFixed(2) + '%' : divYieldRaw.toFixed(2) + '%')
      : '--';

    // EPS — net income per share from ratios
    const eps = r?.netIncomePerShare ?? m?.netIncomePerShare ?? null;

    return NextResponse.json({
      mcap:    fmtMarketCap(mcapNum),
      capType: capType(mcapNum),
      pe:      pe    != null ? Number(pe).toFixed(2)  : '--',
      divYield,
      eps:     eps   != null ? Number(eps).toFixed(2) : '--',
      // Extra metrics for tooltips
      pbRatio:          r?.priceToBookRatio        != null ? Number(r.priceToBookRatio).toFixed(2)        : '--',
      psRatio:          r?.priceToSalesRatio        != null ? Number(r.priceToSalesRatio).toFixed(2)       : '--',
      roe:              m?.returnOnEquity           != null ? (Number(m.returnOnEquity) * 100).toFixed(1) + '%' : '--',
      netMargin:        r?.netProfitMargin          != null ? (Number(r.netProfitMargin) * 100).toFixed(1) + '%' : '--',
      grossMargin:      r?.grossProfitMargin        != null ? (Number(r.grossProfitMargin) * 100).toFixed(1) + '%' : '--',
      debtToEquity:     r?.debtToEquityRatio        != null ? Number(r.debtToEquityRatio).toFixed(2)       : '--',
      currentRatio:     r?.currentRatio             != null ? Number(r.currentRatio).toFixed(2)            : '--',
      evToEbitda:       m?.evToEBITDA               != null ? Number(m.evToEBITDA).toFixed(2)              : '--',
      freeCashFlowYield:m?.freeCashFlowYield        != null ? (Number(m.freeCashFlowYield) * 100).toFixed(2) + '%' : '--',
      symbol,
      period: m?.period ?? '--',
      fiscalYear: m?.fiscalYear ?? '--',
    });

  } catch (err) {
    console.error('[fmp/stock-stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
