/**
 * Capitol Watch company card: three independent reads, so each section of
 * the card paints when its own data lands. SERVER ONLY.
 *
 *   card    name, ten fiscal years of federal contracts (company_contract_
 *           history, synced weekly from the warehouse), the largest awards,
 *           the latest awards (last 6 months), and the sitting members with
 *           the largest estimated positions plus their purchases for the
 *           chart. Indexed tables only: milliseconds.
 *   prices  daily closes for a range: FMP, then Alpaca, then the stored
 *           closes in price_data_cache.
 *   news    the last 30 days of company headlines: Finnhub, then Alpha
 *           Vantage.
 *
 * STOCK Act disclosures report dollar ranges, never share counts, so holders
 * rank by estimated position value.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, timed } from '@/lib/datasets/hub-data';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';
import { fetchDailyWithFallback } from '@/lib/prices/daily';
import { currentFiscalYear, HISTORY_YEARS } from '@/lib/contracts/fiscal-year';
import { tenYears } from './company-history';
import { isoDaysAgo, num, up } from './lookups';

const CACHE = { revalidate: 900, tags: ['hubs'] };
const MARKET_CACHE = { revalidate: 3600, tags: ['hubs'] };
const HOLDERS = 12;

export const TICKER = /^[A-Z][A-Z0-9.-]{0,9}$/;
export const RANGES = { '1M': 31, '6M': 183, '1Y': 366, '5Y': 1827, '10Y': 3653 };

const check = (r) => {
  if (r.error) throw new Error(r.error.message);
  return r.data || [];
};

/* ── card ─────────────────────────────────────────────────────────────── */

async function loadCardOrThrow(ticker) {
  if (!configured()) return { ticker, empty: true };
  const admin = getAdminClient();
  const [names, history, anyHistory, top, latest, positions] = await Promise.all([
    timed(admin.from('contractor_tickers').select('company').eq('ticker', ticker).limit(20)).then(
      check,
    ),
    timed(
      admin
        .from('company_contract_history')
        .select('fiscal_year, awarding_agency, award_count, total_amount, synced_at')
        .eq('ticker', ticker)
        .gte('fiscal_year', currentFiscalYear() - HISTORY_YEARS + 1)
        .limit(2000),
    ).then(check),
    timed(admin.from('company_contract_history').select('ticker').limit(1)).then(check),
    timed(
      admin
        .from('company_contract_top_awards')
        .select('generated_award_id, recipient_name, awarding_agency, award_amount, action_date')
        .eq('ticker', ticker)
        .order('award_amount', { ascending: false })
        .limit(5),
    ).then(check),
    timed(
      admin
        .from('mv_contract_award_tickers')
        .select('generated_award_id, action_date, award_amount, awarding_agency')
        .eq('ticker', ticker)
        .gte('action_date', isoDaysAgo(183))
        .order('action_date', { ascending: false })
        .limit(8),
    ).then(check),
    timed(
      admin
        .from('mv_congress_open_positions')
        .select(
          'bioguide_id, member_name, chamber, party, state, est_value, est_low, est_high, last_date, last_type',
        )
        .eq('ticker', ticker)
        .order('est_value', { ascending: false })
        .limit(200),
    ).then(check),
  ]);

  /* Sitting members only: a former member stops filing, so their last buy
     would otherwise stay "open" forever. */
  const ids = [...new Set(positions.map((p) => up(p.bioguide_id)))];
  const members = ids.length
    ? await timed(
        admin
          .from('congress_members')
          .select('bioguide_id, full_name, chamber, party, state, in_office, photo_url')
          .in('bioguide_id', ids),
      ).then(check)
    : [];
  const sitting = new Map(members.filter((m) => m.in_office).map((m) => [up(m.bioguide_id), m]));
  const holdersAll = positions
    .filter((p) => sitting.has(up(p.bioguide_id)))
    .map((p) => {
      const m = sitting.get(up(p.bioguide_id));
      return {
        bioguideId: up(p.bioguide_id),
        name: m.full_name || p.member_name,
        party: m.party || p.party,
        chamber: String(m.chamber || p.chamber || '').toLowerCase() || null,
        state: m.state || p.state || null,
        photo: m.photo_url || null,
        estValue: num(p.est_value),
        estLow: num(p.est_low),
        estHigh: num(p.est_high),
        lastDate: p.last_date,
        lastType: p.last_type,
      };
    })
    .sort((a, b) => (b.estValue || 0) - (a.estValue || 0));
  const holders = holdersAll.slice(0, HOLDERS);

  /* Purchases by the shown holders, for the chart's portraits. */
  const purchases = holders.length
    ? await timed(
        admin
          .from('congress_trades')
          .select('bioguide_id, transaction_date, amount_min, amount_max, type')
          .in(
            'bioguide_id',
            holders.map((h) => h.bioguideId),
          )
          .eq('ticker', ticker)
          .eq('type', 'purchase')
          .gte('transaction_date', isoDaysAgo(3660))
          .order('transaction_date', { ascending: false })
          .limit(300),
      ).then(check)
    : [];

  const company =
    names
      .map((r) => r.company)
      .filter(Boolean)
      .sort((a, b) => a.length - b.length)[0] || null;
  const tenYear = tenYears(history);
  return {
    ticker,
    company,
    contracts: {
      ...tenYear,
      /* The weekly history has never run anywhere yet: say so instead of "none". */
      preparing: !anyHistory.length,
      matched: history.length > 0,
      syncedAt: history[0]?.synced_at || null,
      top: top.map((a) => ({
        id: a.generated_award_id,
        recipient: a.recipient_name,
        agency: a.awarding_agency,
        amount: num(a.award_amount),
        date: a.action_date,
      })),
      latest: latest.map((a) => ({
        id: a.generated_award_id,
        agency: a.awarding_agency,
        amount: num(a.award_amount),
        date: a.action_date,
      })),
    },
    holders,
    holderCount: holdersAll.length,
    purchases: purchases.map((p) => ({
      bioguide_id: up(p.bioguide_id),
      date: p.transaction_date,
      amount:
        num(p.amount_min) != null && num(p.amount_max) != null
          ? (num(p.amount_min) + num(p.amount_max)) / 2
          : num(p.amount_min),
    })),
  };
}
const cachedCard = unstable_cache(loadCardOrThrow, ['capitol-company-card-v1'], CACHE);
export const getCompanyCard = (ticker) => cachedCard(up(ticker));

/* ── prices ───────────────────────────────────────────────────────────── */

async function loadPricesOrThrow(ticker, range) {
  const days = RANGES[range] || RANGES['1Y'];
  const to = new Date().toISOString().slice(0, 10);
  const from = isoDaysAgo(days);
  const live = await fetchDailyWithFallback(ticker, from, to);
  let rows = live.rows;
  let source = live.source;
  if (!rows.length && configured()) {
    const { data, error } = await timed(
      getAdminClient()
        .from('price_data_cache')
        .select('date, close')
        .eq('ticker', ticker)
        .gte('date', from)
        .order('date')
        .limit(4000),
    );
    if (!error && data?.length) {
      rows = data;
      source = 'stored';
    }
  }
  const candles = rows
    .map((r) => ({ date: String(r.date).slice(0, 10), close: num(r.close) }))
    .filter((r) => r.close != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { ticker, range, source, candles };
}
const cachedPrices = unstable_cache(loadPricesOrThrow, ['capitol-company-prices-v1'], MARKET_CACHE);
export const getCompanyPrices = (ticker, range) =>
  cachedPrices(up(ticker), RANGES[range] ? range : '1Y');

/* ── news ─────────────────────────────────────────────────────────────── */

async function finnhubNews(ticker, from, to) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const qs = new URLSearchParams({ symbol: ticker.replace(/\./g, '-'), from, to, token: key });
  const res = await fetch(`https://finnhub.io/api/v1/company-news?${qs}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const list = await res.json();
  if (!Array.isArray(list)) return null;
  return list
    .filter((n) => n.headline && n.url)
    .sort((a, b) => (b.datetime || 0) - (a.datetime || 0))
    .map((n) => ({
      headline: n.headline,
      source: n.source || null,
      url: n.url,
      date: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
    }));
}

async function alphaNews(ticker) {
  if (!getAlphaVantageApiKey()) return null;
  const d = await fetchAV({
    function: 'NEWS_SENTIMENT',
    tickers: ticker,
    limit: '20',
    sort: 'LATEST',
  });
  const feed = Array.isArray(d?.feed) ? d.feed : null;
  if (!feed) return null;
  return feed
    .filter((n) => n.title && n.url)
    .map((n) => {
      const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(String(n.time_published || ''));
      return {
        headline: n.title,
        source: n.source || null,
        url: n.url,
        date: m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00Z` : null,
      };
    });
}

async function loadNewsOrThrow(ticker) {
  const to = new Date().toISOString().slice(0, 10);
  const from = isoDaysAgo(30);
  let items = null;
  let source = null;
  try {
    items = await finnhubNews(ticker, from, to);
    if (items) source = 'finnhub';
  } catch {
    items = null;
  }
  if (!items?.length) {
    try {
      const av = await alphaNews(ticker);
      if (av) {
        items = av;
        source = 'alphavantage';
      }
    } catch {
      /* both sources failed: the card says no headlines */
    }
  }
  const cutoff = Date.parse(from);
  const seen = new Set();
  const list = (items || [])
    .filter((n) => !n.date || Date.parse(n.date) >= cutoff)
    .filter((n) => {
      const k = n.headline.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 8);
  return { ticker, source, configured: source != null || Boolean(items), items: list };
}
const cachedNews = unstable_cache(loadNewsOrThrow, ['capitol-company-news-v1'], MARKET_CACHE);
export const getCompanyNews = (ticker) => cachedNews(up(ticker));
