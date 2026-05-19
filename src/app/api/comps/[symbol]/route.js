import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

/**
 * Fetch a single object from FMP. Returns null on any failure.
 */
async function fmpFetch(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[comps] FMP ${res.status}: ${url.replace(/apikey=[^&]+/, 'apikey=***')}`);
      return null;
    }
    const data = await res.json();
    if (Array.isArray(data)) return data[0] ?? null;
    return data && typeof data === 'object' ? data : null;
  } catch (err) {
    console.warn('[comps] FMP fetch failed:', err?.message);
    return null;
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtMcap(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

/** Small delay to avoid FMP rate limits. */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch data for one ticker using only endpoints confirmed working on the current plan:
 * quote, profile, ratios-ttm. Three calls per ticker instead of five.
 */
async function fetchTickerData(symbol, key) {
  const sym = encodeURIComponent(symbol);
  const k = encodeURIComponent(key);

  const [quote, profile, ratios] = await Promise.all([
    fmpFetch(`${FMP_BASE}/quote?symbol=${sym}&apikey=${k}`),
    fmpFetch(`${FMP_BASE}/profile?symbol=${sym}&apikey=${k}`),
    fmpFetch(`${FMP_BASE}/ratios-ttm?symbol=${sym}&apikey=${k}`),
  ]);

  const price = num(quote?.price ?? profile?.price);
  const marketCap = num(quote?.marketCap ?? profile?.mktCap);
  const name = profile?.companyName || quote?.name || symbol;
  const sector = profile?.sector || null;
  const industry = profile?.industry || null;
  const eps = num(quote?.eps ?? ratios?.netIncomePerShareTTM);

  const pe = num(ratios?.peRatioTTM ?? quote?.pe);
  const pb = num(ratios?.priceToBookRatioTTM);
  const ps = num(ratios?.priceToSalesRatioTTM);
  const evRevenue = num(ratios?.enterpriseValueOverRevenueTTM ?? ratios?.evToSalesTTM);
  const evEbitda = num(ratios?.enterpriseValueOverEBITDATTM ?? ratios?.evToEbitdaTTM);
  const divYield = num(ratios?.dividendYieldTTM ?? profile?.lastDivYield);
  const fcfYield = num(ratios?.freeCashFlowYieldTTM);

  const grossMargin = num(ratios?.grossProfitMarginTTM);
  const operatingMargin = num(ratios?.operatingProfitMarginTTM);
  const netMargin = num(ratios?.netProfitMarginTTM);
  const revenueGrowth = num(ratios?.revenueGrowthTTM);

  const toPct = (v) => {
    if (v === null) return null;
    const pct = Math.abs(v) <= 1 ? v * 100 : v;
    return parseFloat(pct.toFixed(1));
  };

  return {
    symbol,
    name,
    sector,
    industry,
    price,
    marketCap,
    marketCapFormatted: fmtMcap(marketCap),
    pe,
    pb,
    ps,
    evRevenue: evRevenue != null ? parseFloat(evRevenue.toFixed(2)) : null,
    evEbitda: evEbitda != null ? parseFloat(evEbitda.toFixed(2)) : null,
    divYield:
      divYield != null ? parseFloat((divYield > 1 ? divYield : divYield * 100).toFixed(2)) : null,
    fcfYield: fcfYield != null ? parseFloat((fcfYield * 100).toFixed(2)) : null,
    eps,
    grossMargin: toPct(grossMargin),
    operatingMargin: toPct(operatingMargin),
    netMargin: toPct(netMargin),
    revenueGrowth: toPct(revenueGrowth),
  };
}

function computeStats(peerData, field) {
  const values = peerData
    .map((p) => p[field])
    .filter((v) => v !== null && v !== undefined && Number.isFinite(v))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return { median: null, p25: null, p75: null, min: null, max: null, count: 0 };
  }

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

function classifyPosition(targetValue, stats) {
  if (targetValue === null || !stats || stats.median === null) {
    return { position: 'unknown', percentile: null };
  }
  if (stats.p25 !== null && targetValue < stats.p25)
    return { position: 'discount', percentile: 'below 25th' };
  if (stats.p75 !== null && targetValue > stats.p75)
    return { position: 'premium', percentile: 'above 75th' };
  return { position: 'inline', percentile: '25th–75th' };
}

function computeImpliedValuation(target, peerStats) {
  const implied = [];

  if (peerStats.pe?.median && target.eps && target.eps > 0) {
    implied.push({
      method: 'P/E × EPS',
      multiple: peerStats.pe.median,
      impliedPrice: parseFloat((peerStats.pe.median * target.eps).toFixed(2)),
    });
  }

  if (peerStats.evRevenue?.median && target.evRevenue && target.evRevenue > 0 && target.price) {
    const ratio = peerStats.evRevenue.median / target.evRevenue;
    implied.push({
      method: 'EV/Revenue',
      multiple: peerStats.evRevenue.median,
      impliedPrice: parseFloat((target.price * ratio).toFixed(2)),
    });
  }

  if (peerStats.evEbitda?.median && target.evEbitda && target.evEbitda > 0 && target.price) {
    const ratio = peerStats.evEbitda.median / target.evEbitda;
    implied.push({
      method: 'EV/EBITDA',
      multiple: peerStats.evEbitda.median,
      impliedPrice: parseFloat((target.price * ratio).toFixed(2)),
    });
  }

  if (peerStats.pb?.median && target.pb && target.pb > 0 && target.price) {
    const ratio = peerStats.pb.median / target.pb;
    implied.push({
      method: 'P/B',
      multiple: peerStats.pb.median,
      impliedPrice: parseFloat((target.price * ratio).toFixed(2)),
    });
  }

  if (implied.length === 0) return { methods: [], avgImpliedPrice: null, premiumDiscount: null };

  const avgImplied = implied.reduce((s, m) => s + m.impliedPrice, 0) / implied.length;
  const premiumDiscount =
    target.price && target.price > 0 ? ((target.price - avgImplied) / avgImplied) * 100 : null;

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

/**
 * GET /api/comps/[symbol]
 */
export async function GET(_req, context) {
  const symbol = String(context?.params?.symbol ?? '')
    .trim()
    .toUpperCase();
  if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  const fmpKey = getFmpKey();
  if (!fmpKey) {
    return NextResponse.json(
      { error: 'FMP_API_KEY not configured. Set it in Vercel environment variables.' },
      { status: 503 },
    );
  }

  try {
    console.log(`[comps] ${symbol}: starting`);

    const peersUrl = `${FMP_BASE}/stock-peers?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(fmpKey)}`;
    const peersRaw = await fmpFetch(peersUrl);

    let peerSymbols = [];
    if (peersRaw) {
      const rawList = peersRaw.peersList || peersRaw.peers || [];
      peerSymbols = (Array.isArray(rawList) ? rawList : [])
        .map((p) =>
          typeof p === 'string' ? p.trim().toUpperCase() : (p?.symbol || '').toUpperCase(),
        )
        .filter((s) => s && s !== symbol && /^[A-Z]{1,10}$/.test(s))
        .slice(0, 8);
    }

    console.log(`[comps] ${symbol}: found ${peerSymbols.length} peers: ${peerSymbols.join(', ')}`);

    if (peerSymbols.length === 0) {
      return NextResponse.json(
        {
          error: `No peers found for ${symbol}. Try a large-cap US ticker (AAPL, MSFT, NVDA, TSLA).`,
        },
        { status: 404 },
      );
    }

    const target = await fetchTickerData(symbol, fmpKey);
    console.log(
      `[comps] ${symbol}: target price=${target.price}, pe=${target.pe}, evEbitda=${target.evEbitda}`,
    );

    if (target.price === null) {
      return NextResponse.json(
        {
          error: `Could not fetch market data for ${symbol}. The ticker may be invalid or delisted.`,
        },
        { status: 404 },
      );
    }

    const peers = [];
    for (const peerSym of peerSymbols) {
      await sleep(200);
      try {
        const peerData = await fetchTickerData(peerSym, fmpKey);
        if (peerData.price !== null) {
          peers.push(peerData);
        } else {
          console.warn(`[comps] ${peerSym}: no price data, skipping`);
        }
      } catch (err) {
        console.warn(`[comps] ${peerSym}: fetch failed:`, err?.message);
      }
    }

    console.log(`[comps] ${symbol}: ${peers.length} peers with data`);

    if (peers.length === 0) {
      return NextResponse.json(
        {
          error: `Could not fetch financial data for any peers of ${symbol}. FMP may be rate-limiting.`,
        },
        { status: 404 },
      );
    }

    const metricKeys = [
      'pe',
      'pb',
      'ps',
      'evRevenue',
      'evEbitda',
      'divYield',
      'grossMargin',
      'operatingMargin',
      'netMargin',
      'revenueGrowth',
    ];
    const peerStats = {};
    for (const m of metricKeys) {
      peerStats[m] = computeStats(peers, m);
    }

    const positions = {};
    for (const m of metricKeys) {
      positions[m] = classifyPosition(target[m], peerStats[m]);
    }

    const valuation = computeImpliedValuation(target, peerStats);
    const verdict = deriveVerdict(valuation.premiumDiscount);

    console.log(
      `[comps] ${symbol}: verdict=${verdict.verdict}, premium/discount=${valuation.premiumDiscount}%`,
    );

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
    return NextResponse.json(
      {
        error: `Analysis failed for ${symbol}: ${err?.message || 'Unknown error'}. Check Vercel logs for "[comps]" entries.`,
      },
      { status: 500 },
    );
  }
}
