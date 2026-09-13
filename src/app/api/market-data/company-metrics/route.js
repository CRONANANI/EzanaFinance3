import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

/* Read at request time, not module load — same reasoning as stock-candles:
   capturing process.env at build bakes in a stale/empty key on Vercel. */
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const BASE = 'https://financialmodelingprep.com/stable';

/* Mirror stock-candles' resilience: 403 → retry with a header key,
   429 → one delayed retry. */
async function fetchWithRetry(url, apiKey, opts = {}) {
  let res = await fetch(url, opts);

  if (res.status === 403 && apiKey) {
    const urlWithoutKey = url.replace(/[&?]apikey=[^&]*/i, '');
    res = await fetch(urlWithoutKey, {
      ...opts,
      headers: { ...opts.headers, apikey: apiKey },
    });
  }

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, opts);
  }

  return res;
}

const num = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * GET /api/market-data/company-metrics?symbol=LMT
 *
 * Trimmed TTM key metrics + ratios for the gov-contracts dossier. Sourced
 * from FMP's key-metrics-ttm and ratios-ttm; nulls pass through as nulls so
 * the UI can render an honest "Not available" per metric. Field names vary
 * across FMP API generations, so each output key reads its known aliases.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();

      if (!symbol) {
        return NextResponse.json({ error: 'symbol is required', metrics: null }, { status: 400 });
      }

      const FMP_KEY = getFmpKey();
      if (!FMP_KEY) {
        return NextResponse.json({ error: 'API not configured', metrics: null }, { status: 503 });
      }

      const k = encodeURIComponent(FMP_KEY);
      const sym = encodeURIComponent(symbol);
      const [kmRes, ratiosRes] = await Promise.all([
        fetchWithRetry(`${BASE}/key-metrics-ttm?symbol=${sym}&apikey=${k}`, FMP_KEY),
        fetchWithRetry(`${BASE}/ratios-ttm?symbol=${sym}&apikey=${k}`, FMP_KEY),
      ]);

      const kmArr = kmRes.ok ? await kmRes.json().catch(() => []) : [];
      const ratiosArr = ratiosRes.ok ? await ratiosRes.json().catch(() => []) : [];
      const km = (Array.isArray(kmArr) && kmArr[0]) || {};
      const ra = (Array.isArray(ratiosArr) && ratiosArr[0]) || {};

      const metrics = {
        marketCap: num(km.marketCap ?? km.marketCapTTM),
        peRatioTTM: num(ra.priceToEarningsRatioTTM ?? ra.peRatioTTM ?? km.peRatioTTM),
        psRatioTTM: num(
          ra.priceToSalesRatioTTM ?? ra.priceSalesRatioTTM ?? km.priceToSalesRatioTTM,
        ),
        pbRatioTTM: num(ra.priceToBookRatioTTM ?? ra.priceBookValueRatioTTM ?? km.pbRatioTTM),
        debtToEquityTTM: num(ra.debtToEquityRatioTTM ?? ra.debtEquityRatioTTM),
        currentRatioTTM: num(ra.currentRatioTTM),
        grossProfitMarginTTM: num(ra.grossProfitMarginTTM),
        netProfitMarginTTM: num(ra.netProfitMarginTTM),
        returnOnEquityTTM: num(ra.returnOnEquityTTM),
        dividendYieldTTM: num(ra.dividendYieldTTM),
      };

      const hasAny = Object.values(metrics).some((v) => v != null);
      if (!hasAny) {
        return NextResponse.json(
          { error: 'No metrics for symbol', metrics: null },
          { status: 200, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      return NextResponse.json(
        { metrics, symbol },
        {
          // TTM fundamentals move slowly — cache for 6h at the edge.
          headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=300' },
        },
      );
    } catch (err) {
      console.error('[company-metrics] error:', err);
      return NextResponse.json(
        { error: err.message, metrics: null },
        { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
      );
    }
  },
  { requireAuth: false },
);
