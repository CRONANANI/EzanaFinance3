import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getAuthUser } from '@/lib/supabase';
import { requirePlan } from '@/lib/require-plan';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { rankAnalysts, LOOKBACK_YEARS } from '@/lib/research/analyst-accuracy';

/**
 * GET /api/research/analyst-accuracy?symbol=TSLA
 * Analysts and firms covering a stock, ranked by how their past calls on it
 * played out (src/lib/research/analyst-accuracy.js has the method).
 *
 * Advanced plan and above (tier 2+; requirePlan fails closed). Signed-out
 * visitors get 401, lower plans 402 with code 'plan_required', which the
 * card turns into the upgrade prompt.
 *
 * Data: FMP price-target-news (individual analysts), grades (firms) and daily
 * closes for the stock and SPY. The ranking is cached per symbol for 12 hours,
 * so the FMP calls run at most twice a day per ticker.
 */
export const dynamic = 'force-dynamic';

const FMP = 'https://financialmodelingprep.com/stable';
const SYMBOL_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const TARGET_PAGES = 8;
const TARGET_PAGE_SIZE = 100;

async function getJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchTargets(sym, key, since) {
  const rows = [];
  for (let page = 0; page < TARGET_PAGES; page += 1) {
    const batch = await getJson(
      `${FMP}/price-target-news?symbol=${encodeURIComponent(sym)}&page=${page}&limit=${TARGET_PAGE_SIZE}&apikey=${encodeURIComponent(key)}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    const oldest = batch
      .map((r) => String(r?.publishedDate || '').slice(0, 10))
      .filter(Boolean)
      .sort()[0];
    if (batch.length < TARGET_PAGE_SIZE || (oldest && oldest < since)) break;
  }
  return rows;
}

const computeRanking = unstable_cache(
  async (sym) => {
    const key = getFmpKey();
    /* Throw rather than return: unstable_cache must not keep a failure. */
    if (!key) throw new Error('fmp key missing');
    const today = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - (LOOKBACK_YEARS + 1) * 365.25 * 864e5)
      .toISOString()
      .slice(0, 10);
    const since = new Date(Date.now() - LOOKBACK_YEARS * 365.25 * 864e5).toISOString().slice(0, 10);
    const eod = (s) =>
      `${FMP}/historical-price-eod/light?symbol=${encodeURIComponent(s)}&from=${from}&to=${today}&apikey=${encodeURIComponent(key)}`;
    const [targets, grades, stockRows, spyRows] = await Promise.all([
      fetchTargets(sym, key, since),
      getJson(`${FMP}/grades?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`),
      getJson(eod(sym)),
      getJson(eod('SPY')),
    ]);
    if (!stockRows || !spyRows) throw new Error('price history unavailable');
    const ranking = rankAnalysts({
      targets: Array.isArray(targets) ? targets : [],
      grades: Array.isArray(grades) ? grades : [],
      stockRows,
      spyRows,
      today,
    });
    return { ...ranking, asOf: today };
  },
  ['analyst-accuracy-v1'],
  { revalidate: 43200 },
);

export async function GET(request) {
  const sym = String(new URL(request.url).searchParams.get('symbol') || '')
    .trim()
    .toUpperCase();
  if (!SYMBOL_RE.test(sym)) {
    return NextResponse.json({ error: 'A valid symbol is required.' }, { status: 400 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in to see analyst track records.', code: 'auth_required' }, { status: 401 });
  }
  const denied = await requirePlan(user.id, { minTier: 2 });
  if (denied) return denied;

  let data = null;
  try {
    data = await computeRanking(sym);
  } catch {
    data = null;
  }
  if (!data) {
    return NextResponse.json({ error: 'Analyst track records are unavailable right now.' }, { status: 503 });
  }
  return NextResponse.json(
    { symbol: sym, ...data },
    { headers: { 'Cache-Control': 'private, max-age=600' } },
  );
}
