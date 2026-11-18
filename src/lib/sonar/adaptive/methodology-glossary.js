/**
 * Sonar methodology glossary (Nov 18, 2026). Versioned, reviewed entries for the financial
 * explainer family (presentation-families.js, family 08).
 *
 * Each entry is reviewed copy, not model output: definitions, formulas with units and
 * conventions, when each measure fits, a conceptual diagram, the method notes, and the kinds
 * of source to verify against. Entries never carry a numerical example: a worked number needs
 * real observations, so a follow-up that names a country or company hands off to the
 * research scenario that reads them (the entry's `handoff`).
 *
 * Changing an entry: bump its `version`, add a line to `changes` with the date and what
 * changed, and set `reviewed` to who reviewed it and when. Answers record the version they
 * were written from.
 *
 * Pure data and one matcher.
 */

export const GLOSSARY_VERSION = 'glossary-2026-11-18';

export const GLOSSARY = [
  {
    id: 'nominal_vs_real_rates',
    version: '1.0.0',
    reviewed: { by: 'Ezana research', at: '2026-11-18' },
    changes: [{ at: '2026-11-18', note: 'First entry.' }],
    scenario: 'C04',
    match: /\b(nominal|real)\b[^?]{0,40}\b(interest )?rates?\b|\breal (interest )?rates?\b|\bfisher (equation|effect|relation)/i,
    headline: 'A nominal rate is quoted before inflation. A real rate accounts for price changes.',
    text:
      'Use rates and inflation from comparable periods and label whether the estimate is backward-looking or based on expected inflation. The difference approximation is useful but not always the exact real return.',
    definitions: [
      { term: 'Nominal rate', text: 'is the posted interest rate before adjusting for the purchasing power of money.' },
      { term: 'Inflation', text: 'is the change in the broad price level over the defined measurement period.' },
      { term: 'Real rate', text: 'adjusts for inflation using observed or expected inflation, depending on the analysis.' },
    ],
    equations: [
      { expr: 'r ≈ i − π', note: 'Ex-post approximation: nominal rate minus observed annual inflation, in percentage points.' },
      { expr: 'r = (1 + i) / (1 + π) − 1', note: 'Fisher relationship, with the rate and inflation over the same period.' },
    ],
    measures: [
      { question: 'Was past policy restrictive?', measure: 'Ex-post real-rate comparison' },
      { question: 'What return is expected?', measure: 'Expected inflation, sourced' },
      { question: 'How is policy transmitting?', measure: 'Rates, credit and inflation together' },
      { question: 'Do rates imply a currency direction?', measure: 'Not by themselves' },
    ],
    diagram: {
      nodes: [
        { label: 'Nominal rate', basis: 'Observed' },
        { label: 'Inflation', basis: 'Observed or forecast' },
        { label: 'Real rate', basis: 'Method stated' },
      ],
      caption: 'Real rates do not alone determine the exchange rate, equity performance or policy effectiveness.',
    },
    method: [
      { title: 'Align the dates', text: 'The rate and inflation observation must refer to a comparable period.', caution: 'Do not mix current rates with stale inflation without saying so.' },
      { title: 'Name the inflation basis', text: 'Observed inflation gives an ex-post spread. Expected inflation gives a forward-looking estimate.', caution: 'Never label both simply "real rate".' },
      { title: 'Disclose the approximation', text: 'The arithmetic difference is not identical to the multiplicative Fisher relation.', caution: 'State the units and the convention.' },
      { title: 'Describe, do not advise', text: 'An economic reading is not a trade call.', caution: 'Describe rather than recommend.' },
    ],
    verify: [
      { title: 'Official central bank', sub: 'Policy rate announcements' },
      { title: 'Official price statistics', sub: 'Published inflation series' },
      { title: 'Calculation methods', sub: 'Transparent derivation' },
    ],
    followups: [
      'What is Türkiye’s ex-post real interest rate?',
      'Is Brazil’s policy rate above inflation?',
      'How do expected and observed inflation differ?',
    ],
  },
  {
    id: 'fx_quote_convention',
    version: '1.0.0',
    reviewed: { by: 'Ezana research', at: '2026-11-18' },
    changes: [{ at: '2026-11-18', note: 'First entry.' }],
    scenario: 'C01',
    match: /\b(quote|quotation) convention\b|\bhigher (usd\/?[a-z]{3}|exchange rate)\b.*\b(weaker|stronger)\b|\b(dollar price|lost value) of (a|the) currency\b|\bhow (is|do you measure) (a )?currency (depreciation|weakness)\b/i,
    headline: 'A currency quoted per dollar weakens when the quote rises. Its loss of dollar value is a different number.',
    text:
      'An exchange rate quoted as local currency per US dollar rises when the local currency weakens. The percent rise in that quote is the change in the dollar’s price; the currency’s loss of dollar value is smaller and is computed the other way round.',
    definitions: [
      { term: 'Local per USD', text: 'is how many units of the local currency one US dollar buys. A higher number means a weaker local currency.' },
      { term: 'Dollar price change', text: 'is the percent change in that quote over a period.' },
      { term: 'Dollar value change', text: 'is the percent change in what one unit of the local currency is worth in dollars.' },
    ],
    equations: [
      { expr: 'Δ$price = (current / prior − 1) × 100', note: 'Percent change in the local-per-USD quote.' },
      { expr: 'Δvalue = (prior / current − 1) × 100', note: 'Percent change in the local currency’s dollar value.' },
    ],
    measures: [
      { question: 'How much more does a dollar cost?', measure: 'Dollar price change' },
      { question: 'How much purchasing power in dollars was lost?', measure: 'Dollar value change' },
      { question: 'Is the currency weak in real terms?', measure: 'Real effective exchange rate, not either quote change' },
    ],
    diagram: {
      nodes: [
        { label: 'Quote rises', basis: 'Observed' },
        { label: 'Dollar price up', basis: 'Derived' },
        { label: 'Dollar value down', basis: 'Derived, smaller' },
      ],
      caption: 'The two changes are the same move seen from each side; they are never interchangeable.',
    },
    method: [
      { title: 'State the convention', text: 'Say whether the quote is local per USD or USD per local.', caution: 'Label the axis with the convention.' },
      { title: 'Report both conventions', text: 'Give the dollar price change and the dollar value change together.', caution: 'Never present the quote change as the currency’s loss.' },
      { title: 'Use dated observations', text: 'Both ends of a change are real observations with their own dates.', caution: 'No interpolated end points.' },
      { title: 'Describe, do not advise', text: 'A depreciation reading is not a forecast.', caution: 'Describe rather than recommend.' },
    ],
    verify: [
      { title: 'Official reference rates', sub: 'Central bank fixings' },
      { title: 'Effective exchange rates', sub: 'Published real and nominal indices' },
      { title: 'Calculation methods', sub: 'Transparent derivation' },
    ],
    followups: [
      'Is Türkiye’s lira under pressure?',
      'How has the South African rand moved this year?',
      'What is a real effective exchange rate?',
    ],
  },
];

/* A definitional question, not a request for a country's or company's figures. */
const DEFINITIONAL =
  /^\s*(what('?s| is| are)|explain|define|how (do|does|should|can) (you|i|one|we)|what does .* mean|difference between|why does a higher)\b/i;

/** The glossary entry a definitional question asks about, or null. */
export function glossaryEntryFor(text) {
  const q = String(text || '');
  if (!DEFINITIONAL.test(q) && !/\bdifference between\b/i.test(q)) return null;
  return GLOSSARY.find((e) => e.match.test(q)) || null;
}

export const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.map((e) => [e.id, e]));
