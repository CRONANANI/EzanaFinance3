/**
 * Server read layer for trending prediction markets. Service-role reads only;
 * the index crons are the only writers. Fails open: any error returns an empty
 * list, and rows older than FRESH_HOURS are never returned as current (the
 * crons run every two hours, so six hours means at least two missed runs).
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

const FRESH_HOURS = 6;
const COLS =
  'market_id, platform, question, probability, price_change_24h, volume, volume_24h, volume_unit, best_bid, best_ask, spread, end_date, link, category, trending_score, indexed_at';

const n = (v) => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

function shape(m) {
  return {
    id: m.market_id,
    venue: m.platform,
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

async function topOn(admin, platform, { limit, since, now, category }) {
  let q = admin
    .from('prediction_market_index')
    .select(COLS)
    .eq('platform', platform)
    .eq('status', 'active')
    .not('trending_score', 'is', null)
    .gte('indexed_at', since)
    .or(`end_date.is.null,end_date.gt."${now}"`)
    .order('trending_score', { ascending: false })
    .limit(limit);
  if (category) q = q.ilike('category', category);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
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
 * Trending markets, highest score first.
 * venue: 'all' | 'polymarket' | 'kalshi'. With 'all', each venue is queried
 * separately and merged by score (scores are per-venue percentiles, so a
 * merged sort interleaves the two fairly).
 */
export async function getTrendingMarkets({ venue = 'all', limit = 12, category = null } = {}) {
  const empty = { venue, markets: [], updatedAt: null, stale: false };
  if (!isServerSupabaseConfigured()) return empty;
  const platforms = venue === 'all' ? ['polymarket', 'kalshi'] : [venue];
  const opts = {
    limit,
    since: new Date(Date.now() - FRESH_HOURS * 3600000).toISOString(),
    now: new Date().toISOString(),
    category: cleanCategory(category),
  };
  try {
    const admin = getAdminClient();
    const lists = await Promise.all(platforms.map((p) => topOn(admin, p, opts)));
    const markets = lists
      .flat()
      .sort((a, b) => n(b.trending_score) - n(a.trending_score))
      .slice(0, limit)
      .map(shape);
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
