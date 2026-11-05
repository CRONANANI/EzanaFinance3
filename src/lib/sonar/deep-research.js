/**
 * Deep research mode (Nov 2026).
 *
 * A ping is answered in about five seconds. Some questions cannot be: "What
 * are the biggest risks to NVIDIA's growth over the next three years?
 * Analyze its financial performance, institutional ownership, government
 * contracts, industry exposure, and competitive landscape." That is an
 * analyst's assignment, several datasets and a written assessment, and a
 * five-second budget turns it into a list of snippets.
 *
 * deepResearchSignal() recognises those questions before any spend. Sonar
 * then asks the visitor whether to run deep research; on yes it shows an
 * estimate and streams the research engine's progress (about one to three
 * minutes); on no it answers the quick way.
 *
 * Pure and client-safe. Unit-tested in scripts/check-sonar-deep.mjs.
 */

/** The research angles a question can ask for, in report order. */
export const DEEP_ANGLES = [
  {
    id: 'financials',
    label: 'Financial performance',
    re: /\b(financial(?:s| performance)?|revenue|earnings|margins?|profitab\w*|cash flow|growth)\b/i,
  },
  {
    id: 'ownership',
    label: 'Institutional ownership',
    re: /\b(institutional|13f|ownership|holders?|hedge funds?|positioning)\b/i,
  },
  {
    id: 'contracts',
    label: 'Government contracts',
    re: /\b(government contracts?|federal contracts?|contracts?|procurement|awards?)\b/i,
  },
  {
    id: 'industry',
    label: 'Industry exposure',
    re: /\b(industry exposure|industry|sector exposure|end markets?|value chain|supply chain|suppliers?)\b/i,
  },
  {
    id: 'competition',
    label: 'Competitive landscape',
    re: /\b(competit\w*|rivals?|market share|peers?|custom silicon|substitut\w*)\b/i,
  },
  {
    id: 'geopolitics',
    label: 'Geopolitical and regulatory exposure',
    re: /\b(export controls?|sanctions?|china|geopolitic\w*|regulat\w*|tariffs?|antitrust)\b/i,
  },
  {
    id: 'customers',
    label: 'Customer concentration',
    re: /\b(customer concentration|customers?|hyperscalers?|clients?|buyers)\b/i,
  },
  {
    id: 'lobbying',
    label: 'Lobbying and policy',
    re: /\b(lobby\w*|policy exposure|political)\b/i,
  },
  {
    id: 'valuation',
    label: 'Valuation and expectations',
    re: /\b(valuation|multiples?|p\/e|price targets?|expectations|priced in)\b/i,
  },
];

const ANALYSE_RE =
  /\b(analy[sz]e|analysis|assess(?:ment)?|evaluate|evaluation|deep dive|due diligence|investment (?:case|thesis|memo)|thesis|stress[- ]test|break down|in depth|in-depth|comprehensive|full report|research report)\b/i;
const RISK_RE =
  /\b(risks?|downside|threats?|vulnerab\w*|headwinds?|what could go wrong|disappoint\w*|bear case|bull case)\b/i;
const HORIZON_RE =
  /\b(next|over the (?:next|coming)|coming)\s+(?:\w+\s+)?(years?|quarters?|decade)\b|\b(20[2-4]\d)\s*(?:-|to|through)\s*(20[2-4]\d)\b|\blong[- ]term\b|\bthree[- ]year\b|\bmulti[- ]year\b/i;
const OUTLOOK_RE = /\b(outlook|prospects|trajectory|scenarios?|forecast|base case)\b/i;
const COMPARE_ALL_RE = /\b(compare|versus|vs\.?)\b.*\b(and|,)\b/i;

/* Words that make a short question quick even with an analysis verb:
   "price of nvidia", "who owns nvidia". */
const QUICK_RE = /^\s*(what(?:'s| is) the (?:price|stock price|market cap)|who owns|ticker)\b/i;

/**
 * Whether a ping is a deep research assignment, and why.
 * @param {string} query
 * @param {{ entities?: Array }} [understood]
 * @returns {{ deep: boolean, score: number, reasons: string[], angles: Array<{id: string, label: string}>,
 *   estimate: { minSec: number, maxSec: number, label: string } }}
 */
export function deepResearchSignal(query, understood = null) {
  const t = String(query || '');
  const words = t.trim().split(/\s+/).filter(Boolean).length;
  const reasons = [];
  let score = 0;

  const angles = DEEP_ANGLES.filter((a) => a.re.test(t)).map(({ id, label }) => ({ id, label }));
  if (ANALYSE_RE.test(t)) {
    score += 1;
    reasons.push('asks for an analysis');
  }
  if (RISK_RE.test(t)) {
    score += 1;
    reasons.push('asks for a risk assessment');
  }
  if (HORIZON_RE.test(t) || OUTLOOK_RE.test(t)) {
    score += 1;
    reasons.push('looks ahead over a horizon');
  }
  if (RISK_RE.test(t) && (HORIZON_RE.test(t) || OUTLOOK_RE.test(t))) score += 0.5;
  if (angles.length >= 3) {
    score += 2;
    reasons.push(`covers ${angles.length} research angles`);
  } else if (angles.length === 2) {
    score += ANALYSE_RE.test(t) ? 1 : 0.5;
    if (ANALYSE_RE.test(t)) reasons.push('covers 2 research angles');
  }
  if (COMPARE_ALL_RE.test(t) && angles.length >= 2) {
    score += 0.5;
    reasons.push('compares several dimensions');
  }
  if (words >= 25) {
    score += 0.5;
    reasons.push('a multi-part question');
  }
  if (QUICK_RE.test(t) || words < 6) score = 0;

  const deep = score >= 2;
  return {
    deep,
    score,
    reasons: deep ? reasons : [],
    angles,
    estimate: estimateFor(angles, understood),
  };
}

/**
 * How long a deep run takes: the evidence tasks run in parallel (about 15 to
 * 25 seconds), then the written assessment (about a minute, longer with more
 * angles to cover). Rounded to what a person reads: "about 1 to 2 minutes".
 */
export function estimateFor(angles = [], understood = null) {
  const n = Math.max(1, angles.length);
  const minSec = Math.round(Math.min(150, 45 + 8 * n));
  const maxSec = Math.round(Math.min(240, 90 + 15 * n));
  void understood;
  return { minSec, maxSec, label: estimateLabel(minSec, maxSec) };
}

/** "about 1 to 2 minutes", "about 2 to 3 minutes". */
export function estimateLabel(minSec, maxSec) {
  const lo = Math.max(1, Math.round(minSec / 60));
  const hi = Math.max(lo + 1, Math.ceil(maxSec / 60));
  return `about ${lo} to ${hi} minutes`;
}

/** Deep research is on unless SONAR_DEEP_RESEARCH=false (server only). */
export function deepResearchEnabled(env = typeof process !== 'undefined' ? process.env : {}) {
  return String(env?.SONAR_DEEP_RESEARCH ?? 'true').toLowerCase() !== 'false';
}

/** Guests may run deep research unless SONAR_DEEP_GUESTS=false. */
export function deepResearchForGuests(env = typeof process !== 'undefined' ? process.env : {}) {
  return String(env?.SONAR_DEEP_GUESTS ?? 'true').toLowerCase() !== 'false';
}

export default deepResearchSignal;
