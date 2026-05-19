import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

async function fmpFetch(path, key) {
  const url = `${FMP_BASE}/${path}&apikey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? (data[0] ?? null) : data;
  } catch {
    return null;
  }
}

async function fmpFetchArray(path, key) {
  const url = `${FMP_BASE}/${path}&apikey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pct(v, decimals = 2) {
  const n = num(v);
  if (n === null) return null;
  const val = Math.abs(n) < 1 && Math.abs(n) > 0 ? n * 100 : n;
  return parseFloat(val.toFixed(decimals));
}

function fmtMcap(n) {
  if (n === null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

/**
 * Fetch comprehensive financial data for a single ticker.
 */
async function fetchTickerData(symbol, key) {
  const sym = encodeURIComponent(symbol);

  const [quote, profile, ratiosTtm, keyMetrics, growth] = await Promise.all([
    fmpFetch(`quote?symbol=${sym}`, key),
    fmpFetch(`profile?symbol=${sym}`, key),
    fmpFetch(`ratios-ttm?symbol=${sym}`, key),
    fmpFetch(`key-metrics-ttm?symbol=${sym}`, key),
    fmpFetch(`financial-growth?symbol=${sym}&limit=1`, key),
  ]);

  const price = num(quote?.price ?? profile?.price);
  const marketCap = num(quote?.marketCap ?? profile?.mktCap);
  const name = profile?.companyName || quote?.name || symbol;
  const sector = profile?.sector || null;
  const industry = profile?.industry || null;

  const ev = num(keyMetrics?.enterpriseValueTTM ?? profile?.enterpriseValue ?? null);

  const revenue = num(
    keyMetrics?.revenuePerShareTTM
      ? keyMetrics.revenuePerShareTTM * (quote?.sharesOutstanding || 0)
      : null,
  );
  const ebitda = num(
    keyMetrics?.ebitdaPerShareTTM
      ? keyMetrics.ebitdaPerShareTTM * (quote?.sharesOutstanding || 0)
      : null,
  );

  const pe = num(ratiosTtm?.peRatioTTM ?? quote?.pe);
  const pb = num(ratiosTtm?.priceToBookRatioTTM);
  const ps = num(ratiosTtm?.priceToSalesRatioTTM);
  const evRevenue = num(
    keyMetrics?.evToSalesTTM ?? (ev && revenue && revenue > 0 ? ev / revenue : null),
  );
  const evEbitda = num(
    keyMetrics?.evToEbitdaTTM ?? (ev && ebitda && ebitda > 0 ? ev / ebitda : null),
  );
  const evFcf = num(keyMetrics?.evToFreeCashFlowTTM);
  const fcfYield = num(keyMetrics?.freeCashFlowYieldTTM);
  const divYield = num(ratiosTtm?.dividendYieldTTM ?? profile?.lastDivYield);
  const eps = num(quote?.eps ?? ratiosTtm?.netIncomePerShareTTM);

  const grossMargin = pct(ratiosTtm?.grossProfitMarginTTM);
  const operatingMargin = pct(ratiosTtm?.operatingProfitMarginTTM);
  const netMargin = pct(ratiosTtm?.netProfitMarginTTM);

  const revenueGrowth = pct(growth?.revenueGrowth ?? ratiosTtm?.revenueGrowthTTM);
  const epsGrowth = pct(growth?.epsgrowth ?? growth?.epsGrowth);
  const ebitdaGrowth = pct(growth?.ebitdagrowth ?? growth?.ebitdaGrowth);

  return {
    symbol,
    name,
    sector,
    industry,
    price,
    marketCap,
    marketCapFormatted: fmtMcap(marketCap),
    ev,
    pe,
    pb,
    ps,
    evRevenue,
    evEbitda,
    evFcf,
    fcfYield: fcfYield != null ? parseFloat((fcfYield * 100).toFixed(2)) : null,
    divYield:
      divYield != null ? parseFloat((divYield > 1 ? divYield : divYield * 100).toFixed(2)) : null,
    eps,
    grossMargin,
    operatingMargin,
    netMargin,
    revenueGrowth,
    epsGrowth,
    ebitdaGrowth,
  };
}

/**
 * Compute peer-group statistics (median, p25, p75) for a given metric.
 */
function computeStats(peerData, field) {
  const values = peerData
    .map((p) => p[field])
    .filter((v) => v !== null && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (values.length === 0)
    return { median: null, p25: null, p75: null, min: null, max: null, count: 0 };

  const median = values[Math.floor(values.length / 2)];
  const p25 = values[Math.floor(values.length * 0.25)];
  const p75 = values[Math.floor(values.length * 0.75)];

  return {
    median: parseFloat(median.toFixed(2)),
    p25: parseFloat(p25.toFixed(2)),
    p75: parseFloat(p75.toFixed(2)),
    min: parseFloat(values[0].toFixed(2)),
    max: parseFloat(values[values.length - 1].toFixed(2)),
    count: values.length,
  };
}

/**
 * Determine where the target sits relative to peer distribution.
 */
function classifyPosition(targetValue, stats) {
  if (targetValue === null || stats.median === null)
    return { position: 'unknown', percentile: null };

  if (stats.p25 !== null && targetValue < stats.p25)
    return { position: 'discount', percentile: 'below 25th' };
  if (stats.p75 !== null && targetValue > stats.p75)
    return { position: 'premium', percentile: 'above 75th' };
  return { position: 'inline', percentile: '25th–75th' };
}

/**
 * Compute implied valuation by applying peer-median multiples to target financials.
 */
function computeImpliedValuation(target, peerStats) {
  const implied = [];

  if (peerStats.pe.median && target.eps) {
    implied.push({
      method: 'P/E × EPS',
      multiple: peerStats.pe.median,
      base: target.eps,
      impliedPrice: parseFloat((peerStats.pe.median * target.eps).toFixed(2)),
    });
  }

  if (peerStats.evRevenue.median && target.ev && target.evRevenue && target.price) {
    const ratio = target.evRevenue > 0 ? peerStats.evRevenue.median / target.evRevenue : 1;
    implied.push({
      method: 'EV/Revenue',
      multiple: peerStats.evRevenue.median,
      base: null,
      impliedPrice: parseFloat((target.price * ratio).toFixed(2)),
    });
  }

  if (peerStats.evEbitda.median && target.ev && target.evEbitda && target.price) {
    const ratio = target.evEbitda > 0 ? peerStats.evEbitda.median / target.evEbitda : 1;
    implied.push({
      method: 'EV/EBITDA',
      multiple: peerStats.evEbitda.median,
      base: null,
      impliedPrice: parseFloat((target.price * ratio).toFixed(2)),
    });
  }

  if (peerStats.pb.median && target.pb && target.price) {
    const ratio = target.pb > 0 ? peerStats.pb.median / target.pb : 1;
    implied.push({
      method: 'P/B',
      multiple: peerStats.pb.median,
      base: null,
      impliedPrice: parseFloat((target.price * ratio).toFixed(2)),
    });
  }

  if (implied.length === 0) return { methods: [], avgImpliedPrice: null, premiumDiscount: null };

  const avgImplied = implied.reduce((s, m) => s + m.impliedPrice, 0) / implied.length;
  const premiumDiscount = target.price ? ((target.price - avgImplied) / avgImplied) * 100 : null;

  return {
    methods: implied,
    avgImpliedPrice: parseFloat(avgImplied.toFixed(2)),
    premiumDiscount: premiumDiscount != null ? parseFloat(premiumDiscount.toFixed(1)) : null,
  };
}

function deriveVerdict(premiumDiscount) {
  if (premiumDiscount === null) return { verdict: 'insufficient_data', label: 'Insufficient Data' };
  if (premiumDiscount < -15) return { verdict: 'undervalued', label: 'Undervalued vs. Peers' };
  if (premiumDiscount > 15) return { verdict: 'overvalued', label: 'Overvalued vs. Peers' };
  return { verdict: 'fairly_valued', label: 'Fairly Valued' };
}

export async function GET(_req, context) {
  const symbol = String(context?.params?.symbol ?? '')
    .trim()
    .toUpperCase();
  if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  const fmpKey = getFmpKey();
  if (!fmpKey) {
    return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 503 });
  }

  try {
    const peersRes = await fmpFetchArray(
      `stock-peers?symbol=${encodeURIComponent(symbol)}`,
      fmpKey,
    );
    let peerSymbols = [];
    if (peersRes.length > 0) {
      const raw = peersRes[0]?.peersList ?? peersRes[0]?.peers ?? peersRes;
      peerSymbols = (Array.isArray(raw) ? raw : [])
        .map((p) =>
          typeof p === 'string' ? p.trim().toUpperCase() : (p?.symbol || '').toUpperCase(),
        )
        .filter((s) => s && s !== symbol)
        .slice(0, 8);
    }

    if (peerSymbols.length === 0) {
      return NextResponse.json(
        {
          error: `No peers found for ${symbol}. Try a large-cap US ticker.`,
        },
        { status: 404 },
      );
    }

    const allSymbols = [symbol, ...peerSymbols];
    const results = await Promise.all(allSymbols.map((s) => fetchTickerData(s, fmpKey)));

    const target = results[0];
    const peers = results.slice(1).filter((p) => p.price !== null);

    if (peers.length === 0) {
      return NextResponse.json({ error: 'Could not fetch peer data' }, { status: 404 });
    }

    const metrics = [
      'pe',
      'pb',
      'ps',
      'evRevenue',
      'evEbitda',
      'evFcf',
      'divYield',
      'grossMargin',
      'operatingMargin',
      'netMargin',
      'revenueGrowth',
    ];
    const peerStats = {};
    for (const m of metrics) {
      peerStats[m] = computeStats(peers, m);
    }

    const positions = {};
    for (const m of metrics) {
      positions[m] = classifyPosition(target[m], peerStats[m]);
    }

    const valuation = computeImpliedValuation(target, peerStats);
    const verdict = deriveVerdict(valuation.premiumDiscount);

    return NextResponse.json(
      {
        symbol,
        target,
        peers,
        peerStats,
        positions,
        valuation,
        verdict,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
      },
    );
  } catch (err) {
    console.error(`[comps] ${symbol} failed:`, err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
