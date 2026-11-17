/**
 * Sonar adaptive research: Research Controls in the execution plan (Nov 2026).
 *
 * The three selects (focus, time horizon, data sources) change what an adaptive run does,
 * not just what the page shows:
 *
 *   focus    tips the router between scenarios that already match the question (it never
 *            creates a match), turns on the risk reading for a fundamentals answer, and is
 *            given to the research step as a directive
 *   horizon  sets the chart window, the price-comparison range, the move window when the
 *            question names none, and the disclosure lookback
 *   sources  narrows which readers an executor may call. General context (news and web
 *            research) is dropped from a narrowed run, as it is in standard research. A
 *            scenario whose own evidence is outside the chosen family is not run here; the
 *            question goes to standard research, which honours the same controls
 *
 * Every effect is recorded on the plan and stated on the answer. Controls can only narrow:
 * nothing here grants a reader data their plan does not include.
 */
import {
  sanitizeControls,
  isDefaultControls,
  controlsDirective,
  FOCUS_OPTIONS,
  HORIZON_OPTIONS,
  SOURCE_OPTIONS,
} from '@/lib/sonar/research-controls';

/* Which family each reader belongs to. 'general' is dropped from a narrowed run. */
const READER_FAMILY = {
  getOhlcv: 'market',
  retrieveMarkets: 'market',
  commodity: 'market',
  earnings: 'market',
  statements: 'filings',
  valuation: 'filings',
  peerSet: 'filings',
  disclosures: 'filings',
  valueChain: 'filings',
  positioning13f: 'filings',
  etfHolders: 'filings',
  insiderTrades: 'filings',
  revenueMix: 'filings',
  congressTrades: 'government',
  memberTrades: 'government',
  chamberTrades: 'government',
  lobbying: 'government',
  contracts: 'government',
  sanctions: 'government',
  countryBrief: 'macro',
  macroRank: 'macro',
  rankings: 'macro',
  seriesHistory: 'macro',
  countryIntel: 'macro',
  countryDossier: 'macro',
  synthesize: 'general',
  news: 'general',
};

/* The readers a scenario cannot answer without (any one of a nested list will do). */
const REQUIRED = {
  B01: ['getOhlcv'],
  A05: ['getOhlcv'],
  B10: ['getOhlcv'],
  A02: ['synthesize'],
  A03: ['synthesize'],
  A07: ['synthesize'],
  A08: ['synthesize'],
  A10: ['synthesize'],
  C10: ['synthesize'],
  B02: ['statements'],
  B03: ['valuation'],
  B05: ['peerSet'],
  B06: ['positioning13f'],
  B07: [['congressTrades', 'memberTrades', 'chamberTrades', 'insiderTrades']],
  A04: ['earnings'],
  B04: ['contracts'],
  B08: ['lobbying'],
  C01: [['countryBrief', 'countryIntel', 'countryDossier']],
  C04: ['countryBrief'],
  C05: ['countryBrief'],
  C02: [['rankings', 'macroRank']],
  C09: ['rankings'],
  C03: ['commodity'],
  C08: ['retrieveMarkets'],
  A01: ['synthesize'],
  A06: ['synthesize'],
  A09: [['earnings', 'retrieveMarkets']],
  B09: ['getOhlcv'],
  C06: ['sanctions'],
  C07: ['getOhlcv'],
};

/* Scenarios a focus leans toward, when they already match the question. */
export const FOCUS_BIAS = {
  market: ['A05', 'B01', 'B10', 'C08'],
  fundamentals: ['B02', 'A04', 'B03'],
  risk: ['B02', 'B10', 'B04'],
  competitive: ['B05', 'B03'],
  macro: ['C01', 'C04', 'C05', 'C02', 'C09', 'C03'],
};

const HORIZON = {
  short: { chartDays: 130, range: '1M', moveSessions: 5, lookbackDays: 90 },
  medium: { chartDays: 260, range: '6M', moveSessions: 21, lookbackDays: 365 },
  long: { chartDays: 400, range: '1Y', moveSessions: 63, lookbackDays: 730 },
};

const allowed = (reader, sources) =>
  sources === 'all' || !READER_FAMILY[reader] || READER_FAMILY[reader] === sources;

/** Can this scenario's own evidence be read under the chosen data sources? */
export function sourcesAllow(scenarioId, sources) {
  if (sources === 'all') return true;
  return (REQUIRED[scenarioId] || []).every((need) =>
    (Array.isArray(need) ? need : [need]).some((r) => allowed(r, sources)),
  );
}

/**
 * The controls as the plan carries them.
 * @returns {null | { focus, horizon, sources, labels: string[], directive: string, window: object|null }}
 *          null for the defaults: a default run is exactly what it was before controls existed
 */
export function planControls(input) {
  if (isDefaultControls(input)) return null;
  const c = sanitizeControls(input);
  const label = (list, key, base) => (key === base ? null : list.find((o) => o.key === key)?.label);
  return {
    ...c,
    labels: [
      label(FOCUS_OPTIONS, c.focus, 'general'),
      label(HORIZON_OPTIONS, c.horizon, 'any'),
      label(SOURCE_OPTIONS, c.sources, 'all'),
    ].filter(Boolean),
    directive: controlsDirective(c),
    window: HORIZON[c.horizon] || null,
  };
}

/** The readers an executor may call under these controls, and the ones taken away. */
export function narrowDeps(deps, controls) {
  if (!controls || controls.sources === 'all') return { deps, dropped: [] };
  const out = {};
  const dropped = [];
  for (const [k, v] of Object.entries(deps || {})) {
    if (typeof v !== 'function' || allowed(k, controls.sources)) out[k] = v;
    else dropped.push(k);
  }
  return { deps: out, dropped };
}

/** One sentence for the answer's limits, saying what the reader's own controls changed. */
export function controlsNote(controls, dropped = []) {
  if (!controls) return null;
  const parts = [];
  if (controls.sources !== 'all') {
    const family = SOURCE_OPTIONS.find((o) => o.key === controls.sources)?.label.toLowerCase();
    const general = dropped.includes('synthesize') || dropped.includes('news');
    parts.push(
      `Data sources were narrowed to ${family}${general ? ', so news and web research were not used' : ''}.`,
    );
  }
  if (controls.window) {
    const h = HORIZON_OPTIONS.find((o) => o.key === controls.horizon)?.label.toLowerCase();
    parts.push(`Charts and lookbacks are set for the ${h}.`);
  }
  if (controls.focus !== 'general')
    parts.push(
      `The focus is ${FOCUS_OPTIONS.find((o) => o.key === controls.focus)?.label.toLowerCase()}.`,
    );
  return parts.length ? `Research Controls applied. ${parts.join(' ')}` : null;
}
