/**
 * Bill ↔ Polymarket matching + edge math (Betting Markets Engine framework).
 *
 * Matches active legislation/politics prediction markets to tracked bills and
 * compares the market's vig-free IMPLIED probability against our structural
 * model probability (passage-model.js) to surface an informational edge.
 *
 * COMPLIANCE (non-negotiable): informational market analysis ONLY. We show
 * "market-implied probability" vs "our model estimate (methodology →)". NO bet
 * recommendations, NO Kelly / stake sizing, NO "buy YES". A visible disclaimer
 * accompanies every surface.
 */

/**
 * Manual override map for high-profile bills (fuzzy title matching needs
 * curation). Key = bill id `${congress}-${type}-${number}`; value = the
 * Polymarket market slug to pair. Extend as markets appear.
 * @type {Record<string,string>}
 */
export const BILL_MARKET_OVERRIDES = {
  // '119-hr-1': 'will-hr1-become-law-2025',
};

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'to',
  'and',
  'or',
  'for',
  'in',
  'on',
  'act',
  'bill',
  'will',
  'be',
  'is',
  'become',
  'law',
  'pass',
  'passed',
  'house',
  'senate',
  '2024',
  '2025',
  '2026',
]);

function keywords(str) {
  return new Set(
    String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
  );
}

/** Jaccard-ish keyword overlap of a bill title vs a market question. */
export function titleMatchScore(billTitle, marketQuestion) {
  const a = keywords(billTitle);
  const b = keywords(marketQuestion);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  return inter / Math.min(a.size, b.size);
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
 * Edge of our model vs the market's implied "Yes" probability.
 * edge = model − implied ; EV% = (model − implied) / (1 − implied) × 100
 * (Betting Engine formula — shown as analysis, never as a stake instruction.)
 */
export function computeEdge(modelProbability, market) {
  const outs = marketImplied(market);
  const yes = outs.find((o) => /^yes$/i.test(o.name)) || outs[0];
  const implied = yes ? yes.prob : null;
  if (implied == null || modelProbability == null) {
    return { implied, model: modelProbability ?? null, edge: null, evPct: null };
  }
  const edge = modelProbability - implied;
  const evPct = implied < 1 ? (edge / (1 - implied)) * 100 : null;
  return {
    implied,
    model: modelProbability,
    edge: Number(edge.toFixed(4)),
    evPct: evPct == null ? null : Number(evPct.toFixed(1)),
  };
}

/**
 * Pair tracked bills to markets: manual overrides first, then best title match
 * above a confidence threshold. Returns matched pairs with edge math.
 * @param {Array} bills   ingested bills (need id, title, model_probability, stage)
 * @param {Array} markets polymarket markets (need question, slug, outcomes, outcomePrices, volume)
 * @param {number} threshold min title-match score (0..1) when no override
 */
export function matchBillsToMarkets(bills = [], markets = [], threshold = 0.34) {
  const bySlug = new Map(markets.map((m) => [m.slug, m]));
  const pairs = [];
  const usedSlugs = new Set();

  for (const bill of bills) {
    let market = null;
    let score = 1;
    if (BILL_MARKET_OVERRIDES[bill.id] && bySlug.has(BILL_MARKET_OVERRIDES[bill.id])) {
      market = bySlug.get(BILL_MARKET_OVERRIDES[bill.id]);
    } else {
      for (const m of markets) {
        if (usedSlugs.has(m.slug)) continue;
        const s = titleMatchScore(bill.title, m.question);
        if (s > score - 1 && s >= threshold && (!market || s > score)) {
          market = m;
          score = s;
        }
      }
    }
    if (!market) continue;
    usedSlugs.add(market.slug);
    pairs.push({
      bill,
      market,
      matchScore: Number(score.toFixed(2)),
      ...computeEdge(bill.model_probability ?? bill.modelProbability ?? null, market),
    });
  }
  return pairs.sort((a, b) => Math.abs(b.edge ?? 0) - Math.abs(a.edge ?? 0));
}

export const LEGISLATION_EDGE_DISCLAIMER =
  'Model probabilities are transparent structural estimates, not guarantees. Market-implied probabilities are current prediction-market prices. Shown for information only — not investment or betting advice; prediction-market participation is subject to eligibility and jurisdiction.';
