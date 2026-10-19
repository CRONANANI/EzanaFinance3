/**
 * Server reads for /datasets/prediction-markets. Service-role reads through
 * @/lib/supabase; the index crons are the only writers. Every read fails
 * open to an empty payload, which the page renders as each card's error or
 * empty state, never as sample rows.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { availableWindows } from './window-metrics.js';
import { normalizeCategory } from './page-model.js';

/* Rows older than this are not current odds (the crons run every two hours,
   so six hours is at least two missed runs). Same rule as trending-store. */
const FRESH_HOURS = 6;
const PAGE = 1000; // PostgREST's default max rows per request

const BASE_COLS =
  'market_id, platform, question, probability, price_change_24h, volume, volume_24h, volume_unit, liquidity, spread, best_bid, best_ask, end_date, link, category, indexed_at';
const NEW_COLS = 'tag_ids, change_7d, change_30d, volume_7d, volume_30d, volume_norm, event_key';

/** Columns of the compact universe payload, in order. */
export const UNIVERSE_COLS = [
  'id',
  'venue',
  'question',
  'p',
  'change24h',
  'change7d',
  'change30d',
  'vol',
  'vol24h',
  'vol7d',
  'vol30d',
  'volNorm',
  'liq',
  'spread',
  'bid',
  'ask',
  'closes',
  'category',
  'url',
  'event',
];

const n = (v) => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const r4 = (v) => (v == null ? null : Math.round(v * 1e4) / 1e4);
const r0 = (v) => (v == null ? null : Math.round(v));

/**
 * The event a market belongs to, so the chart can draw sibling outcomes. The
 * index crons store event_key; until a row has one, Polymarket markets in one
 * event share its event page URL and a Kalshi market ticker is its event
 * ticker plus one outcome segment.
 */
export function eventKeyOf(row) {
  if (row.event_key) return row.event_key;
  if (row.platform === 'kalshi') {
    const ticker = String(row.market_id || '').replace(/^kalshi:/, '');
    const cut = ticker.lastIndexOf('-');
    return cut > 0 ? `kalshi:${ticker.slice(0, cut)}` : null;
  }
  return row.link || null;
}

/** One index row as a compact array in UNIVERSE_COLS order. */
export function toClientRow(row) {
  return [
    row.market_id,
    row.platform,
    row.question,
    r4(n(row.probability)),
    r4(n(row.price_change_24h)),
    r4(n(row.change_7d)),
    r4(n(row.change_30d)),
    r0(n(row.volume)),
    r0(n(row.volume_24h)),
    r0(n(row.volume_7d)),
    r0(n(row.volume_30d)),
    r0(n(row.volume_norm)),
    r0(n(row.liquidity)),
    r4(n(row.spread)),
    r4(n(row.best_bid)),
    r4(n(row.best_ask)),
    row.end_date || null,
    normalizeCategory({ platform: row.platform, tag_ids: row.tag_ids, category: row.category }),
    row.link || null,
    eventKeyOf(row),
  ];
}

async function readAll(admin, cols, since, nowIso) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('prediction_market_index')
      .select(cols)
      .eq('status', 'active')
      .gte('indexed_at', since)
      .or(`end_date.is.null,end_date.gt."${nowIso}"`)
      .order('market_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return { rows: null, error };
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { rows: out, error: null };
}

async function oldestSnapshot(admin) {
  const { data, error } = await admin
    .from('prediction_market_snapshots')
    .select('captured_at')
    .order('captured_at', { ascending: true })
    .limit(1);
  if (error || !data || !data.length) return null;
  return data[0].captured_at;
}

/**
 * Every open, fresh market as a compact columnar payload:
 * { cols, rows, updatedAt, windows: { '24h', '7d', '30d' }, stale }.
 * Works before the snapshot migration is applied (falls back to the base
 * columns, windows 7d/30d unavailable).
 */
export async function getUniverse(now = new Date()) {
  const empty = {
    cols: UNIVERSE_COLS,
    rows: [],
    updatedAt: null,
    windows: availableWindows(null, now),
    stale: false,
  };
  if (!isServerSupabaseConfigured()) return empty;
  const admin = getAdminClient();
  const since = new Date(now.getTime() - FRESH_HOURS * 3600000).toISOString();
  const nowIso = now.toISOString();
  try {
    let res = await readAll(admin, `${BASE_COLS}, ${NEW_COLS}`, since, nowIso);
    let migrated = true;
    if (res.error && (res.error.code === '42703' || res.error.code === 'PGRST204')) {
      migrated = false;
      res = await readAll(admin, BASE_COLS, since, nowIso);
    }
    if (res.error) throw new Error(res.error.message);
    const rows = res.rows.filter((r) => r.question);
    const updatedAt = rows.reduce(
      (max, r) => (r.indexed_at && r.indexed_at > (max || '') ? r.indexed_at : max),
      null,
    );
    const oldest = migrated ? await oldestSnapshot(admin) : null;
    let stale = false;
    if (!rows.length) {
      const { data } = await admin
        .from('prediction_market_index')
        .select('market_id')
        .eq('status', 'active')
        .limit(1);
      stale = Array.isArray(data) && data.length > 0;
    }
    return {
      cols: UNIVERSE_COLS,
      rows: rows.map(toClientRow),
      updatedAt,
      windows: availableWindows(oldest, now),
      stale,
    };
  } catch (e) {
    console.error('[prediction-markets] universe:', e?.message || e);
    return { ...empty, error: true };
  }
}

/** One index row by market id (any status), with what the chart needs. */
export async function getMarketForChart(marketId) {
  if (!isServerSupabaseConfigured() || !marketId) return null;
  const admin = getAdminClient();
  const cols =
    'market_id, platform, question, probability, volume, volume_24h, volume_unit, best_bid, best_ask, spread, end_date, link, yes_token_id, indexed_at';
  const read = (select) =>
    admin.from('prediction_market_index').select(select).eq('market_id', marketId).limit(1);
  let { data, error } = await read(`${cols}, event_key`);
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    ({ data, error } = await read(cols));
  }
  if (error || !data || !data.length) return null;
  return data[0];
}

/**
 * Active sibling outcomes of a market's event, most likely first, at most
 * `limit` including the market itself.
 */
export async function getEventSiblings(market, limit = 4) {
  if (!market) return [];
  const admin = getAdminClient();
  let q = admin
    .from('prediction_market_index')
    .select('market_id, platform, question, probability, yes_token_id, link')
    .eq('platform', market.platform)
    .eq('status', 'active')
    .order('probability', { ascending: false, nullsFirst: false })
    .limit(40);
  if (market.event_key) {
    q = q.eq('event_key', market.event_key);
  } else if (market.platform === 'kalshi') {
    const key = eventKeyOf(market);
    if (!key) return [market];
    q = q.like('market_id', `${key.replace(/[%_]/g, '')}-%`);
  } else {
    if (!market.link) return [market];
    q = q.eq('link', market.link);
  }
  const { data, error } = await q;
  if (error || !data) return [market];
  const others = data.filter((r) => r.market_id !== market.market_id);
  return [market, ...others].slice(0, limit);
}

/**
 * Snapshot volume per bucket for a market since `sinceMs`: the increase in
 * cumulative volume between consecutive snapshots, summed into `buckets`
 * equal periods. Empty until snapshots exist.
 */
export async function getSnapshotVolume(marketId, sinceMs, untilMs, buckets) {
  if (!isServerSupabaseConfigured() || !marketId) return [];
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('prediction_market_snapshots')
    .select('captured_at, volume')
    .eq('market_id', marketId)
    .gte('captured_at', new Date(sinceMs - 3 * 3600000).toISOString())
    .order('captured_at', { ascending: true })
    .limit(1000);
  if (error || !data || data.length < 2) return [];
  const span = (untilMs - sinceMs) / buckets;
  const out = Array.from({ length: buckets }, (_, i) => ({ t: sinceMs + (i + 0.5) * span, v: 0 }));
  for (let i = 1; i < data.length; i += 1) {
    const t = new Date(data[i].captured_at).getTime();
    if (t < sinceMs) continue;
    const d = Math.max(0, (n(data[i].volume) ?? 0) - (n(data[i - 1].volume) ?? 0));
    const b = Math.min(buckets - 1, Math.max(0, Math.floor((t - sinceMs) / span)));
    out[b].v += d;
  }
  return out.map((b) => ({ t: Math.round(b.t), v: Math.round(b.v) }));
}

/**
 * Index market ids for Polymarket outcome tokens, so a trader's position can
 * load the chart. Matches the stored YES token; a NO position resolves through
 * its opposite (YES) token. Returns Map(token -> market_id).
 */
export async function marketIdsForTokens(tokens) {
  const list = [...new Set((tokens || []).filter(Boolean).map(String))];
  if (!isServerSupabaseConfigured() || !list.length) return new Map();
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('prediction_market_index')
    .select('market_id, yes_token_id')
    .in('yes_token_id', list)
    .limit(list.length);
  if (error || !data) return new Map();
  return new Map(data.map((r) => [String(r.yes_token_id), r.market_id]));
}
