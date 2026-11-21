import { NextResponse } from 'next/server';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { fetchWithTimeout } from '@/lib/http/fetch-json';

/**
 * GET /api/landing/live-quote?symbol=LMT
 *
 * The live price leg for the Sonar band's company chart. The band's demo
 * brief is cached for hours (one synthesis, not one per visitor), so the
 * chart and the four stats beside it would otherwise show the price from
 * whenever the brief was written. This route is the cheap half of a ping:
 * the current quote plus the year-to-date daily closes, with today's point
 * taken from the live quote while the market is open.
 *
 * Public market data only, no auth, no user data. Fails soft: any upstream
 * failure returns 502 and the card keeps the series the brief came with.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const FMP_V3 = 'https://financialmodelingprep.com/api/v3';
const SYMBOL_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

/* Per-instance memo: short while the market is open, longer once it shuts. */
const memo = new Map();
const TTL_OPEN_MS = 30 * 1000;
const TTL_CLOSED_MS = 5 * 60 * 1000;

/** Wall-clock parts in New York, whatever zone the server runs in. */
function nyParts(ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    weekday: get('weekday'),
  };
}

/**
 * Regular session, 9:30 to 16:00 ET on a weekday. Exchange holidays are not
 * in a calendar here; a quote whose timestamp is more than 20 minutes old in
 * session hours means the market did not trade today, so it reads as closed.
 */
function marketOpen(nowMs, quoteTsMs) {
  const ny = nyParts(nowMs);
  if (ny.weekday === 'Sat' || ny.weekday === 'Sun') return false;
  if (ny.minutes < 9 * 60 + 30 || ny.minutes >= 16 * 60) return false;
  if (quoteTsMs && nowMs - quoteTsMs > 20 * 60 * 1000) return false;
  return true;
}

async function getJson(url) {
  try {
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, 5000);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function firstJson(urls, pick) {
  for (const url of urls) {
    const v = pick(await getJson(url));
    if (v) return v;
  }
  return null;
}

const num = (...xs) => {
  for (const x of xs) if (typeof x === 'number' && Number.isFinite(x)) return x;
  return null;
};

async function load(symbol) {
  const key = getFmpKey();
  if (!key) return null;
  const k = encodeURIComponent(key);
  const sym = encodeURIComponent(symbol);
  const now = Date.now();
  const ny = nyParts(now);
  const from = `${ny.date.slice(0, 4)}-01-01`;

  const [quote, eod] = await Promise.all([
    firstJson(
      [`${FMP_STABLE}/quote?symbol=${sym}&apikey=${k}`, `${FMP_V3}/quote/${sym}?apikey=${k}`],
      (d) => {
        const q = Array.isArray(d) ? d[0] : d;
        return q && typeof q.price === 'number' ? q : null;
      },
    ),
    firstJson(
      [
        `${FMP_STABLE}/historical-price-eod/light?symbol=${sym}&from=${from}&to=${ny.date}&apikey=${k}`,
        `${FMP_V3}/historical-price-full/${sym}?from=${from}&serietype=line&apikey=${k}`,
      ],
      (d) => {
        const r = Array.isArray(d) ? d : Array.isArray(d?.historical) ? d.historical : null;
        return r && r.length ? r : null;
      },
    ),
  ]);
  if (!quote) return null;

  /* FMP stamps quotes in seconds. */
  const tsMs = typeof quote.timestamp === 'number' ? quote.timestamp * 1000 : null;
  const open = marketOpen(now, tsMs);

  /* Oldest first, one point per trading day. */
  const series = (eod || [])
    .map((r) => ({ d: String(r?.date || '').slice(0, 10), c: num(r?.price, r?.close) }))
    .filter((p) => p.d && p.c != null)
    .sort((a, b) => a.d.localeCompare(b.d));

  /* The last point is the live price: today's row is replaced (or added)
     while the session runs, and after the close the quote is the close, so
     the end of the line always agrees with the label on it. */
  const lastDate = tsMs ? nyParts(tsMs).date : ny.date;
  if (series.length && series[series.length - 1].d === lastDate) {
    series[series.length - 1] = { d: lastDate, c: quote.price };
  } else if (!series.length || series[series.length - 1].d < lastDate) {
    series.push({ d: lastDate, c: quote.price });
  }

  return {
    symbol,
    price: quote.price,
    change: num(quote.change),
    changePct: num(quote.changePercentage, quote.changesPercentage),
    prevClose: num(quote.previousClose),
    marketCap: num(quote.marketCap),
    open,
    asOf: tsMs || now,
    series,
  };
}

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('symbol') || '';
  const symbol = raw.trim().toUpperCase();
  if (!SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Bad symbol.' }, { status: 400 });
  }

  const hit = memo.get(symbol);
  if (hit && Date.now() - hit.at < (hit.body.open ? TTL_OPEN_MS : TTL_CLOSED_MS)) {
    return NextResponse.json(hit.body, { headers: cacheHeaders(hit.body.open) });
  }

  const body = await load(symbol);
  if (!body) {
    return NextResponse.json({ error: 'Quote unavailable.' }, { status: 502 });
  }
  memo.set(symbol, { at: Date.now(), body });
  if (memo.size > 200) memo.delete(memo.keys().next().value);
  return NextResponse.json(body, { headers: cacheHeaders(body.open) });
}

function cacheHeaders(open) {
  return {
    'Cache-Control': open
      ? 'public, s-maxage=30, stale-while-revalidate=30'
      : 'public, s-maxage=300, stale-while-revalidate=300',
  };
}
