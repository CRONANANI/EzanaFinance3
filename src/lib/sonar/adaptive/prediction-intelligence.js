/**
 * Sonar adaptive research: event market intelligence (Nov 2026).
 *
 * A prediction market is shown only when it is about the event the question
 * asks about. Retrieval (the existing hybrid retriever over
 * prediction_market_index) finds candidates; this module decides which of
 * them, if any, may be displayed, and how they are described.
 *
 * The rules a contract must pass (matchMarketSemantics):
 *   - it names the entity (the company, by name or ticker; or the person)
 *   - it is about the same event type (for succession: who becomes or is
 *     named CEO), not a neighbour of it. "Will X return as CEO?" is a
 *     different question from "Who will be the next CEO?", and a market on
 *     the company's earnings or share price is not a succession market
 *   - it is open: status active, and its end date has not passed
 *   - it has a quoted price
 *
 * What is never done here: prices from different contracts or venues are not
 * added, averaged or turned into a consensus; a price is reported as that
 * contract's last indexed price, with the time it was indexed. The index is
 * refreshed on a schedule, so nothing is called live.
 *
 * No match is a valid answer. The caller then omits the section and says so
 * once (layout-planner.js).
 */

const lc = (s) => String(s || '').toLowerCase();

/* Event grammars: what a contract's question must say, and what disqualifies it. */
const EVENT_RULES = {
  succession: {
    need: /\b(ceo|chief executive)\b/i,
    about:
      /\b(next|new|permanent|replace[sd]?|successor|succeed|named|appoint(ed|s)?|become[s]?|who will (be|lead|run)|announce[sd]? .{0,20}ceo)\b/i,
    not: /\b(return|come back|reinstat|rehire|earnings|revenue|stock price|share price|market cap|close above|close below|all[- ]time high)\b/i,
  },
  /* Any open, priced contract that names the entities asked about. The entity test below
     does the matching; there is no event wording to require. */
  topic: { need: /./, about: /./, not: /$^/ },
  leadership_exit: {
    need: /\b(ceo|chief executive)\b/i,
    about: /\b(resign|step down|out as|leave|fired|ousted|depart)\b/i,
    not: /\b(earnings|revenue|stock price|share price|market cap)\b/i,
  },
};

/**
 * Does this indexed market answer this question?
 * @param {object} market  a prediction_market_index row
 * @param {{ eventType: 'succession'|'leadership_exit', entityTerms: string[], now?: Date }} target
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function matchMarketSemantics(
  market,
  { eventType, entityTerms = [], now = new Date() } = {},
) {
  const reasons = [];
  const rule = EVENT_RULES[eventType];
  if (!rule) return { ok: false, reasons: ['unknown event type'] };
  const q = lc(market?.question);
  const text = `${q} ${lc(market?.description)}`;
  const terms = entityTerms.map(lc).filter((t) => t.length >= 3);
  if (!terms.length) reasons.push('no entity to match');
  else if (
    !terms.some((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text))
  )
    reasons.push('does not name the entity');
  if (!rule.need.test(q)) reasons.push('not about the role');
  if (!rule.about.test(q)) reasons.push('not about this event');
  if (rule.not.test(q)) reasons.push('about a different outcome');
  const status = lc(market?.status);
  if (!['active', 'true', 'open'].includes(status))
    reasons.push(`not open (${status || 'no status'})`);
  if (market?.end_date && new Date(market.end_date) < now) reasons.push('end date has passed');
  const p = Number(market?.probability);
  if (market?.probability == null || !Number.isFinite(p) || p < 0 || p > 1)
    reasons.push('no quoted price');
  return { ok: reasons.length === 0, reasons };
}

const VENUES = { polymarket: 'Polymarket', kalshi: 'Kalshi' };

/** One contract as the page shows it: venue-native figures, the index time, no derived odds. */
export function normalizeMarket(market, now = new Date()) {
  const yes = Number(market.probability);
  const indexedAt = market.indexed_at ? new Date(market.indexed_at) : null;
  const ageHours = indexedAt ? (now - indexedAt) / 3600000 : null;
  const venue = lc(market.platform);
  return {
    id: String(market.market_id),
    venue: VENUES[venue] || market.platform || 'Prediction market',
    question: String(market.question),
    yesPrice: Number(yes.toFixed(3)),
    noPrice: Number((1 - yes).toFixed(3)),
    impliedPct: Math.round(yes * 100),
    volume: Number.isFinite(Number(market.volume)) ? Number(market.volume) : null,
    volumeUnit: venue === 'kalshi' ? 'contracts' : 'USD',
    liquidity: Number.isFinite(Number(market.liquidity)) ? Number(market.liquidity) : null,
    endDate: market.end_date ? String(market.end_date).slice(0, 10) : null,
    url: /^https:\/\//.test(String(market.link || '')) ? market.link : null,
    indexedAt: indexedAt ? indexedAt.toISOString() : null,
    freshness: ageHours == null ? 'unknown' : ageHours <= 6 ? 'latest_indexed' : 'stale',
    lowLiquidity:
      (Number.isFinite(Number(market.volume)) && Number(market.volume) < 10000) ||
      (Number.isFinite(Number(market.liquidity)) && Number(market.liquidity) < 2000),
    resolution:
      String(market.description || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 400) || null,
  };
}

/**
 * Candidate markets for a question, then only the ones that pass the semantic rules.
 *
 * @param {object} deps
 * @param {(query: string, ctx: object, opts: object) => Promise<object[]>} deps.retrieve
 *        the existing markets retriever (research-copilot/retrievers/markets.js)
 * @param {object} deps.admin  service-role client, to read the full index rows
 * @param {{ query: string, eventType: string, entityTerms: string[], now?: Date, limit?: number }} args
 * @returns {Promise<{ markets: object[], considered: number, rejected: {question, reasons}[] }>}
 */
export async function discoverMarkets(
  { retrieve, admin },
  { query, eventType, entityTerms, now = new Date(), limit = 6 },
) {
  let hits = [];
  try {
    hits = (await retrieve(query, { admin }, { limit: 12 })) || [];
  } catch {
    hits = [];
  }
  const ids = [...new Set(hits.map((h) => String(h.id)).filter(Boolean))].slice(0, 24);
  if (!ids.length) return { markets: [], considered: 0, rejected: [] };
  let rows = [];
  try {
    const { data } = await admin
      .from('prediction_market_index')
      .select(
        'market_id, platform, question, description, probability, volume, liquidity, end_date, status, link, category, indexed_at',
      )
      .in('market_id', ids);
    rows = data || [];
  } catch {
    rows = [];
  }
  const markets = [];
  const rejected = [];
  for (const row of rows) {
    const verdict = matchMarketSemantics(row, { eventType, entityTerms, now });
    if (verdict.ok) markets.push(normalizeMarket(row, now));
    else rejected.push({ question: String(row.question).slice(0, 140), reasons: verdict.reasons });
  }
  markets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  return { markets: markets.slice(0, limit), considered: rows.length, rejected };
}
