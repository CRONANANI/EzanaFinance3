/**
 * Server read layer for trending prediction markets. Service-role reads only;
 * the index crons are the only writers. Fails open: any error returns an empty
 * list, and rows older than FRESH_HOURS are never returned as current (the
 * crons run every two hours, so six hours means at least two missed runs).
 *
 * One card per event: outcomes of the same event (every team in a division
 * race, every candidate in an election) share an event_key, and only the
 * highest-scoring outcome represents the event. Each card carries the event's
 * top outcomes by probability so the UI can show the race, not one runner.
 *
 * The probability band and the closing window are re-checked here as well as
 * in the scorer, so rows scored before a rule change never slip through.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { TRENDING_RULES } from '@/lib/prediction-markets/trending';

const FRESH_HOURS = 6;
const OVERFETCH = 4; // rows per requested card, so grouping still fills the list
const MAX_FETCH = 200;
const OUTCOMES_PER_EVENT = 3;
const COLS =
  'market_id, platform, question, probability, price_change_24h, volume, volume_24h, volume_unit, best_bid, best_ask, spread, end_date, link, category, trending_score, indexed_at, event_key, event_title, outcome_label';
const OUTCOME_COLS = 'market_id, event_key, outcome_label, question, probability, price_change_24h';

const n = (v) => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

const keyOf = (m) => m.event_key || m.market_id;

function shapeOutcome(o) {
  return {
    id: o.market_id,
    label: o.outcome_label || o.question,
    probability: n(o.probability),
    change24h: n(o.price_change_24h),
  };
}

function shape(m, outcomes) {
  return {
    id: m.market_id,
    venue: m.platform,
    eventKey: keyOf(m),
    eventTitle: m.event_title || m.question,
    outcome: m.outcome_label || null,
    question: m.question,
    probability: n(m.probability),
    change24h: n(m.price_change_24h),
    volume: n(m.volume),
    volume24h: n(m.volume_24h),
    volumeUnit: m.volume_unit || (m.platform === 'kalshi' ? 'contracts' : 'usd'),
    bid: n(m.best_bid),
    ask: n(m.best_ask),
    spread: n(m.spread),
    closes: m.end_date || null,
    url: m.link || null,
    category: m.category || null,
    score: n(m.trending_score),
    indexedAt: m.indexed_at,
    outcomes: outcomes && outcomes.length ? outcomes.map(shapeOutcome) : [shapeOutcome(m)],
  };
}

/** Category filter is a case-insensitive exact match; wildcards are stripped. */
function cleanCategory(c) {
  const s = String(c || '')
    .replace(/[%_\\]/g, '')
    .trim()
    .slice(0, 64);
  return s || null;
}

async function topOn(admin, platform, { limit, since, closeAfter, category }) {
  let q = admin
    .from('prediction_market_index')
    .select(COLS)
    .eq('platform', platform)
    .eq('status', 'active')
    .not('trending_score', 'is', null)
    .gte('indexed_at', since)
    .gte('probability', TRENDING_RULES.minProbability)
    .lte('probability', TRENDING_RULES.maxProbability)
    .or(`end_date.is.null,end_date.gt."${closeAfter}"`)
    .order('trending_score', { ascending: false })
    .limit(Math.min(limit * OVERFETCH, MAX_FETCH));
  if (category) q = q.ilike('category', category);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

/** Keeps the first (highest-scoring) row per event, up to limit events. */
function onePerEvent(rows, limit) {
  const seen = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!seen.has(k)) seen.set(k, r);
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

/** Top outcomes by probability for each grouped event. Missing or failed = []. */
async function outcomesFor(admin, eventKeys) {
  const out = new Map();
  await Promise.all(
    eventKeys.map(async (k) => {
      const { data, error } = await admin
        .from('prediction_market_index')
        .select(OUTCOME_COLS)
        .eq('event_key', k)
        .eq('status', 'active')
        .order('probability', { ascending: false, nullsFirst: false })
        .limit(OUTCOMES_PER_EVENT);
      out.set(k, !error && Array.isArray(data) ? data : []);
    }),
  );
  return out;
}

/** True when scored rows exist but none are fresh: the feed is behind, not empty. */
async function hasOnlyStale(admin, platforms) {
  const { data, error } = await admin
    .from('prediction_market_index')
    .select('market_id')
    .in('platform', platforms)
    .eq('status', 'active')
    .not('trending_score', 'is', null)
    .limit(1);
  return !error && Array.isArray(data) && data.length > 0;
}

/**
 * Trending events, highest score first, one card per event.
 * venue: 'all' | 'polymarket' | 'kalshi'. With 'all', each venue is queried
 * separately and merged by score (scores are per-venue percentiles, so a
 * merged sort interleaves the two fairly).
 */
export async function getTrendingMarkets({ venue = 'all', limit = 12, category = null } = {}) {
  const empty = { venue, markets: [], updatedAt: null, stale: false };
  if (!isServerSupabaseConfigured()) return empty;
  const platforms = venue === 'all' ? ['polymarket', 'kalshi'] : [venue];
  const nowMs = Date.now();
  const opts = {
    limit,
    since: new Date(nowMs - FRESH_HOURS * 3600000).toISOString(),
    closeAfter: new Date(nowMs + TRENDING_RULES.minHoursToClose * 3600000).toISOString(),
    category: cleanCategory(category),
  };
  try {
    const admin = getAdminClient();
    const lists = await Promise.all(platforms.map((p) => topOn(admin, p, opts)));
    const merged = lists.flat().sort((a, b) => n(b.trending_score) - n(a.trending_score));
    const leaders = onePerEvent(merged, limit);
    const grouped = leaders.filter((m) => m.event_key).map((m) => m.event_key);
    const outcomes = await outcomesFor(admin, grouped);
    const markets = leaders.map((m) => shape(m, m.event_key ? outcomes.get(m.event_key) : null));
    const updatedAt = markets.reduce(
      (max, m) => (m.indexedAt && m.indexedAt > (max || '') ? m.indexedAt : max),
      null,
    );
    const stale = markets.length === 0 ? await hasOnlyStale(admin, platforms) : false;
    return { venue, markets, updatedAt, stale };
  } catch (e) {
    console.error('[prediction-markets] trending:', e?.message || e);
    return empty;
  }
}
