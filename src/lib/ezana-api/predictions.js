/**
 * Prediction-market pieces of the Ezana API that need no database: the row
 * shapes, the cross-venue category filter, history bucketing, the history
 * window and the consensus maths. Pure (tested by scripts/check-ezana-api.mjs);
 * handlers.js does the reads.
 */
import { PAGE_CATEGORIES, normalizeCategory } from '@/lib/prediction-markets/page-model';
import { ApiError } from './query';

export const PLATFORM_NAME = { polymarket: 'Polymarket', kalshi: 'Kalshi', manifold: 'Manifold' };

/** Snapshot history kept by the index cron (SNAPSHOT_RETENTION_DAYS). */
export const RETENTION_DAYS = 35;
export const HISTORY_CADENCE = 'about every 2 hours';
/** Movers ignore markets trading less than this per day (venue unit). */
export const MOVERS_MIN_VOLUME = 1000;

export const MARKET_ID_RE = /^[A-Za-z0-9_:.-]{1,120}$/;
export const EVENT_KEY_RE = /^(polymarket|kalshi):[A-Za-z0-9._-]{1,80}$/;

export const MARKET_SELECT =
  'market_id, question, outcome_label, event_key, event_title, platform, category, tag_ids, probability, best_bid, best_ask, spread, price_change_24h, change_7d, change_30d, volume, volume_24h, volume_7d, volume_30d, volume_norm, volume_unit, liquidity, recurrence, end_date, status, indexed_at, link';

export const EVENT_SELECT =
  'event_key, platform, title, category, tag_ids, recurrence, markets, active_markets, status, volume_unit, volume, volume_24h, volume_norm, ends_at, updated_at, leading_market_id, leading_outcome, leading_probability';

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export function marketOut(m) {
  return {
    id: m.market_id,
    question: m.question,
    outcome: m.outcome_label || null,
    event: m.event_key ? { key: m.event_key, title: m.event_title || null } : null,
    platform: m.platform,
    platform_name: PLATFORM_NAME[m.platform] || m.platform,
    category: normalizeCategory({ platform: m.platform, tag_ids: m.tag_ids, category: m.category }),
    venue_category: m.platform === 'kalshi' ? m.category || null : null,
    probability: num(m.probability),
    best_bid: num(m.best_bid),
    best_ask: num(m.best_ask),
    spread: num(m.spread),
    change_24h: num(m.price_change_24h),
    change_7d: num(m.change_7d),
    change_30d: num(m.change_30d),
    volume: num(m.volume),
    volume_24h: num(m.volume_24h),
    volume_7d: num(m.volume_7d),
    volume_30d: num(m.volume_30d),
    avg_daily_volume: num(m.volume_norm),
    volume_unit: m.volume_unit || null,
    liquidity: num(m.liquidity),
    recurrence: m.recurrence || null,
    ends_at: m.end_date,
    status: m.status,
    updated_at: m.indexed_at,
    url: m.link,
  };
}

/** One row of prediction_events_mat. */
export function eventOut(e) {
  return {
    key: e.event_key,
    title: e.title,
    platform: e.platform,
    category: normalizeCategory({ platform: e.platform, tag_ids: e.tag_ids, category: e.category }),
    recurrence: e.recurrence || null,
    markets: num(e.markets),
    active_markets: num(e.active_markets),
    leading: e.leading_market_id
      ? {
          market_id: e.leading_market_id,
          outcome: e.leading_outcome || null,
          probability: num(e.leading_probability),
        }
      : null,
    volume: num(e.volume),
    volume_24h: num(e.volume_24h),
    avg_daily_volume: num(e.volume_norm),
    volume_unit: e.volume_unit || null,
    ends_at: e.ends_at,
    status: e.status,
    updated_at: e.updated_at,
  };
}

/** One row of crowd_forecasts (Manifold, play money). */
export function forecastOut(f) {
  return {
    id: f.forecast_id,
    platform: f.platform,
    question: f.question,
    probability: num(f.probability),
    forecasters: num(f.forecasters),
    volume: num(f.volume),
    volume_unit: f.volume_unit || null,
    closes_at: f.close_date,
    status: f.status,
    url: f.link,
  };
}

/* PostgREST value quoting inside in()/or(): double-quote and escape. */
const pq = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * The SQL side of an Ezana category slug. Kalshi rows match on their own
 * category name (any of the slug's names, case as the venue writes it);
 * Polymarket rows match when tag_ids overlaps the slug's tag ids. Returns
 * { platform, kalshi, poly, or }, where `or` is the PostgREST or() string to
 * use when both venues are in play. Unknown slug: null.
 */
export function categoryFilter(slug, platform = null) {
  const c = PAGE_CATEGORIES.find((x) => x.slug === slug);
  if (!c) return null;
  const names = c.kalshi.map(pq).join(',');
  const ids = c.poly.map(pq).join(',');
  return {
    platform,
    kalshi: c.kalshi,
    poly: c.poly,
    or: `and(platform.eq.kalshi,category.in.(${names})),and(platform.eq.polymarket,tag_ids.ov.{${ids}})`,
  };
}

/** Apply a category slug to a query builder over rows with platform/category/tag_ids. */
export function applyCategory(qb, slug, platform = null) {
  const f = categoryFilter(slug, platform);
  if (!f) return qb;
  if (platform === 'kalshi') return qb.in('category', f.kalshi);
  if (platform === 'polymarket') return qb.overlaps('tag_ids', f.poly);
  return qb.or(f.or);
}

/**
 * The history window: from (inclusive, default the oldest retained day) to
 * (inclusive, default now). A `from` older than retention is a 400
 * out_of_range; the window never spans more than RETENTION_DAYS.
 */
export function historyWindow({ from, to } = {}, now = new Date()) {
  const oldest = new Date(now.getTime() - RETENTION_DAYS * 86400000);
  const oldestDay = oldest.toISOString().slice(0, 10);
  if (from && from < oldestDay) {
    throw new ApiError(
      400,
      'out_of_range',
      `History is kept for ${RETENTION_DAYS} days: "from" must be ${oldestDay} or later.`,
    );
  }
  const fromMs = Math.max(oldest.getTime(), from ? Date.parse(`${from}T00:00:00Z`) : 0);
  const toMs = Math.min(now.getTime(), to ? Date.parse(`${to}T23:59:59.999Z`) : now.getTime());
  return { fromIso: new Date(fromMs).toISOString(), toIso: new Date(toMs).toISOString() };
}

const BUCKET_MS = { '4h': 4 * 3600000, '1d': 86400000 };

/**
 * Snapshots (any order) to history points, oldest first. raw keeps every
 * snapshot; 4h and 1d keep the LAST snapshot in each UTC bucket.
 */
export function bucketHistory(rows, interval = '4h') {
  const pts = (rows || [])
    .filter((r) => r && r.captured_at)
    .map((r) => ({
      at: new Date(r.captured_at).toISOString(),
      probability: num(r.probability),
      best_bid: num(r.best_bid),
      best_ask: num(r.best_ask),
      volume: num(r.volume),
      volume_24h: num(r.volume_24h),
      liquidity: num(r.liquidity),
    }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const size = BUCKET_MS[interval];
  if (!size) return pts;
  const last = new Map();
  for (const p of pts) last.set(Math.floor(Date.parse(p.at) / size), p);
  return [...last.values()];
}

/**
 * Consensus over markets the caller chose as asking the same question.
 * Same volume unit everywhere: weight by average daily volume. Mixed units
 * (usd vs contracts): each venue gets an equal share, split by volume within
 * the venue. Markets with no volume share their group's weight equally.
 */
export function consensusOf(markets) {
  const ms = (markets || []).filter((m) => Number.isFinite(m?.probability));
  if (ms.length < 2) {
    throw new ApiError(400, 'invalid_param', 'Consensus needs at least two markets with a price.');
  }
  const units = new Set(ms.map((m) => m.volume_unit || 'unknown'));
  const mixed = units.size > 1;
  const groups = new Map();
  for (const m of ms) {
    const g = mixed ? m.platform : 'all';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(m);
  }
  const weights = new Map();
  const share = 1 / groups.size;
  for (const g of groups.values()) {
    const vols = g.map((m) => Math.max(0, Number(m.avg_daily_volume) || 0));
    const total = vols.reduce((s, v) => s + v, 0);
    g.forEach((m, i) => weights.set(m.id, share * (total > 0 ? vols[i] / total : 1 / g.length)));
  }
  const ps = ms.map((m) => m.probability);
  const round = (x) => Math.round(x * 10000) / 10000;
  const weighted = ms.reduce((s, m) => s + m.probability * weights.get(m.id), 0);
  const min = Math.min(...ps);
  const max = Math.max(...ps);
  return {
    consensus: {
      volume_weighted: round(weighted),
      simple_mean: round(ps.reduce((s, p) => s + p, 0) / ps.length),
      min,
      max,
      dispersion: round(max - min),
    },
    weights: ms.map((m) => ({ id: m.id, weight: round(weights.get(m.id)) })),
    weighting: mixed ? 'venue_equal' : 'volume',
  };
}

/** "Polymarket and Kalshi" from the platforms present (in a stable order). */
export function venuesLabel(platforms) {
  const order = ['polymarket', 'kalshi', 'manifold'];
  const names = order.filter((p) => platforms.has(p)).map((p) => PLATFORM_NAME[p]);
  if (!names.length) return null;
  return names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Newest timestamp among the values (ISO strings), or null. */
export function newest(values) {
  let best = null;
  for (const v of values) if (v && (!best || Date.parse(v) > Date.parse(best))) best = v;
  return best;
}
