/**
 * Sonar for organizations: the council intent parser (Nov 28 2026).
 *
 * Reads a question asked inside Ezana Organizations and decides whether it is about the
 * council at all, and if so which council operation it asks for. Organizational context is
 * never forced onto a question: "How did Apple's earnings look?" stays a market question even
 * when the council holds Apple. Only an explicit council reference ("our fund", "our pitch",
 * "the committee", "our analysts") or an explicitly chosen council capability turns a question
 * into a council question, and "our portfolio" then means the council fund, never the
 * member's retail portfolio.
 *
 *   parseOrgIntent(text, { explicitCapability })
 *     -> { orgScoped, explicit, operation, capability, tickers, scenario, timeScope,
 *          requiredPermissions, outputs, reason }
 *
 * Pure and client-safe. No model calls: the parse is deterministic and unit-tested in
 * scripts/check-org-sonar-intelligence.mjs.
 */

/* Council references. "our", "we" and "us" alone are not enough ("what do we know about
   rates" is a market question); they must attach to a council noun. */
const ORG_NOUN =
  '(?:fund|portfolio|holdings?|positions?|book|exposures?|concentration|allocation|sectors?|weights?|council|club|smif|pitch(?:es)?|ips|investment policy|policy|mandate|committee|ic|desk|team|analysts?|coverage|research|thesis|theses|meeting|stocks?)';
const ORG_REF = new RegExp(
  `\\b(?:our|the council'?s?|the fund'?s?|my desk'?s?|our team'?s?)\\s+(?:\\w+\\s+){0,2}${ORG_NOUN}\\b|\\b(?:investment committee|the committee|next ic|ic meeting|we (?:hold|own))\\b`,
  'i',
);

/** Council capabilities, in Research Composer naming (lib/sonar/composer/org-capabilities.js). */
export const ORG_OPERATIONS = [
  {
    operation: 'ips_scenario',
    capability: 'org-policy-observations',
    re: /\b(?:ips|investment policy|policy|mandate|limit|cap)\b.*\b(?:increas|add|buy|rais|trim|reduc|sell)|\b(?:increas|add|buy|rais)\w*\b.*\b(?:ips|policy|concern|limit|cap)\b|\bwhat would (?:our|the)\b.*\b(?:exposure|weight)\b.*\bif\b/i,
    permissions: ['active_membership'],
    outputs: ['ips-observation', 'council-portfolio-exposure'],
  },
  {
    operation: 'ips_review',
    capability: 'org-policy-observations',
    re: /\b(?:ips|investment policy|policy rules?|mandate)\b/i,
    permissions: ['active_membership'],
    outputs: ['ips-observation'],
  },
  {
    operation: 'red_team',
    capability: 'org-thesis-red-team',
    re: /\b(?:challenge|red[- ]team|stress[- ]test|poke holes|critique|counter[- ]?argument|devil'?s advocate)\b/i,
    permissions: ['active_membership'],
    outputs: ['ic-questions', 'thesis-completeness'],
  },
  {
    operation: 'committee_questions',
    capability: 'org-thesis-red-team',
    re: /\b(?:questions?)\b.*\b(?:committee|ic|meeting|pitch)\b/i,
    permissions: ['active_membership'],
    outputs: ['ic-questions'],
  },
  {
    operation: 'meeting_briefing',
    capability: 'org-meeting-briefing',
    re: /\b(?:brief(?:ing)?|prepare|agenda|prep)\b.*\b(?:meeting|committee|ic)\b|\b(?:meeting|committee)\b.*\bbrief/i,
    permissions: ['active_membership'],
    outputs: ['meeting-briefing'],
  },
  {
    operation: 'coverage_gaps',
    capability: 'org-research-coverage',
    re: /\b(?:coverage|not been reviewed|overdue|stale|lack(?:s|ing)? (?:recent )?(?:coverage|research)|research update|reviewed recently|who covers)\b/i,
    permissions: ['active_membership'],
    outputs: ['research-coverage-matrix'],
  },
  {
    operation: 'thesis_history',
    capability: 'org-research-memory',
    re: /\b(?:last (?:semester|year|term|quarter)|believed?|original thesis|what has changed|changed since|previous(?:ly)? (?:wrote|thesis))\b/i,
    permissions: ['active_membership'],
    outputs: ['research-version-comparison'],
  },
  {
    operation: 'thesis_development',
    capability: 'org-pitch-research',
    re: /\b(?:develop|build|write|draft|help me with)\b.*\b(?:thesis|pitch)\b/i,
    permissions: ['active_membership'],
    outputs: ['investment-thesis', 'thesis-completeness'],
  },
  {
    operation: 'flags',
    capability: 'org-portfolio-analysis',
    re: /\b(?:flag(?:s|ged)?)\b/i,
    permissions: ['active_membership'],
    outputs: ['council-portfolio-exposure'],
  },
  {
    operation: 'fund_change',
    capability: 'org-portfolio-analysis',
    re: /\b(?:changed|change)\b.*\b(?:since|last)\b.*\b(?:meeting|committee)\b/i,
    permissions: ['active_membership'],
    outputs: ['council-portfolio-exposure'],
  },
  {
    operation: 'sector_exposure',
    capability: 'org-portfolio-analysis',
    re: /\b(?:sector|industry)\b.*\b(?:exposure|weight|allocation|concentrat)|\b(?:exposure|concentrat\w*)\b.*\b(?:in|to)\s+(?:the\s+)?(?:tech|technology|energy|health|financ|consumer|industrial|utilit|real estate|material|communication)/i,
    permissions: ['active_membership'],
    outputs: ['council-portfolio-exposure'],
  },
  {
    operation: 'concentration',
    capability: 'org-portfolio-analysis',
    re: /\b(?:concentrat\w*|largest (?:positions?|holdings?)|biggest (?:positions?|holdings?)|top holdings?|weights?)\b/i,
    permissions: ['active_membership'],
    outputs: ['council-portfolio-exposure'],
  },
  {
    operation: 'holdings',
    capability: 'org-portfolio-analysis',
    re: /\b(?:holdings?|positions?|portfolio|what (?:do )?we (?:hold|own))\b/i,
    permissions: ['active_membership'],
    outputs: ['council-portfolio-exposure'],
  },
];

/* Measures the council data cannot support today. Asked for, they are answered with the
   limitation, never with a made-up figure. */
const UNSUPPORTED = [
  [/\btime[- ]weighted\b|\btwr\b/i, 'time-weighted return'],
  [/\bsharpe\b/i, 'Sharpe ratio'],
  [/\bvolatility\b|\bstandard deviation\b/i, 'portfolio volatility'],
  [/\bfactor (?:exposure|loading|beta)s?\b/i, 'factor exposures'],
  [/\bcontribution to return\b|\battribution\b/i, 'contribution to return'],
  [/\balpha\b/i, 'benchmark-relative alpha'],
  [
    /\b(?:earnings risk|rate[- ]sensitiv|sensitive to (?:higher )?rates|duration)\b/i,
    'rate or earnings sensitivity',
  ],
  [
    /\binstitutional participation\b|\bfalling institutional\b/i,
    'institutional participation trend per holding',
  ],
];

const STOP = new Set([
  'IPS',
  'IC',
  'SMIF',
  'USD',
  'CEO',
  'CFO',
  'DCF',
  'PM',
  'EPS',
  'GDP',
  'TWR',
  'ETF',
  'I',
  'A',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'AI',
  'US',
  'OK',
]);
const NAME_TICKER = {
  microsoft: 'MSFT',
  apple: 'AAPL',
  nvidia: 'NVDA',
  alphabet: 'GOOGL',
  google: 'GOOGL',
  amazon: 'AMZN',
  meta: 'META',
  tesla: 'TSLA',
  palantir: 'PLTR',
  berkshire: 'BRK.B',
  jpmorgan: 'JPM',
  'jp morgan': 'JPM',
  netflix: 'NFLX',
  broadcom: 'AVGO',
  costco: 'COST',
};

/** Tickers in the text: $TICK, bare upper-case symbols, and a short list of common names. */
export function tickersIn(text) {
  const s = String(text || '');
  const out = new Set();
  for (const m of s.matchAll(/\$?\b([A-Z]{1,5}(?:\.[A-Z])?)\b/g)) {
    const t = m[1];
    if (!STOP.has(t) && (m[0].startsWith('$') || t.length >= 2)) out.add(t);
  }
  const low = s.toLowerCase();
  for (const [name, t] of Object.entries(NAME_TICKER))
    if (new RegExp(`\\b${name}\\b`).test(low)) out.add(t);
  return [...out];
}

/** A hypothetical change: "increased Microsoft by $10,000" / "add 2% to NVDA". */
export function scenarioIn(text, tickers = []) {
  const s = String(text || '');
  const dir = /\b(?:trim|reduc|sell|cut|decreas)\w*/i.test(s)
    ? -1
    : /\b(?:increas|add|buy|rais|grow)\w*/i.test(s)
      ? 1
      : 0;
  if (!dir) return null;
  const usd = s.match(/\$\s?([\d,]+(?:\.\d+)?)\s*(k|m|thousand|million)?\b/i);
  const pct = s.match(/\b([\d.]+)\s?(?:%|percent)\b/i);
  const mult = (u) =>
    /^(k|thousand)$/i.test(u || '') ? 1e3 : /^(m|million)$/i.test(u || '') ? 1e6 : 1;
  return {
    ticker: tickers[0] || null,
    direction: dir,
    amountUsd: usd ? dir * Number(usd[1].replace(/,/g, '')) * mult(usd[2]) : null,
    sizePct: !usd && pct ? dir * Number(pct[1]) : null,
  };
}

function timeScopeIn(text) {
  const s = String(text || '').toLowerCase();
  if (/last semester|previous semester/.test(s)) return { kind: 'semester', back: 1 };
  if (/last year/.test(s)) return { kind: 'year', back: 1 };
  if (/since (?:the )?last (?:ic |investment committee )?meeting/.test(s))
    return { kind: 'since_meeting' };
  const days = s.match(/(\d+)\s*days?/);
  if (days) return { kind: 'days', days: Number(days[1]) };
  return { kind: 'current' };
}

/**
 * Parse a question. `explicitCapability` is a council capability the reader chose from the
 * Research Composer: it makes the question council-scoped even without "our".
 */
export function parseOrgIntent(text, { explicitCapability = null } = {}) {
  const s = String(text || '').trim();
  const explicit = ORG_REF.test(s);
  const tickers = tickersIn(s);
  const unsupported = UNSUPPORTED.filter(([re]) => re.test(s)).map(([, label]) => label);
  const chosen = explicitCapability
    ? ORG_OPERATIONS.find((o) => o.capability === explicitCapability)
    : null;
  const matched = ORG_OPERATIONS.find((o) => o.re.test(s));
  const op = chosen && (!matched || matched.capability !== chosen.capability) ? chosen : matched;

  if (!explicit && !chosen)
    return {
      orgScoped: false,
      explicit: false,
      operation: null,
      capability: null,
      tickers,
      scenario: null,
      timeScope: timeScopeIn(s),
      requiredPermissions: [],
      outputs: [],
      unsupported,
      reason: 'No council reference: answered as ordinary market research.',
    };

  return {
    orgScoped: true,
    explicit,
    operation: op?.operation || 'holdings',
    capability: op?.capability || 'org-portfolio-analysis',
    tickers,
    scenario: op?.operation === 'ips_scenario' ? scenarioIn(s, tickers) : null,
    timeScope: timeScopeIn(s),
    requiredPermissions: op?.permissions || ['active_membership'],
    outputs: op?.outputs || ['council-portfolio-exposure'],
    unsupported,
    reason: explicit ? 'The question refers to the council.' : 'A council capability was chosen.',
  };
}
