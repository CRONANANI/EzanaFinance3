/**
 * Bill ↔ Polymarket matching + edge math (Betting Markets Engine framework).
 *
 * Matches active legislation/politics prediction markets to tracked bills and
 * compares the market's IMPLIED probability against our structural model
 * probability (passage-model.js) to surface an informational edge.
 *
 * COMPLIANCE (non-negotiable): informational market analysis ONLY. We show
 * "market-implied probability" vs "our model estimate (methodology →)". NO bet
 * recommendations, NO Kelly / stake sizing, NO "buy YES". A visible disclaimer
 * accompanies every surface.
 *
 * Oct 18 rewrite of the matcher. The old score was shared keywords divided by
 * the SMALLER keyword set, with a 0.34 floor and dates left in. A market like
 * "Will Bitcoin dip to $80,000 October 12-18?" reduces to {bitcoin, october},
 * so the one word "October" in "National Wildlife Refuge Week (October 10)"
 * scored 0.5 and paired a ceremonial resolution with a crypto price market.
 * The route's `tag: 'politics'` filter was also silently ignored by Gamma
 * (it filters on numeric tag_id), which is how crypto and sports markets got
 * into the candidate pool. Now:
 *   1. Bills that cannot have a market (ceremonial titles, and simple or
 *      concurrent resolutions other than impeachment, censure or expulsion)
 *      are never candidates, unless overridden.
 *   2. Markets must read as legislative (act, bill, law, pass, sign, veto,
 *      Congress, shutdown, appropriations ...) to be candidates.
 *   3. Dates, months, numbers and generic legislative words never count.
 *   4. A pair needs the bill's short title as a phrase in the question, or at
 *      least two shared distinctive words AND a Dice score of 0.5 or more,
 *      measured against BOTH texts so one short side cannot carry it.
 *   5. Pairing is global best-first: the strongest pairs claim their market
 *      first, one market per bill and one bill per market.
 *   6. Edges below the engine's 1-point display floor (net of half the
 *      quoted spread) carry confidence 'none' and no edge figure.
 */

/**
 * Manual override map for high-profile bills (fuzzy title matching needs
 * curation). Key = bill id `${congress}-${type}-${number}`; value = the
 * Polymarket market slug to pair. Extend as markets appear. An override
 * bypasses every gate above.
 * @type {Record<string,string>}
 */
export const BILL_MARKET_OVERRIDES = {
  // '119-hr-1': 'will-hr1-become-law-2025',
};

/** Simple and concurrent resolutions: mostly ceremonial or procedural and
 *  never the subject of a "will X pass" market. The exceptions are the ones
 *  markets do trade (impeachment, censure, expulsion), so those stay in.
 *  Joint resolutions (hjres/sjres) are lawmaking and always stay in. */
export const NON_MARKET_BILL_TYPES = new Set(['hres', 'sres', 'hconres', 'sconres']);
const MARKETABLE_RESOLUTION_RE = /\b(impeach\w*|censur\w*|expel\w*|expulsion)\b/i;
/** Commemorative titles of any type: weeks, days, months, honours, goals and
 *  ideals. No market is ever about one. */
const CEREMONIAL_TITLE_RE =
  /^(a resolution )?(supporting|recognizing|expressing|honoring|honouring|commemorating|celebrating|congratulating|memorializing|designating|reaffirming|acknowledging|commending)\b/i;

/** A market must read as a question about legislation to be matched. */
const LEGISLATIVE_RE =
  /\b(act|acts|bill|bills|law|laws|legislation|pass|passes|passed|sign|signs|signed|veto|vetoes|vetoed|congress|congressional|senate|house|enact|enacted|appropriations?|reconciliation|shutdown|ndaa|resolution|filibuster|cloture)\b/i;

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
];

/* Words that say nothing about WHICH bill or market this is. Generic
   legislative vocabulary is here on purpose: every bill title and every
   legislative market contains it, so it can never be evidence of a pair. */
const STOPWORDS = new Set([
  ...MONTHS,
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'than',
  'that',
  'this',
  'these',
  'those',
  'other',
  'purposes',
  'certain',
  'such',
  'any',
  'all',
  'its',
  'their',
  'his',
  'her',
  'will',
  'would',
  'shall',
  'are',
  'was',
  'were',
  'been',
  'before',
  'after',
  'end',
  'year',
  'years',
  'week',
  'weeks',
  'month',
  'months',
  'day',
  'days',
  'act',
  'acts',
  'bill',
  'bills',
  'law',
  'laws',
  'become',
  'becomes',
  'pass',
  'passes',
  'passed',
  'sign',
  'signs',
  'signed',
  'enact',
  'enacted',
  'house',
  'senate',
  'congress',
  'congressional',
  'united',
  'states',
  'federal',
  'national',
  'american',
  'america',
  'amend',
  'amends',
  'amendment',
  'amendments',
  'title',
  'code',
  'section',
  'require',
  'requires',
  'direct',
  'establish',
  'provide',
  'program',
  'programs',
  'secretary',
  'designation',
  'designating',
  'supporting',
  'recognizing',
  'expressing',
  'sense',
  'resolution',
]);

/** Light suffix stemming so "impeaching" and "impeach", "sales" and "sale"
 *  count as one word. Deliberately crude: it only has to make bill titles
 *  and market questions agree with each other, not produce real roots. */
function stem(w) {
  if (w.length > 6 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 5 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** Distinctive content words: lowercase, no punctuation, no numbers, no dates,
 *  no generic legislative vocabulary, at least three letters, stemmed. */
export function contentTokens(str) {
  return new Set(
    String(str || '')
      .toLowerCase()
      .replace(/['’]s\b/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !/\d/.test(w) && !STOPWORDS.has(w))
      .map(stem),
  );
}

/** "NO FAKES Act of 2026" → "no fakes act". Long-title bills ("To amend ...",
 *  "A bill to ...") have no short title and return null. */
export function shortTitle(billTitle) {
  const t = String(billTitle || '').trim();
  if (/^(to|a bill to|an act to|a joint resolution|joint resolution)\b/i.test(t)) return null;
  const m = t.match(/^(.*?\bact)\b/i);
  if (!m) return null;
  const core = m[1]
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  /* "act" alone is not a usable phrase; neither is a name with no
     distinctive word in it. */
  return core.split(' ').length >= 2 && contentTokens(core).size >= 1 ? core : null;
}

function normalizedPhrase(str) {
  return ` ${String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/** True when a market question reads as a question about legislation. */
export function isLegislativeMarket(question) {
  return LEGISLATIVE_RE.test(String(question || ''));
}

/** True when a bill can plausibly be the subject of a market. */
export function isMarketableBill(bill) {
  const title = String(bill?.title || '');
  if (CEREMONIAL_TITLE_RE.test(title)) return false;
  if (NON_MARKET_BILL_TYPES.has(String(bill?.type || '').toLowerCase())) {
    return MARKETABLE_RESOLUTION_RE.test(title);
  }
  return true;
}

/**
 * Match strength of a bill title vs a market question, 0..1.
 * 1 = the bill's short title appears verbatim as a phrase in the question.
 * Otherwise the Dice coefficient of the two content-token sets, and 0 unless
 * at least two distinctive words are shared.
 */
export function titleMatchScore(billTitle, marketQuestion) {
  const st = shortTitle(billTitle);
  if (st && normalizedPhrase(marketQuestion).includes(` ${st} `)) return 1;
  const a = contentTokens(billTitle);
  const b = contentTokens(marketQuestion);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  if (inter < 2) return 0;
  return (2 * inter) / (a.size + b.size);
}

/** Parse Polymarket outcomes/prices (strings or arrays) → [{name, prob}] desc.
 *  Polymarket outcomePrices ARE implied probabilities in [0,1] (vig-free-ish for
 *  2-outcome markets), the same reading match.js's normalizeProbability uses. */
export function marketImplied(market) {
  const parse = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  const names = parse(market.outcomes);
  const prices = parse(market.outcomePrices);
  const out = [];
  for (let i = 0; i < Math.max(names.length, prices.length); i++) {
    const prob = Number(prices[i]);
    if (Number.isFinite(prob)) out.push({ name: names[i] || (i === 0 ? 'Yes' : 'No'), prob });
  }
  return out.sort((a, b) => b.prob - a.prob);
}

/**
 * Confidence tier per the Betting Markets Engine (section 3b), on the edge net
 * of half the quoted spread: crossing half the spread is the minimum cost of
 * acting on a gap, so a gap inside it is not one.
 *   high ≥ 4 pts · medium ≥ 2 · low ≥ 1 · none < 1 (no edge shown)
 */
export function edgeConfidence(edge, spread) {
  if (edge == null) return 'none';
  const half = Number.isFinite(spread) && spread > 0 ? spread / 2 : 0;
  /* Rounded to the micro-point so 0.015 - 0.005 reads as 0.01, not 0.00999. */
  const net = Math.round((Math.abs(edge) - half) * 1e6) / 1e6;
  if (net >= 0.04) return 'high';
  if (net >= 0.02) return 'medium';
  if (net >= 0.01) return 'low';
  return 'none';
}

/**
 * Edge of our model vs the market's implied "Yes" probability.
 * edge = model − implied ; EV% = (model − implied) / (1 − implied) × 100
 * (Betting Engine formula, shown as analysis, never as a stake instruction.)
 * Below the display floor the edge and EV% are withheld (null).
 */
export function computeEdge(modelProbability, market) {
  const outs = marketImplied(market);
  const yes = outs.find((o) => /^yes$/i.test(o.name)) || outs[0];
  const implied = yes ? yes.prob : null;
  const rawSpread = market?.spread == null ? NaN : Number(market.spread);
  const spread = Number.isFinite(rawSpread) ? rawSpread : null;
  const model = modelProbability ?? null;
  if (implied == null || model == null) {
    return { implied, model, edge: null, evPct: null, spread, confidence: 'none' };
  }
  const edge = model - implied;
  const confidence = edgeConfidence(edge, spread);
  if (confidence === 'none') {
    return { implied, model, edge: null, evPct: null, spread, confidence };
  }
  const evPct = implied < 1 ? (edge / (1 - implied)) * 100 : null;
  return {
    implied,
    model,
    edge: Number(edge.toFixed(4)),
    evPct: evPct == null ? null : Number(evPct.toFixed(1)),
    spread,
    confidence,
  };
}

export const DEFAULT_MATCH_THRESHOLD = 0.5;

/**
 * Pair tracked bills to markets: manual overrides first, then the strongest
 * title matches above the threshold, assigned globally best-first.
 * @param {Array} bills   ingested bills (need id, type, title, model_probability, stage)
 * @param {Array} markets polymarket markets (need question, slug, outcomes, outcomePrices, volume)
 * @param {number} threshold min title-match score (0..1) when no override
 */
export function matchBillsToMarkets(bills = [], markets = [], threshold = DEFAULT_MATCH_THRESHOLD) {
  const bySlug = new Map(markets.map((m) => [m.slug, m]));
  const usedSlugs = new Set();
  const usedBills = new Set();
  const chosen = [];

  for (const bill of bills) {
    const slug = BILL_MARKET_OVERRIDES[bill.id];
    if (slug && bySlug.has(slug) && !usedSlugs.has(slug)) {
      usedSlugs.add(slug);
      usedBills.add(bill.id);
      chosen.push({ bill, market: bySlug.get(slug), score: 1 });
    }
  }

  const candidates = [];
  const legislative = markets.filter((m) => isLegislativeMarket(m.question));
  for (const bill of bills) {
    if (usedBills.has(bill.id) || !isMarketableBill(bill)) continue;
    for (const m of legislative) {
      if (usedSlugs.has(m.slug)) continue;
      const score = titleMatchScore(bill.title, m.question);
      if (score >= threshold) candidates.push({ bill, market: m, score });
    }
  }
  candidates.sort((x, y) => y.score - x.score || (y.market.volume || 0) - (x.market.volume || 0));
  for (const c of candidates) {
    if (usedBills.has(c.bill.id) || usedSlugs.has(c.market.slug)) continue;
    usedBills.add(c.bill.id);
    usedSlugs.add(c.market.slug);
    chosen.push(c);
  }

  return chosen
    .map(({ bill, market, score }) => ({
      bill,
      market,
      matchScore: Number(score.toFixed(2)),
      ...computeEdge(bill.model_probability ?? bill.modelProbability ?? null, market),
    }))
    .sort((a, b) => Math.abs(b.edge ?? 0) - Math.abs(a.edge ?? 0) || b.matchScore - a.matchScore);
}

export const LEGISLATION_EDGE_DISCLAIMER =
  'Model probabilities are transparent structural estimates, not guarantees. Market-implied probabilities are current prediction-market prices. Shown for information only, not investment or betting advice; prediction-market participation is subject to eligibility and jurisdiction.';
