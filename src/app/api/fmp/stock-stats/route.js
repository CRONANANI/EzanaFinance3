import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

function fmtMarketCap(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '--';
  const num = Number(n);
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(0)}M`;
  return `$${num.toLocaleString()}`;
}

function capType(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '--';
  const num = Number(n);
  if (num >= 200e9) return 'Mega Cap';
  if (num >= 10e9) return 'Large Cap';
  if (num >= 2e9) return 'Mid Cap';
  return 'Small Cap';
}

/** FMP often returns dividend yield as decimal (e.g. 0.045 = 4.5%) */
function fmtDivYield(raw) {
  if (raw == null || raw === '' || Number.isNaN(Number(raw))) return '--';
  const n = Number(raw);
  const pct = n > 1 ? n : n * 100;
  return `${pct.toFixed(2)}%`;
}

async function fetchWithRetry(url, cacheSeconds = 300) {
  let res = await fetch(url, { next: { revalidate: cacheSeconds } });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, { cache: 'no-store' });
  }
  return res;
}

async function fmpFirstObject(url) {
  const res = await fetchWithRetry(url, 300);
  if (!res.ok) return null;
  const raw = await res.json();
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw && typeof raw === 'object' ? raw : null;
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

  const key = encodeURIComponent(FMP_KEY);
  const sym = encodeURIComponent(symbol);

  try {
    const quoteUrl = `${BASE}/quote?symbol=${sym}&apikey=${key}`;
    const profileUrl = `${BASE}/profile?symbol=${sym}&apikey=${key}`;
    const ratiosUrl = `${BASE}/ratios-ttm?symbol=${sym}&apikey=${key}`;

    const [quoteRes, profileRes, ratiosRes] = await Promise.all([
      fetchWithRetry(quoteUrl, 300),
      fetchWithRetry(profileUrl, 3600),
      fetchWithRetry(ratiosUrl, 3600),
    ]);

    if (quoteRes.status === 429 && profileRes.status === 429 && ratiosRes.status === 429) {
      return NextResponse.json(
        {
          error: 'Rate limit reached. Please wait a moment.',
          rateLimited: true,
          mcap: '--',
          pe: '--',
          divYield: '--',
          eps: '--',
          capType: '--',
          price: null,
        },
        { status: 200 }
      );
    }

    const parse = async (res) => {
      if (!res.ok) return null;
      const raw = await res.json();
      if (Array.isArray(raw)) return raw[0] ?? null;
      return raw && typeof raw === 'object' ? raw : null;
    };

    const [q, prof, ratios] = await Promise.all([
      parse(quoteRes),
      parse(profileRes),
      parse(ratiosRes),
    ]);

    const mcapNum =
      q?.marketCap ??
      q?.market_cap ??
      prof?.mktCap ??
      prof?.marketCap ??
      null;

    const price = q?.price ?? prof?.price ?? null;

    const pe =
      q?.pe ??
      q?.peRatio ??
      ratios?.peRatioTTM ??
      ratios?.priceEarningsRatioTTM ??
      ratios?.peRatio ??
      null;

    const eps =
      q?.eps ??
      ratios?.netIncomePerShareTTM ??
      ratios?.epsTTM ??
      ratios?.eps ??
      null;

    let divYieldStr = '--';
    const divRaw =
      ratios?.dividendYieldTTM ??
      ratios?.dividendYield ??
      prof?.dividendYield ??
      prof?.lastDivYield ??
      null;

    if (divRaw != null && !Number.isNaN(Number(divRaw))) {
      divYieldStr = fmtDivYield(divRaw);
    } else if (prof?.lastDiv != null && price != null && Number(price) > 0) {
      const y = (Number(prof.lastDiv) / Number(price)) * 100;
      if (!Number.isNaN(y)) divYieldStr = `${y.toFixed(2)}%`;
    }

    return NextResponse.json({
      mcap: fmtMarketCap(mcapNum),
      capType: capType(mcapNum),
      pe: pe != null && !Number.isNaN(Number(pe)) ? Number(pe).toFixed(2) : '--',
      eps: eps != null && !Number.isNaN(Number(eps)) ? Number(eps).toFixed(2) : '--',
      divYield: divYieldStr,
      price: price != null ? Number(price) : null,
      priceFormatted:
        price != null
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
