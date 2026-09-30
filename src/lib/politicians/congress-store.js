/**
 * Read layer for the Politician Tracker over public.congress_trades /
 * public.congress_members and the three RPCs (politician_rankings,
 * congress_monthly_counts, congress_top_tickers). Written by the daily cron
 * only; nothing here calls a third party.
 *
 * Rows come back in the canonical trade shape the page already binds to
 * (see normalize-trade.js), so the tracker model and member panel are
 * unchanged. Filters run in SQL. Every function returns { error } instead of
 * throwing, so the route can fall back to its snapshot.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

export const WINDOW_DAYS = 365;
const CHAMBER_LABEL = { house: 'House', senate: 'Senate' };
const SIDE = { purchase: 'purchase', sale: 'sale', sale_partial: 'sale', exchange: 'exchange' };
const SIDE_RAW = {
  purchase: 'Purchase',
  sale: 'Sale',
  sale_partial: 'Sale (Partial)',
  exchange: 'Exchange',
};

function db() {
  if (!isServerSupabaseConfigured()) return null;
  try {
    return getAdminClient();
  } catch {
    return null;
  }
}

/** 'House'|'house' → 'house'; anything else → null. */
export function chamberParam(v) {
  const s = String(v || '').toLowerCase();
  return s === 'house' || s === 'senate' ? s : null;
}
export function partyParam(v) {
  const s = String(v || '').toUpperCase();
  return s === 'D' || s === 'R' || s === 'I' ? s : null;
}
/** Search text, trimmed and stripped of PostgREST/LIKE metacharacters. */
export function queryParam(v) {
  const s = String(v || '')
    .replace(/[%_,()*\\]/g, ' ')
    .trim()
    .slice(0, 60);
  return s || null;
}

const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
function bandLabel(min, max) {
  if (min == null && max == null) return null;
  if (max == null) return `${usd(min)} +`;
  if (min == null || min === max) return usd(max);
  return `${usd(min)} - ${usd(max)}`;
}

/** congress_trades row (+ congress_members embed) → canonical trade. */
export function toCanonical(r) {
  const m = r.congress_members || {};
  const min = r.amount_min == null ? null : Number(r.amount_min);
  const max = r.amount_max == null ? null : Number(r.amount_max);
  return {
    id: r.id,
    ticker: r.ticker || null,
    bioguideId: r.bioguide_id,
    name: m.full_name || r.bioguide_id,
    chamber: CHAMBER_LABEL[r.chamber] || null,
    state: m.state || null,
    district: m.district ?? null,
    party: m.party || null,
    partySource: m.party ? 'directory' : null,
    photoUrl: m.photo_url || null,
    tradedAt: r.transaction_date,
    filedAt: r.disclosure_date || null,
    side: SIDE[r.type] || 'other',
    sideRaw: SIDE_RAW[r.type] || r.type,
    amountBand: {
      raw: bandLabel(min, max),
      min,
      max,
      mid: r.amount_mid == null ? null : Number(r.amount_mid),
    },
    owner: r.owner || null,
    assetName: r.asset_name || null,
    sourceUrl: r.source_url || null,
    source: r.source,
  };
}

const since = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

/**
 * Newest disclosures first, filtered in SQL.
 * @returns {Promise<{ trades: object[], error: string|null }>}
 */
export async function readTrades({
  chamber = null,
  party = null,
  q = null,
  bioguide = null,
  ticker = null,
  page = 0,
  limit = 200,
  windowDays = WINDOW_DAYS,
} = {}) {
  const client = db();
  if (!client) return { trades: [], error: 'not configured' };
  const inner = party || q ? '!inner' : '';
  let query = client
    .from('congress_trades')
    .select(
      `id, bioguide_id, chamber, transaction_date, disclosure_date, ticker, asset_name, type,
       amount_min, amount_max, amount_mid, owner, source, source_url,
       congress_members${inner}(full_name, party, state, district, photo_url)`,
    )
    .gte('transaction_date', since(windowDays));
  if (chamber) query = query.eq('chamber', chamber);
  if (bioguide) query = query.eq('bioguide_id', bioguide);
  if (ticker) query = query.eq('ticker', ticker);
  if (party) query = query.eq('congress_members.party', party);
  if (q) query = query.ilike('congress_members.full_name', `%${q}%`);
  const { data, error } = await query
    .order('disclosure_date', { ascending: false, nullsFirst: false })
    .order('transaction_date', { ascending: false })
    .range(page * limit, page * limit + limit - 1);
  if (error) return { trades: [], error: error.message };
  return { trades: (data || []).map(toCanonical), error: null };
}

/** Per-chamber feed state for the window: 'ok' when any trade exists. */
export async function readFeeds(windowDays = WINDOW_DAYS) {
  const client = db();
  if (!client) return null;
  const out = {};
  for (const ch of ['house', 'senate']) {
    const { count, error } = await client
      .from('congress_trades')
      .select('id', { count: 'exact', head: true })
      .eq('chamber', ch)
      .gte('transaction_date', since(windowDays));
    if (error) return null;
    out[ch] = count ? 'ok' : 'down';
  }
  return out;
}

/**
 * Rankings, monthly counts and top tickers from the RPCs, one filter set.
 * @returns {Promise<{ rankings, monthly, tickers, error }>}
 */
export async function readSummary({
  chamber = null,
  party = null,
  q = null,
  sort = 'volume',
  windowDays = WINDOW_DAYS,
  tickerLimit = 10,
} = {}) {
  const client = db();
  if (!client) return { error: 'not configured' };
  const f = { p_chamber: chamber, p_party: party, p_q: q };
  const [r, m, t] = await Promise.all([
    client.rpc('politician_rankings', { window_days: windowDays, ...f, p_sort: sort, lim: 600 }),
    client.rpc('congress_monthly_counts', { window_days: windowDays, ...f }),
    client.rpc('congress_top_tickers', { window_days: windowDays, lim: tickerLimit, ...f }),
  ]);
  const error = r.error?.message || m.error?.message || t.error?.message || null;
  if (error) return { error };
  return {
    error: null,
    rankings: (r.data || []).map((x) => ({
      bioguideId: x.bioguide_id,
      name: x.full_name,
      chamber: CHAMBER_LABEL[x.chamber] || null,
      party: x.party || null,
      state: x.state || null,
      district: x.district ?? null,
      photoUrl: x.photo_url || null,
      count: Number(x.trades) || 0,
      buys: Number(x.buys) || 0,
      sells: Number(x.sells) || 0,
      volume: Number(x.disclosed_volume) || 0,
      lastTraded: x.last_trade || null,
      topTickers: x.top_tickers || [],
    })),
    monthly: (m.data || []).map((x) => ({
      month: String(x.month).slice(0, 7),
      House: Number(x.house) || 0,
      Senate: Number(x.senate) || 0,
    })),
    tickers: (t.data || []).map((x) => ({
      ticker: x.ticker,
      count: Number(x.trades) || 0,
      members: Number(x.members) || 0,
    })),
  };
}
