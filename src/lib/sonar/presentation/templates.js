/**
 * Sonar report families and their layout templates (Nov 28 2026).
 *
 * Every Sonar answer opens with the Desk Summary and closes with evidence and methodology
 * (the answer shell, answer-sections.js). Between them, the analytical area follows the
 * template for the kind of question. A template is an order of slots, each naming the
 * objectives and components that may fill it. It is never permission to draw a slot the
 * research did not produce: an empty slot is skipped, and a requested analysis that could
 * not run shows its unavailable state instead.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-presentation.mjs.
 */

export const TEMPLATES_VERSION = 'sonar-templates-v1';

export const REPORT_TEMPLATES = {
  company_fundamentals: {
    label: 'Company fundamentals',
    slots: [
      { key: 'metrics', objectives: ['metric'], section: 'metrics' },
      {
        key: 'revenue',
        objectives: ['trend'],
        match: /revenue|earnings|eps|income/i,
        section: 'charts',
      },
      { key: 'margins', objectives: ['trend'], match: /margin/i, section: 'charts' },
      {
        key: 'valuation',
        objectives: ['ranking', 'comparison'],
        match: /valuation|multiple|p\/e|ev\//i,
        section: 'charts',
      },
      { key: 'composition', objectives: ['composition', 'universe'], section: 'charts' },
      { key: 'other', objectives: null, section: 'charts' },
    ],
  },
  congress: {
    label: 'Congressional trading',
    slots: [
      { key: 'metrics', objectives: ['metric'], section: 'metrics' },
      { key: 'timeline', objectives: ['activity', 'trend', 'events'], section: 'charts' },
      { key: 'distribution', objectives: ['composition'], section: 'charts' },
      { key: 'securities', objectives: ['ranking', 'securities', 'list'], section: 'charts' },
      { key: 'other', objectives: null, section: 'charts' },
    ],
  },
  institutional: {
    label: 'Institutional ownership',
    slots: [
      { key: 'metrics', objectives: ['metric'], section: 'metrics' },
      { key: 'ranking', objectives: ['ranking', 'list'], section: 'charts' },
      { key: 'participation', objectives: ['composition'], section: 'charts' },
      { key: 'changes', objectives: ['trend', 'activity'], section: 'charts' },
      { key: 'other', objectives: null, section: 'charts' },
    ],
  },
  government: {
    label: 'Government contracts and lobbying',
    slots: [
      { key: 'metrics', objectives: ['metric'], section: 'metrics' },
      { key: 'trend', objectives: ['trend', 'activity'], section: 'charts' },
      { key: 'agencies', objectives: ['composition'], section: 'charts' },
      { key: 'ranking', objectives: ['ranking', 'list'], section: 'charts' },
      { key: 'other', objectives: null, section: 'charts' },
    ],
  },
  macro: {
    label: 'Macroeconomic research',
    slots: [
      { key: 'metrics', objectives: ['metric'], section: 'metrics' },
      { key: 'series', objectives: ['trend'], section: 'charts' },
      { key: 'comparison', objectives: ['ranking', 'comparison'], section: 'charts' },
      { key: 'other', objectives: null, section: 'charts' },
    ],
  },
  quant: {
    label: 'Quantitative research',
    slots: [
      { key: 'outputs', objectives: ['metric'], section: 'metrics' },
      { key: 'price', objectives: ['trend'], section: 'charts' },
      {
        key: 'distribution',
        objectives: ['composition', 'relationship', 'activity'],
        section: 'charts',
      },
      { key: 'other', objectives: null, section: 'charts' },
    ],
  },
  cross_dataset: {
    label: 'Cross-dataset research',
    slots: [
      {
        key: 'result',
        objectives: ['intersection', 'screen', 'ranking', 'list'],
        section: 'charts',
      },
      { key: 'relationships', objectives: ['relationship', 'universe'], section: 'charts' },
      { key: 'metrics', objectives: ['metric'], section: 'metrics' },
      { key: 'other', objectives: null, section: 'charts' },
    ],
  },
};

const DOMAIN_FAMILY = [
  [/congress|politician|senate|house_member|stock_act/, 'congress'],
  [/13f|institutional|holder|ownership|fund_hold/, 'institutional'],
  [/contract|lobby|award|procure|government/, 'government'],
  [/macro|inflation|cpi|policy_rate|central_bank|country|gdp|fx|currency|commodit/, 'macro'],
  [/quant|backtest|factor|technical|volatility|momentum|signal/, 'quant'],
  [
    /financial|fundamental|valuation|dcf|earnings|revenue|segment|peer|estimate/,
    'company_fundamentals',
  ],
];

/**
 * The report family for a run: from the research spec's domains and the sources the plan
 * searched. Two or more families in one question make it cross-dataset.
 * @param {{ domains?: string[], sources?: string[], composition?: boolean }} spec
 */
export function reportFamily({ domains = [], sources = [], composition = false } = {}) {
  const words = [...domains, ...sources].map((d) => String(d || '').toLowerCase());
  const hits = new Set();
  for (const w of words)
    for (const [re, fam] of DOMAIN_FAMILY)
      if (re.test(w)) {
        hits.add(fam);
        break;
      }
  if (composition && hits.size >= 2) return 'cross_dataset';
  if (hits.size >= 3) return 'cross_dataset';
  for (const [, fam] of DOMAIN_FAMILY) if (hits.has(fam)) return fam;
  return 'company_fundamentals';
}

/**
 * Order planned items by the family's slots. An item takes the first slot whose objectives
 * include its objective (and whose `match`, when set, matches its title); items keep their
 * planned order within a slot. Never adds an item.
 * items: [{ objective, title }]
 */
export function orderBySlots(items, family) {
  const t = REPORT_TEMPLATES[family] || REPORT_TEMPLATES.company_fundamentals;
  const slotOf = (it) => {
    const i = t.slots.findIndex(
      (s) =>
        (s.objectives === null || s.objectives.includes(it.objective)) &&
        (!s.match || s.match.test(String(it.title || ''))),
    );
    return i < 0 ? t.slots.length : i;
  };
  return (items || [])
    .map((it, i) => ({ it, i, s: slotOf(it) }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map(({ it, s }) => ({ ...it, slot: t.slots[s]?.key || 'other' }));
}
