/**
 * Company research (Company view of /company-research), Nov 2026 redesign.
 *
 * Pure: formatters, the tab tool picker config, and every number the page
 * derives instead of storing (valuation gap, analyst upside, analyst split,
 * peer median and rating, the reverse DCF comparison word, the WACC shift)
 * plus the model summary and findings text built from those same numbers,
 * so every panel quotes identical values. No React, no DOM, no fetch.
 * Tested by scripts/check-research-company.mjs.
 */

/* ------------------------------------------------------------------ */
/* Tool picker                                                         */
/* ------------------------------------------------------------------ */

/**
 * Which tools each section tab offers, in order. The first is the default.
 * Ids are the model ids from src/lib/ai/analysis-prompts.js. Change the
 * grouping here; nothing else hardcodes it.
 */
export const TAB_TOOLS = {
  models: { label: 'Model', tools: ['dcf', 'threestatement', 'grpv', 'earnings'] },
  valuation: { label: 'Method', tools: ['valuation', 'comps', 'dcf'] },
};

/** Premium tools show a star. Mirrors the set the page used before the redesign. */
export const PREMIUM_TOOL_IDS = new Set([
  'grpv',
  'dcf',
  'earnings',
  'comps',
  'threestatement',
  'lbo',
  'ma',
  'risk',
  'montecarlo',
]);

/** Does this section show the tool picker? */
export const sectionHasTools = (section) =>
  Object.prototype.hasOwnProperty.call(TAB_TOOLS, section);

/** The tool to show for a section: the requested one if that tab offers it, else the tab default. */
export function resolveTool(section, requested) {
  const cfg = TAB_TOOLS[section];
  if (!cfg) return null;
  return cfg.tools.includes(requested) ? requested : cfg.tools[0];
}

/** The section a tool lives in (first match), for legacy ?model= links. */
export function sectionForTool(toolId) {
  for (const [section, cfg] of Object.entries(TAB_TOOLS)) {
    if (cfg.tools.includes(toolId)) return section;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Coerce API values ("12.3", 12.3, null) to a finite number or null. */
export const toNum = (v) => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,$%x]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Median of the finite values, or null when there are none. */
export function median(values) {
  const xs = (values || []).filter(isNum).sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}

/** fairValue / price - 1, as a percent. */
export const valuationGapPct = (fairValue, price) =>
  isNum(fairValue) && isNum(price) && price > 0 ? (fairValue / price - 1) * 100 : null;

/** avgTarget / price - 1, as a percent. */
export const analystUpsidePct = (avgTarget, price) =>
  isNum(avgTarget) && isNum(price) && price > 0 ? (avgTarget / price - 1) * 100 : null;

/**
 * Whole percents that always add up to 100 (largest remainder method).
 * Returns an array aligned with `counts`; all zeros when the total is 0.
 */
export function largestRemainderPercents(counts) {
  const cs = (counts || []).map((c) => (isNum(c) && c > 0 ? c : 0));
  const total = cs.reduce((a, b) => a + b, 0);
  if (!total) return cs.map(() => 0);
  const raw = cs.map((c) => (c / total) * 100);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    /* Equal remainders (within float noise) go to the larger count. */
    .sort((a, b) => (Math.abs(b.rem - a.rem) > 1e-9 ? b.rem - a.rem : cs[b.i] - cs[a.i]));
  for (const { i } of order) {
    if (left <= 0) break;
    floor[i] += 1;
    left -= 1;
  }
  return floor;
}

/** Finnhub recommendation row -> { buy, hold, sell } counts (strong buckets folded in). */
export function analystCounts(latest) {
  if (!latest) return null;
  const n = (k) => (isNum(latest[k]) ? latest[k] : 0);
  const out = {
    buy: n('strongBuy') + n('buy'),
    hold: n('hold'),
    sell: n('sell') + n('strongSell'),
  };
  return out.buy + out.hold + out.sell > 0 ? out : null;
}

/**
 * Peer rating from P/E versus the peer median: more than 15% above is a
 * premium, more than 15% below a discount, otherwise in line.
 */
export function peerRating(pe, peerMedian, band = 0.15) {
  if (!isNum(pe) || !isNum(peerMedian) || peerMedian <= 0) return null;
  if (pe > peerMedian * (1 + band)) return 'premium';
  if (pe < peerMedian * (1 - band)) return 'discount';
  return 'inline';
}

export const RATING_LABELS = { premium: 'Premium', inline: 'In-line', discount: 'Discount' };

/**
 * "above" | "below" | "in line with": implied growth versus the base case,
 * both in percent. Within +/- tolerancePts counts as in line.
 */
export function reverseDcfComparison(impliedPct, basePct, tolerancePts = 1) {
  if (!isNum(impliedPct) || !isNum(basePct)) return null;
  const d = impliedPct - basePct;
  if (Math.abs(d) <= tolerancePts) return 'in line with';
  return d > 0 ? 'above' : 'below';
}

/**
 * The DCF API has no WACC input: WACC comes out of the cost of equity and
 * the cost of debt. To move WACC by `deltaPts` exactly, shift the cost of
 * equity by delta and the pre-tax cost of debt by delta / (1 - tax): with
 * weights summing to 1 the after-tax WACC then moves by exactly delta.
 * All inputs are decimals (0.09 = 9%).
 */
export function shiftWacc(assumptions, delta) {
  if (!assumptions || !isNum(delta) || delta === 0) return assumptions;
  const tax = isNum(assumptions.taxRate) ? Math.min(Math.max(assumptions.taxRate, 0), 0.6) : 0.21;
  const next = { ...assumptions };
  if (isNum(next.costOfEquity)) next.costOfEquity = Math.max(0.0001, next.costOfEquity + delta);
  if (isNum(next.costOfDebt))
    next.costOfDebt = Math.max(0.0001, next.costOfDebt + delta / (1 - tax));
  return next;
}

/** WACC as returned by the DCF API (percent number, e.g. 9.04) -> decimal. */
export const waccToDecimal = (w) => {
  const n = toNum(w);
  if (n == null) return null;
  return n > 1 ? n / 100 : n;
};

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const LOCALE = 'en-US';

/** $1,012.34 */
export const fmtMoney = (v, digits = 2) =>
  isNum(v)
    ? `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(LOCALE, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}`
    : 'N/A';

/** +$37.42 / -$1.20 */
export const fmtSignedMoney = (v) =>
  isNum(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${fmtMoney(Math.abs(v))}` : 'N/A';

/** $2.19T, $845.2B, $12.4M */
export function fmtCompactMoney(v) {
  if (!isNum(v)) return 'N/A';
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  return fmtMoney(v);
}

/** 66.4x */
export const fmtMultiple = (v) => (isNum(v) && v > 0 ? `${v.toFixed(1)}x` : 'N/A');

/** 34.0% (value already in percent units) */
export const fmtPct = (v, digits = 1) => (isNum(v) ? `${v.toFixed(digits)}%` : 'N/A');

/** +4.41% / -12.80% (value in percent units) */
export const fmtSignedPct = (v, digits = 1) =>
  isNum(v) ? `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(digits)}%` : 'N/A';

/** "up" | "down" | "flat" for colouring a signed value. */
export const signOf = (v) => (!isNum(v) || v === 0 ? 'flat' : v > 0 ? 'up' : 'down');

/** "+14.4% upside" / "-6.2% downside" */
export const fmtGap = (pct) =>
  isNum(pct) ? `${fmtSignedPct(pct)} ${pct < 0 ? 'downside' : 'upside'}` : 'N/A';

/* ------------------------------------------------------------------ */
/* News                                                                */
/* ------------------------------------------------------------------ */

/** Alpha Vantage sentiment label -> Positive | Neutral | Negative (or null). */
export function sentimentBucket(label) {
  const l = String(label || '').toLowerCase();
  if (!l) return null;
  if (l.includes('bull') || l === 'positive') return 'Positive';
  if (l.includes('bear') || l === 'negative') return 'Negative';
  if (l.includes('neutral')) return 'Neutral';
  return null;
}

/** "20250127T153000" (Alpha Vantage) or ISO or unix seconds -> Date | null. */
export function parseNewsDate(v) {
  if (v == null) return null;
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?/.exec(String(v));
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ */
/* Model summary and findings (one source for K, L, M and N)           */
/* ------------------------------------------------------------------ */

/**
 * Text for the DCF summary and the three findings, built only from the
 * numbers the panels show. Any input missing -> that sentence is left out.
 *
 * @param {object} m
 * @param {string} m.ticker
 * @param {number|null} m.fairValue
 * @param {number|null} m.price
 * @param {number|null} m.impliedGrowthPct   reverse DCF, percent
 * @param {number|null} m.baseGrowthPct      base case revenue growth, percent
 * @param {number|null} m.pe                 the company's P/E
 * @param {number|null} m.peerMedianPe       median P/E of the peers (company excluded)
 */
export function buildModelNarrative(m) {
  const gap = valuationGapPct(m.fairValue, m.price);
  const word = reverseDcfComparison(m.impliedGrowthPct, m.baseGrowthPct);
  const rating = peerRating(m.pe, m.peerMedianPe);

  let summary = null;
  if (isNum(m.fairValue) && isNum(gap)) {
    summary =
      `The DCF model puts fair value at ${fmtMoney(m.fairValue)} per share, ` +
      `${Math.abs(gap).toFixed(1)}% ${gap < 0 ? 'below' : 'above'} the current price of ${fmtMoney(m.price)}.`;
  }

  let reverse = null;
  if (word) {
    reverse =
      `The current share price implies about ${m.impliedGrowthPct.toFixed(1)}% annual revenue growth ` +
      `over the next 5 years, which is ${word} the base case of ${m.baseGrowthPct.toFixed(1)}%.`;
  }

  const findings = [];
  if (summary)
    findings.push(
      `Fair value of ${fmtMoney(m.fairValue)} implies ${fmtGap(gap)} versus ${fmtMoney(m.price)}.`,
    );
  if (word) {
    findings.push(
      `Reverse DCF implies ${m.impliedGrowthPct.toFixed(1)}% 5-year revenue growth, ${word} the ${m.baseGrowthPct.toFixed(1)}% base case.`,
    );
  }
  if (rating) {
    const phrase =
      rating === 'premium'
        ? 'a premium to'
        : rating === 'discount'
          ? 'a discount to'
          : 'in line with';
    findings.push(
      `${m.ticker} trades at ${phrase} peers: ${fmtMultiple(m.pe)} P/E versus a ${fmtMultiple(m.peerMedianPe)} peer median.`,
    );
  }
  return { summary, reverse, findings, gapPct: gap, comparison: word, rating };
}
