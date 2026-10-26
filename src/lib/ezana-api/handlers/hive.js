/**
 * Ezana API handlers: hive dimension (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js.
 */
import { ApiError, dbError, getAdminClient, insightCache, newestDate, num } from '../handler-kit';
import { EVENT_SELECT, eventOut } from '../predictions';
import { CROSS_VENUE_FLOOR, compareOutcomes, matchEvents } from '../insights/hive';

const round4 = (x) => Math.round(x * 10000) / 10000;

async function crossVenue({ minSimilarity, category, sort, limit }) {
  const admin = getAdminClient();
  const { data: events, error } = await admin
    .from('prediction_events_mat')
    .select(EVENT_SELECT)
    .eq('status', 'active')
    .in('platform', ['polymarket', 'kalshi'])
    .limit(5000);
  if (error) throw dbError('prediction_events_mat', error);
  const shaped = (events || []).map((e) => ({ ...eventOut(e), title: e.title }));
  const poly = shaped.filter((e) => e.platform === 'polymarket');
  const kalshi = shaped.filter((e) => e.platform === 'kalshi');
  let pairs = matchEvents(poly, kalshi, minSimilarity);
  if (category) {
    pairs = pairs.filter((p) => p.poly.category === category || p.kalshi.category === category);
  }

  const keys = [...new Set(pairs.flatMap((p) => [p.poly.key, p.kalshi.key]))];
  const outcomes = new Map();
  for (let i = 0; i < keys.length; i += 100) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error: oErr } = await admin
      .from('prediction_market_index')
      .select('market_id, event_key, outcome_label, question, probability')
      .in('event_key', keys.slice(i, i + 100))
      .eq('status', 'active')
      .limit(5000);
    if (oErr) throw dbError('prediction_market_index', oErr);
    for (const o of data || []) {
      if (!outcomes.has(o.event_key)) outcomes.set(o.event_key, []);
      outcomes.get(o.event_key).push({
        id: o.market_id,
        outcome: o.outcome_label || o.question,
        probability: num(o.probability),
      });
    }
  }

  const side = (e, o) => ({
    event_key: e.key,
    title: e.title,
    market_id: o.id,
    outcome: o.outcome,
    probability: o.probability,
    volume_24h: e.volume_24h,
    volume_unit: e.volume_unit,
    ends_at: e.ends_at,
  });
  const rows = [];
  for (const p of pairs) {
    const c = compareOutcomes(outcomes.get(p.poly.key), outcomes.get(p.kalshi.key));
    if (!c) continue;
    const gap = round4(c.poly.probability - c.kalshi.probability);
    rows.push({
      similarity: p.similarity,
      matched_on: c.matched_on,
      outcome: c.matched_on === 'outcome' ? c.poly.outcome : null,
      ...(c.matched_on === 'leader' ? { same_leader: c.same_leader } : {}),
      gap,
      abs_gap: Math.abs(gap),
      polymarket: side(p.poly, c.poly),
      kalshi: side(p.kalshi, c.kalshi),
      _updated: [p.poly.updated_at, p.kalshi.updated_at],
    });
  }
  /* Same-outcome comparisons first: a gap between two different leaders
     compares different outcomes, so those rank after every real match. */
  const tier = (r) => (r.matched_on === 'outcome' ? 0 : 1);
  rows.sort((a, b) =>
    sort === 'similarity'
      ? b.similarity - a.similarity || tier(a) - tier(b) || b.abs_gap - a.abs_gap
      : tier(a) - tier(b) || b.abs_gap - a.abs_gap || b.similarity - a.similarity,
  );
  const kept = rows.slice(0, limit);
  return {
    data: kept.map(({ _updated, ...r }) => r),
    page: { limit, has_more: rows.length > limit, next: null },
    meta: {
      source: 'Polymarket and Kalshi',
      as_of: newestDate(kept.flatMap((r) => r._updated)),
      min_similarity: minSimilarity,
      pairs_found: rows.length,
    },
  };
}

export const HANDLERS = {
  'predictions.cross_venue': ({ params }) => {
    const minSimilarity = params.min_similarity ?? 0.75;
    if (minSimilarity < CROSS_VENUE_FLOOR || minSimilarity > 1) {
      throw new ApiError(400, 'invalid_param', '"min_similarity" must be between 0.6 and 1.');
    }
    const args = {
      minSimilarity,
      category: params.category || null,
      sort: params.sort || 'gap',
      limit: params.limit,
    };
    return insightCache('hive', 'predictions.cross_venue', args, () => crossVenue(args));
  },
};

/* Database functions these handlers call that exist in production but no
   migration creates (verified live with a read-only pg_proc query). The API
   guard test accepts an RPC only if a migration creates it or it is here. */
export const LIVE_ONLY_RPCS = [];
