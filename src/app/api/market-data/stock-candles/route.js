import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

/* Read at request time, not module load. In serverless (Vercel) the module
   is evaluated during the build; capturing process.env.FMP_API_KEY then
   meant a stale/empty value got baked in if the key was missing or rotated
   after the build. Falling back to NEXT_PUBLIC_FMP_API_KEY covers the case
   where the deployment only has the public key configured. */
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const BASE = 'https://financialmodelingprep.com/stable';

const RANGE_DAYS = {
  '1D': 2,
  '1W': 10,
  '1M': 35,
  '3M': 95,
  '6M': 186,
  '1Y': 370,
  '3Y': 1100,
  '5Y': 1830,
  '10Y': 3660,
  ALL: 7300, // ~20 years — FMP returns what it has
};

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function makeLabel(dateStr, range) {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (range === '1D' || range === '1W') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (range === '3Y' || range === '5Y' || range === '10Y' || range === 'ALL') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  if (range === '1Y') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Retry once on 429 with a short delay. On 403 we try header-auth as a
   one-shot fallback (some FMP plan tiers reject query-string auth even
   though the key is valid). 403 is NOT retried with the same auth — it's
   a credential failure, not a transient error. */
async function fetchWithRetry(url, apiKey) {
  const opts = {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  };

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

export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const symbol = (searchParams.get('symbol') || '').toUpperCase().trim();
      const range = searchParams.get('range') || '1M';

      if (!symbol) {
        return NextResponse.json({ error: 'symbol is required', candles: [] }, { status: 400 });
      }

      const FMP_KEY = getFmpKey();
      if (!FMP_KEY) {
        return NextResponse.json({ error: 'API not configured', candles: [] }, { status: 503 });
      }

      /* Detect a crypto pair (e.g. BTCUSD, ETHUSD). FMP's stable endpoint
       recognises these without a dash; equities never end in `USD` and
       indices/futures use `.` or `=F`, so this heuristic is safe. */
      const isCrypto = /^[A-Z]{2,6}USD$/.test(symbol) && !symbol.includes('.');

      const days = RANGE_DAYS[range] ?? 35;
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      /* For crypto on short ranges (1D / 1W) use the 5-minute intraday feed
       so the chart has more than a few daily candles to draw. Everything
       else (stocks for all ranges, crypto for ≥1M) uses the daily
       historical endpoint which accepts both `AAPL` and `BTCUSD`. */
      const intraday = isCrypto && (range === '1D' || range === '1W');
      const fromStr = toDateStr(fromDate);
      const toStr = toDateStr(toDate);
      const k = encodeURIComponent(FMP_KEY);
      const sym = encodeURIComponent(symbol);

      const url = intraday
        ? `${BASE}/historical-chart/5min?symbol=${sym}&from=${fromStr}&to=${toStr}&apikey=${k}`
        : `${BASE}/historical-price-eod/full?symbol=${sym}&from=${fromStr}&to=${toStr}&apikey=${k}`;

      // Long historical ranges: cache for 24hrs (data doesn't change)
      const cacheSeconds =
        range === '1D' ? 900 : ['3Y', '5Y', '10Y', 'ALL'].includes(range) ? 86400 : 3600;

      const res = await fetchWithRetry(url, FMP_KEY);

      if (!res.ok) {
        if (res.status === 429) {
          return NextResponse.json(
            {
              error: 'Rate limit reached. Please wait a moment and try again.',
              candles: [],
              rateLimited: true,
            },
            {
              status: 200,
              headers: {
                'Retry-After': '10',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
              },
            },
          );
        }
        const body = await res.text();
        // Pull FMP's own message ("Invalid API KEY…" vs "Exclusive Endpoint…")
        // so the cause is visible client-side instead of a bare status code.
        let fmpMsg = '';
        try {
          const j = JSON.parse(body);
          fmpMsg = j['Error Message'] || j.error || j.message || '';
        } catch {
          /* non-JSON body */
        }
        /* Log the key prefix (not the full key) so we can confirm in Vercel
         logs whether the env var is actually populated at request time. */
        console.error(
          `[stock-candles] FMP ${res.status} for ${symbol}: key=${FMP_KEY ? FMP_KEY.slice(0, 4) + '***' : 'MISSING'}, body=${body.slice(0, 200)}`,
        );
        return NextResponse.json(
          { error: fmpMsg ? `FMP ${res.status}: ${fmpMsg}` : `FMP ${res.status}`, candles: [] },
          {
            status: 200,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
          },
        );
      }

      const body = await res.json();

      /* FMP endpoint shapes diverge: `historical-price-eod/full` may wrap
       results under a `historical` key while `historical-chart/5min`
       returns a flat array. Normalize both before the rest of the
       pipeline runs. */
      const rawArray = Array.isArray(body)
        ? body
        : Array.isArray(body?.historical)
          ? body.historical
          : [];

      if (rawArray.length === 0) {
        return NextResponse.json({ candles: [], symbol, range }, { status: 200 });
      }

      const sorted = [...rawArray].reverse(); // oldest first

      const candles = sorted.map((bar) => {
        /* 5-minute candles arrive as "YYYY-MM-DD HH:MM:SS"; the daily feed
         is just "YYYY-MM-DD". Strip the time portion so `makeLabel` (and
         its `new Date(dateStr + 'T12:00:00Z')` call) parses cleanly. */
        const dateOnly =
          typeof bar.date === 'string' && bar.date.includes(' ')
            ? bar.date.split(' ')[0]
            : bar.date;
        return {
          t: new Date(bar.date).getTime() / 1000,
          label: makeLabel(dateOnly, range),
          open: bar.open ?? bar.close,
          high: bar.high ?? bar.close,
          low: bar.low ?? bar.close,
          close: bar.close,
          price: bar.close,
          volume: bar.volume ?? 0,
          change: bar.change ?? 0,
          changePercent: bar.changePercent ?? 0,
        };
      });

      return NextResponse.json(
        { candles, symbol, range },
        {
          headers: {
            'Cache-Control': `public, s-maxage=${cacheSeconds}, stale-while-revalidate=120`,
          },
        },
      );
    } catch (err) {
      console.error('[stock-candles] error:', err);
      return NextResponse.json(
        { error: err.message, candles: [] },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        },
      );
    }
  },
  { requireAuth: false },
);
