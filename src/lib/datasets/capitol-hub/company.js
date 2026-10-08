/**
 * Capitol Watch company card: one listed company, three reads. SERVER ONLY.
 *
 *   getCapitolCompany(ticker)        name, sector, 10 fiscal years of federal
 *                                    contracts, recent awards, and the members
 *                                    with the largest estimated positions
 *                                    (indexed tables only: a few ms each)
 *   getCapitolCompanyPrices(t, range) daily closes (FMP, Alpaca, then cache)
 *   getCapitolCompanyNews(ticker)    recent company headlines (Finnhub, then
 *                                    Alpha Vantage)
 *
 * Cached under `hubs` (15 min for the card, 1 h for prices and news).
 * Errors are thrown inside the cache and answered as { error } outside, so a
 * failure is never cached.
 *
 * Positions are inferred from STOCK Act disclosures, which report dollar
 * ranges per trade, never share counts. "Largest positions" is therefore the
 * estimated dollar value of each member's open position.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, timed } from '@/lib/datasets/hub-data';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { isoDaysAgo, num, up } from './lookups';
import { cleanAssetName, contractSummary } from './company-format';

const CARD_CACHE = { revalidate: 900, tags: ['hubs'] };
const SLOW_CACHE = { revalidate: 3600, tags: ['hubs'] };
const YEARS = 10;
const TICKER = /^[A-Z][A-Z0-9.-]{0,9}$/;

export const PRICE_RANGES = { '1M': 31, '6M': 183, '1Y': 366, '5Y': 1830, '10Y': 3660 };

const guard =
  (label, fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error('[capitol-company]', label, e?.message || e);
      return { error: true };
    }
  };

/* The latest fiscal year loaded into the contracts corpus (cached a day). */
const latestFiscalYear = unstable_cache(
  async () => {
    const { data, error } = await getAdminClient()
      .from('gov_contract_coverage')
      .select('fiscal_year')
      .order('fiscal_year', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return data?.[0]?.fiscal_year || null;
  },
  ['capitol-company-latest-fy-v1'],
  { revalidate: 86400, tags: ['hubs'] },
);

async function loadCompanyOrThrow(ticker) {
  if (!configured()) throw new Error('not configured');
  const admin = getAdminClient();
  const t = up(ticker);
  const today = new Date().toISOString().slice(0, 10);
  const [names, sector, asset, holders, purchases, history, top, recent, fyTo] = await Promise.all([
    timed(admin.from('contractor_tickers').select('company').eq('ticker', t).limit(20)),
    timed(admin.from('ticker_sectors').select('sector').eq('ticker', t).maybeSingle()),
    timed(
      admin
        .from('congress_trades')
        .select('asset_name')
        .eq('ticker', t)
        .not('asset_name', 'is', null)
        .order('transaction_date', { ascending: false })
        .limit(1),
    ),
    timed(
      admin
        .from('mv_congress_open_positions')
        .select(
          'bioguide_id, member_name, chamber, party, state, est_value, est_low, est_high, first_buy, last_date, last_type, trades',
        )
        .eq('ticker', t)
        .order('est_value', { ascending: false })
        .limit(100),
    ),
    timed(
      admin
        .from('congress_trades')
        .select('bioguide_id, transaction_date, amount_mid')
        .eq('ticker', t)
        .eq('type', 'purchase')
        .gte('transaction_date', isoDaysAgo(YEARS * 366))
        .order('transaction_date', { ascending: true })
        .limit(2000),
    ),
    timed(
      admin
        .from('company_contract_history')
        .select('fiscal_year, awarding_agency, award_count, total_amount')
        .eq('ticker', t)
        .limit(2000),
    ),
    timed(
      admin
        .from('company_contract_top_awards')
        .select(
          'generated_award_id, recipient_name, awarding_agency, award_amount, action_date, fiscal_year',
        )
        .eq('ticker', t)
        .order('award_amount', { ascending: false })
        .limit(10),
    ),
    timed(
      admin
        .from('mv_contract_award_tickers')
        .select('generated_award_id, action_date, award_amount, awarding_agency')
        .eq('ticker', t)
        .gte('action_date', isoDaysAgo(180))
        .lte('action_date', today)
        .order('action_date', { ascending: false })
        .limit(8),
    ),
    latestFiscalYear().catch(() => null),
  ]);
  for (const r of [names, sector, asset, holders, purchases, recent]) {
    if (r.error) throw new Error(r.error.message);
  }
  /* The history tables arrive with migration 20261008000800 and fill on the
     first sync; until then the card shows recent awards only. */
  const historyReady = !history.error && !top.error;

  /* Sitting members only: a former member's last disclosure says nothing
     about what they hold today. */
  const all = holders.data || [];
  let members = new Map();
  if (all.length) {
    const { data, error } = await timed(
      admin
        .from('congress_members')
        .select('bioguide_id, photo_url, in_office')
        .in(
          'bioguide_id',
          all.map((h) => h.bioguide_id),
        ),
    );
    if (error) throw new Error(error.message);
    members = new Map((data || []).map((m) => [m.bioguide_id, m]));
  }
  const held = all.filter((h) => members.get(h.bioguide_id)?.in_office !== false);
  const photos = new Map([...members.values()].map((m) => [m.bioguide_id, m.photo_url]));
  const ids = held.map((h) => h.bioguide_id);
  const holderIds = new Set(ids);
  const shortest = (names.data || [])
    .map((n) => n.company)
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)[0];

  return {
    ticker: t,
    name: cleanAssetName(asset.data?.[0]?.asset_name) || shortest || t,
    sector: sector.data?.sector || null,
    holders: {
      count: held.length,
      totalEst: held.reduce((s, h) => s + (num(h.est_value) || 0), 0),
      rows: held.slice(0, 15).map((h) => ({
        bioguide_id: h.bioguide_id,
        name: h.member_name,
        chamber: h.chamber,
        party: h.party,
        state: h.state,
        photo_url: photos.get(h.bioguide_id) || null,
        est_value: num(h.est_value),
        est_low: num(h.est_low),
        est_high: num(h.est_high),
        first_buy: h.first_buy,
        last_trade: h.last_date,
        last_action: h.last_type,
        trades: num(h.trades),
      })),
    },
    /* Purchases by current holders only: the chart's portraits. */
    purchases: (purchases.data || [])
      .filter((p) => holderIds.has(p.bioguide_id))
      .map((p) => ({
        bioguide_id: p.bioguide_id,
        date: p.transaction_date,
        amount: num(p.amount_mid),
      })),
    contracts: {
      historyReady,
      ...contractSummary(historyReady ? history.data || [] : [], fyTo),
      top: historyReady
        ? (top.data || []).map((a) => ({
            id: a.generated_award_id,
            recipient: a.recipient_name,
            agency: a.awarding_agency,
            amount: num(a.award_amount),
            date: a.action_date,
            fy: a.fiscal_year,
          }))
        : [],
      recent: (recent.data || []).map((a) => ({
        id: a.generated_award_id,
        agency: a.awarding_agency,
        amount: num(a.award_amount),
        date: a.action_date,
      })),
    },
  };
}
const cachedCompany = unstable_cache(loadCompanyOrThrow, ['capitol-company-v1'], CARD_CACHE);

/** The card's data, or { error }. */
export const getCapitolCompany = guard('card', (ticker) => {
  const t = up(ticker);
  if (!TICKER.test(t)) throw new Error('bad ticker');
  return cachedCompany(t);
});

async function loadPricesOrThrow(ticker, range) {
  const days = PRICE_RANGES[range] || PRICE_RANGES['1Y'];
  const from = isoDaysAgo(days);
  const { candles, source } = await getDailyBars(ticker, from);
  if (!candles.length) throw new Error('no prices');
  const first = candles[0].close;
  const last = candles[candles.length - 1];
  return {
    range,
    candles,
    source,
    last: last.close,
    lastDate: last.date,
    changePct: first > 0 ? (last.close / first - 1) * 100 : null,
  };
}
const cachedPrices = unstable_cache(loadPricesOrThrow, ['capitol-company-prices-v1'], SLOW_CACHE);

/** { range, candles, last, lastDate, changePct } or { error }. */
export const getCapitolCompanyPrices = guard('prices', (ticker, range = '1Y') => {
  const t = up(ticker);
  if (!TICKER.test(t)) throw new Error('bad ticker');
  return cachedPrices(t, PRICE_RANGES[range] ? range : '1Y');
});

const trim = (s, n) => {
  const v = String(s || '').trim();
  return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v;
};

async function finnhubNews(ticker) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];
  const qs = new URLSearchParams({
    symbol: ticker,
    from: isoDaysAgo(30),
    to: new Date().toISOString().slice(0, 10),
    token,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://finnhub.io/api/v1/company-news?${qs}`, {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((a) => ({
      headline: a.headline,
      source: a.source,
      url: a.url,
      date: a.datetime ? new Date(a.datetime * 1000).toISOString() : null,
      summary: a.summary,
      image: a.image || null,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function alphaNews(ticker) {
  if (!getAlphaVantageApiKey()) return [];
  try {
    const data = await fetchAV(
      { function: 'NEWS_SENTIMENT', tickers: ticker, limit: '20', sort: 'LATEST' },
      1800,
    );
    return (Array.isArray(data?.feed) ? data.feed : []).map((a) => {
      const ts = String(a.time_published || '');
      const date =
        ts.length >= 8
          ? `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(9, 11) || '00'}:${ts.slice(11, 13) || '00'}:00Z`
          : null;
      return {
        headline: a.title,
        source: a.source,
        url: a.url,
        date,
        summary: a.summary,
        image: a.banner_image || null,
      };
    });
  } catch {
    return [];
  }
}

async function loadNewsOrThrow(ticker) {
  let items = await finnhubNews(ticker);
  if (!items.length) items = await alphaNews(ticker);
  const seen = new Set();
  const out = [];
  for (const a of items) {
    const key = String(a.headline || '')
      .toLowerCase()
      .replace(/\W+/g, ' ')
      .trim();
    if (!a.headline || !a.url || !/^https?:\/\//.test(a.url) || seen.has(key)) continue;
    seen.add(key);
    out.push({
      headline: trim(a.headline, 160),
      source: a.source || null,
      url: a.url,
      date: a.date,
      summary: a.summary ? trim(a.summary, 200) : null,
    });
    if (out.length >= 8) break;
  }
  out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return { items: out };
}
const cachedNews = unstable_cache(loadNewsOrThrow, ['capitol-company-news-v1'], SLOW_CACHE);

/** { items: [{ headline, source, url, date, summary }] } or { error }. */
export const getCapitolCompanyNews = guard('news', (ticker) => {
  const t = up(ticker);
  if (!TICKER.test(t)) throw new Error('bad ticker');
  return cachedNews(t);
});
