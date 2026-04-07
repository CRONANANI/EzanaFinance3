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

async function fetchWithRetry(url, cacheSeconds = 3600) {
  let res = await fetch(url, { next: { revalidate: cacheSeconds } });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, { cache: 'no-store' });
  }
  return res;
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
    // ONE call: FMP /quote returns price, marketCap, pe, eps, dividendsPerShare in one shot
    const quoteUrl = `${BASE}/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`;
    const quoteRes = await fetchWithRetry(quoteUrl, 300); // 5min cache for price data

    if (quoteRes.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment.', rateLimited: true,
          mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--', price: null },
        { status: 200 }
      );
    }

    let q = null;
    if (quoteRes.ok) {
      const raw = await quoteRes.json();
      q = Array.isArray(raw) ? raw[0] : raw;
    }

    // FMP quote response fields:
    // price, marketCap, pe, eps, earningsAnnouncement, sharesOutstanding
    // dividendsPerShare is not in quote — we compute yield from price if available

    const mcapNum = q?.marketCap ?? null;
    const pe      = q?.pe        ?? null;
    const eps     = q?.eps       ?? null;
    const price   = q?.price     ?? null;

    // Dividend yield: FMP quote has no dividendYield directly.
    // Use earningsAnnouncement as proxy or fetch from profile if needed.
    // For now show '--' — ratios call is too expensive to add here.
    // The KeyMetrics component can show it separately.
    const divYield = '--';

    return NextResponse.json({
      mcap:     fmtMarketCap(mcapNum),
      capType:  capType(mcapNum),
      pe:       pe  != null ? Number(pe).toFixed(2)  : '--',
      eps:      eps != null ? Number(eps).toFixed(2) : '--',
      divYield,
      price:    price != null ? Number(price) : null,
      // For the chart header price badge
      priceFormatted: price != null
        ? `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : null,
      symbol,
    });

  } catch (err) {
    console.error('[fmp/stock-stats]', err);
    return NextResponse.json(
      { error: err.message, mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' },
      { status: 200 }
    );
  }
}
