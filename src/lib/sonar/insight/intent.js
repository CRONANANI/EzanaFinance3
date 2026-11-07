/**
 * Sonar analytical intent (Nov 2026). What the reader is trying to establish, not only what
 * the question is about. Pure: no I/O, no model call, so a quick ping pays nothing for it.
 *
 * Three signals are combined, never one alone:
 *   1. structured objective cues (ranking, trend, concentration, risk, ...), several per
 *      question;
 *   2. a query family (currency stress, commodity production, congressional trading, ...)
 *      scored from its own cue words, gated by the entities the question names;
 *   3. an optional semantic score per family (cosine of the query embedding against the
 *      family's exemplar questions, semantic.js), blended in when the caller has one.
 *
 * Two questions on the same topic can need different answers: "Which countries produce the
 * most crude oil?" is a ranking, "How has crude oil production concentration changed?" is
 * concentration over time, "Is Turkey's lira under pressure?" is a risk assessment. The
 * family guides what to compute and which charts fit; the evidence still decides what is
 * shown.
 */

export const INTENT_VERSION = 'intent-v1';

/** Research objectives, in the order a primary is chosen when several fire equally. */
export const OBJECTIVES = [
  'risk_assessment',
  'concentration',
  'causal',
  'exposure',
  'relative_performance',
  'trend',
  'policy_impact',
  'financial_statement',
  'event_driven',
  'macro_vulnerability',
  'cross_dataset',
  'ranking',
];

export const OBJECTIVE_LABELS = {
  ranking: 'Descriptive ranking',
  trend: 'Historical trend',
  relative_performance: 'Relative performance',
  risk_assessment: 'Financial risk assessment',
  causal: 'Causal hypothesis',
  concentration: 'Market concentration',
  exposure: 'Exposure and dependency',
  policy_impact: 'Policy and regulatory impact',
  macro_vulnerability: 'Macro-financial vulnerability',
  financial_statement: 'Financial statement analysis',
  event_driven: 'Event-driven market analysis',
  cross_dataset: 'Cross-dataset relationship',
};

const OBJECTIVE_CUES = {
  ranking:
    /\b(which|who|top|most|least|largest|biggest|highest|lowest|leading|leaders?|rank(?:s|ed|ing)?)\b/i,
  trend:
    /\b(chang(?:e|ed|ing)|trend(?:s|ing)?|over (?:the )?(?:last|past) \w+|since \d{4}|over time|increas(?:e|ed|ing)|decreas(?:e|ed|ing)|rising|falling|accelerat\w*|decelerat\w*|stabili[sz]\w*|grow(?:th|ing|n)?|declin\w*)\b/i,
  relative_performance:
    /\b(vs\.?|versus|relative to|compared (?:to|with)|more than|less than|outperform\w*|underperform\w*)\b/i,
  risk_assessment:
    /\b(under pressure|pressure|vulnerab\w*|risk(?:s|y)?|stress\w*|fragil\w*|weak(?:ness|ening)?|crisis|default|safe)\b/i,
  causal: /\b(why|driv(?:e|es|ing|er|ers)|caus\w*|because|explain\w*|behind|due to)\b/i,
  concentration:
    /\b(concentrat\w*|dominat\w*|market share|share of|monopol\w*|oligopol\w*|herfindahl|hhi)\b/i,
  exposure: /\b(dependen\w*|depend on|exposure|exposed|relian\w*|rely on|reliant)\b/i,
  policy_impact:
    /\b(regulat\w*|polic(?:y|ies)|lobby\w*|tariffs?|sanctions?|legislat\w*|bill|executive order)\b/i,
  macro_vulnerability:
    /\b(debt burden|sovereign debt|reserves|current account|external financing|balance of payments)\b/i,
  financial_statement:
    /\b(revenue|margins?|earnings|eps|cash flow|free cash flow|valuation|p\/e|price.to.earnings|balance sheet|guidance)\b/i,
  event_driven:
    /\b(after|following|announce\w*|earnings call|merger|acquisition|ipo|election|rate decision)\b/i,
  cross_dataset: /\b(relationship between|correlat\w*|link between|connected to|tied to)\b/i,
};

/* Words that name the measure a question asks about. A finding about a different measure
   (price on a production question) is context, not a direct answer. */
const MEASURES = [
  ['production', /\b(produc\w*|output|supply|mined|mining|extract\w*)\b/i],
  ['exports', /\b(export\w*)\b/i],
  ['imports', /\b(import\w*)\b/i],
  ['consumption', /\b(consum\w*|demand)\b/i],
  [
    'price',
    /\b(prices?|priced|cost|valuation|wti|brent|front.month)\b|commodity_(?:change|price)/i,
  ],
  ['exchange_rate', /\b(lira|peso|pound|yen|euro|rupee|real|rand|currency|exchange rate|fx)\b/i],
  ['inflation', /\b(inflation|cpi|consumer prices?)\b/i],
  ['trading', /\b(trad(?:e|es|ing)|purchases?|sales|buying|selling|transactions?)\b/i],
  ['contracts', /\b(contracts?|awards?|obligations?)\b/i],
  ['lobbying', /\b(lobby\w*)\b/i],
  ['debt', /\b(debt|borrowing|deficit)\b/i],
  ['holdings', /\b(holdings?|positions?|exposure|13f|institutional)\b/i],
  ['earnings', /\b(earnings|eps|profit|net income)\b/i],
];

/**
 * Query families. Each guides analytical planning (what to compute, which charts fit,
 * which gaps to expect) without predetermining the answer. `exemplars` feed the semantic
 * matcher; `cues` feed the lexical score; `gate` says which entities or words the family
 * needs before it can apply at all.
 */
export const QUERY_FAMILIES = {
  currency_stress: {
    label: 'Currency stress',
    exemplars: [
      "Is Turkey's lira under pressure?",
      'How vulnerable is the Argentine peso?',
      'Is the Egyptian pound stabilizing?',
      'What is driving weakness in the Japanese yen?',
    ],
    cues: /\b(lira|peso|pound|yen|rupee|rand|real|naira|won|ruble|rouble|currency|exchange rate|fx|devaluat\w*|depreciat\w*)\b/i,
    gate: (ctx) => ctx.countries > 0 || /\b(currency|exchange rate|fx)\b/i.test(ctx.text),
    objectives: ['risk_assessment', 'macro_vulnerability', 'trend'],
    dimensions: [
      'FX movement at several horizons',
      'inflation',
      'monetary policy',
      'external financing',
      'volatility',
    ],
    datasetFamilies: [
      'fx_usd',
      'fx_effective',
      'inflation_monthly',
      'inflation_annual',
      'policy_rate',
      'reserves',
      'current_account',
    ],
    calculations: [
      'fx_change_multi_horizon',
      'ex_post_real_rate',
      'reer_percentile',
      'fx_volatility',
    ],
    expectedGaps: [
      'foreign exchange reserves and reserve adequacy',
      'current-account financing',
      'foreign-currency debt',
      'sovereign credit spreads',
      'capital flows',
      'inflation expectations',
    ],
  },
  commodity_production: {
    label: 'Commodity production',
    exemplars: [
      'Which countries produce the most crude oil?',
      'Who dominates global copper production?',
      'Which countries produce the most natural gas?',
      'How concentrated is global uranium supply?',
    ],
    cues: /\b(crude|oil|natural gas|lng|copper|uranium|lithium|nickel|cobalt|iron ore|coal|wheat|corn|soybeans?|gold|silver)\b.*\b(produc\w*|output|supply|mine\w*|reserves)\b|\b(produc\w*|output|supply)\b.*\b(crude|oil|gas|copper|uranium|lithium|nickel|cobalt|coal|wheat|corn|gold|silver)\b/i,
    gate: () => true,
    objectives: ['ranking', 'concentration', 'trend'],
    dimensions: [
      'production ranking',
      'concentration',
      'historical share changes',
      'supply vulnerability',
    ],
    datasetFamilies: ['oil_production', 'gas_production', 'commodity_production'],
    calculations: ['rank', 'top_n_share', 'effective_number', 'change_over_period'],
    expectedGaps: [
      'world production total',
      'production history by country',
      'exports and domestic consumption',
    ],
  },
  congressional_trading: {
    label: 'Congressional trading',
    exemplars: [
      'Has congressional trading increased over three years?',
      'Are House members buying more than senators?',
      'How have congressional stock sales changed?',
      'Which sectors attract the most congressional purchases?',
    ],
    cues: /\b(congress\w*|senat\w*|house members?|representatives?|lawmakers?|politicians?)\b/i,
    gate: () => true,
    objectives: ['trend', 'relative_performance', 'ranking'],
    dimensions: [
      'filing frequency',
      'transaction counts',
      'purchases versus sales',
      'chamber-normalized comparison',
      'reporting delays',
      'disclosure coverage',
    ],
    datasetFamilies: ['congress_trades'],
    calculations: ['count_by_period', 'purchase_sale_ratio', 'per_member_rate', 'disclosure_lag'],
    expectedGaps: ['exact trade sizes (amounts are ranges)', 'trades not yet disclosed'],
  },
  inflation_trend: {
    label: 'Inflation trend',
    exemplars: [
      'Is inflation in the United States accelerating?',
      'Is inflation in Europe cooling?',
    ],
    cues: /\b(inflation|cpi|consumer prices?|price growth)\b/i,
    gate: () => true,
    objectives: ['trend', 'macro_vulnerability'],
    dimensions: ['annual rate', 'monthly momentum', 'core versus headline', 'policy response'],
    datasetFamilies: ['inflation_monthly', 'inflation_annual', 'policy_rate'],
    calculations: ['change_over_period', 'momentum_vs_trend'],
    expectedGaps: ['inflation expectations', 'core inflation where not published'],
  },
  government_contracts: {
    label: 'Government contract dependency',
    exemplars: [
      'Which companies are most dependent on government contracts?',
      'How reliant is Palantir on federal spending?',
    ],
    cues: /\b(government contracts?|federal (?:contracts?|spending)|defen[cs]e contracts?|awards?|obligations?|government spending)\b/i,
    gate: () => true,
    objectives: ['exposure', 'ranking'],
    dimensions: ['obligations by year', 'share of revenue', 'agency concentration'],
    datasetFamilies: ['contracts'],
    calculations: ['obligations_by_fy', 'share_of_revenue'],
    expectedGaps: ['revenue by customer where the company does not report it'],
  },
  lobbying: {
    label: 'Lobbying',
    exemplars: [
      'Who is lobbying hardest on AI regulation?',
      'Which companies spend most on lobbying?',
    ],
    cues: /\b(lobby\w*)\b/i,
    gate: () => true,
    objectives: ['ranking', 'policy_impact', 'trend'],
    dimensions: ['spend by registrant', 'issues disclosed', 'change over time'],
    datasetFamilies: ['lobbying'],
    calculations: ['spend_by_quarter', 'rank'],
    expectedGaps: ['spend split by issue (filings report totals)'],
  },
  industry_concentration: {
    label: 'Industry concentration',
    exemplars: [
      'How concentrated is the semiconductor industry?',
      'Who dominates the cloud market?',
    ],
    cues: /\b(industry|market|sector)\b.*\b(concentrat\w*|dominat\w*|share)\b|\b(concentrat\w*|dominat\w*)\b.*\b(industry|market|sector)\b/i,
    gate: () => true,
    objectives: ['concentration', 'ranking'],
    dimensions: ['share of the largest firms', 'effective number of firms', 'change over time'],
    datasetFamilies: ['revenue', 'market_cap'],
    calculations: ['top_n_share', 'hhi', 'effective_number'],
    expectedGaps: ['private company revenue', 'segment revenue for diversified firms'],
  },
  valuation_vs_earnings: {
    label: 'Valuation versus earnings',
    exemplars: [
      "How has NVIDIA's valuation changed relative to earnings growth?",
      'Is Tesla expensive relative to its earnings?',
    ],
    cues: /\b(valuation|p\/e|price.to.earnings|multiple)\b.*\b(earnings|eps|profit)\b|\b(earnings|eps)\b.*\b(valuation|multiple)\b/i,
    gate: () => true,
    objectives: ['relative_performance', 'financial_statement', 'trend'],
    dimensions: ['price change', 'earnings change', 'multiple change'],
    datasetFamilies: ['prices', 'fundamentals'],
    calculations: ['pct_change', 'multiple_change'],
    expectedGaps: ['forward earnings estimates'],
  },
  sovereign_debt: {
    label: 'Sovereign debt',
    exemplars: [
      'Which countries have the highest sovereign debt burdens?',
      'Is Italian government debt sustainable?',
    ],
    cues: /\b(sovereign debt|government debt|public debt|debt.to.gdp|debt burdens?)\b/i,
    gate: () => true,
    objectives: ['ranking', 'macro_vulnerability'],
    dimensions: ['debt ratio', 'change over time', 'interest burden'],
    datasetFamilies: ['government_debt'],
    calculations: ['rank', 'change_over_period'],
    expectedGaps: ['interest cost and maturity profile', 'contingent liabilities'],
  },
  institutional_flows: {
    label: 'Institutional positioning',
    exemplars: [
      'Are institutional investors increasing their exposure to technology stocks?',
      'Which funds bought NVIDIA last quarter?',
    ],
    cues: /\b(institutional|13f|hedge funds?|asset managers?|funds?)\b.*\b(exposure|holdings?|positions?|buy\w*|sell\w*|increas\w*)\b/i,
    gate: () => true,
    objectives: ['trend', 'exposure'],
    dimensions: ['quarter-on-quarter position change', 'number of holders', 'concentration'],
    datasetFamilies: ['holdings'],
    calculations: ['position_change_13f'],
    expectedGaps: ['short positions and derivatives (13F reports long equity only)'],
  },
};

/** Preferred visualization per objective: guidelines, not fixed mappings. */
export const OBJECTIVE_VIZ = {
  ranking: ['ranked_bar'],
  trend: ['line'],
  concentration: ['stacked_share', 'ranked_bar'],
  relative_performance: ['indexed_line', 'comparison_bar'],
  risk_assessment: ['line_with_threshold'],
  macro_vulnerability: ['line_with_threshold'],
  causal: ['relationship_map'],
  exposure: ['ranked_bar', 'stacked_share'],
  policy_impact: ['timeline', 'line'],
  financial_statement: ['line', 'comparison_bar'],
  event_driven: ['event_line'],
  cross_dataset: ['scatter'],
};

const words = (t) =>
  String(t || '')
    .toLowerCase()
    .match(/[a-z][a-z'-]+/g) || [];

/** The measures a text names, in MEASURES order. */
export function measuresOf(text) {
  return MEASURES.filter(([, re]) => re.test(String(text || ''))).map(([id]) => id);
}

/** Lexical family scores in 0..1 (cue hit, plus a small bonus when an objective agrees). */
export function lexicalFamilyScores(text, ctx = {}) {
  const t = String(text || '');
  const out = {};
  for (const [id, fam] of Object.entries(QUERY_FAMILIES)) {
    if (!fam.gate({ text: t, countries: ctx.countries || 0 })) continue;
    if (!fam.cues.test(t)) continue;
    const objHits = fam.objectives.filter((o) => OBJECTIVE_CUES[o].test(t)).length;
    out[id] = Math.min(1, 0.6 + 0.15 * objHits);
  }
  return out;
}

/**
 * The analytical intent of a question.
 * @param {string} query
 * @param {{ spec?: object, understood?: object, semantic?: Record<string, number>|null }} opts
 *   semantic: family id -> cosine similarity (0..1) from semantic.js, when available.
 */
export function analyticalIntent(query, { spec = null, understood = null, semantic = null } = {}) {
  const text = String(query || spec?.rawQuery || understood?.raw || '');
  const entities = (spec?.entities || understood?.entities || []).map((e) => ({
    kind: e.kind,
    id: e.id,
    label: e.label,
  }));
  const countries = entities.filter((e) => e.kind === 'country' || e.kind === 'state_province');
  const subjectKinds = new Set(entities.map((e) => e.kind));

  /* Objectives: every cue that fires. "Which ... most" is a ranking; a ranking word inside
     a concentration or trend question stays secondary. */
  let objectives = OBJECTIVES.filter((o) => OBJECTIVE_CUES[o].test(text));
  if (/^\s*(is|are|has|have|does|do|can|will)\b/i.test(text) && objectives.includes('ranking')) {
    /* "Is the lira under pressure?" is a yes/no assessment, never a ranking. */
    objectives = objectives.filter((o) => o !== 'ranking');
  }

  /* Family: lexical, optionally blended with semantic similarity; entity gates first. */
  const lex = lexicalFamilyScores(text, { countries: countries.length });
  const scores = {};
  for (const [id, fam] of Object.entries(QUERY_FAMILIES)) {
    if (!fam.gate({ text, countries: countries.length })) continue;
    const l = lex[id] || 0;
    const s = semantic && Number.isFinite(semantic[id]) ? semantic[id] : null;
    /* A semantic score alone never assigns a family: it needs at least one cue or a very
       close exemplar (two questions can be near in vector space and need different
       analysis). */
    const blended = s == null ? l : l ? 0.55 * l + 0.45 * s : s >= 0.86 ? s * 0.8 : 0;
    if (blended > 0) scores[id] = +blended.toFixed(3);
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const familyId = ranked[0] && ranked[0][1] >= 0.5 ? ranked[0][0] : null;
  const family = familyId ? QUERY_FAMILIES[familyId] : null;

  if (!objectives.length && family) objectives = [family.objectives[0]];
  if (!objectives.length) objectives = [spec?.objective?.primary === 'rank' ? 'ranking' : 'trend'];

  /* The primary objective: what the question is trying to establish. A ranking word
     ("which") yields to concentration, trend or risk when those fire too. */
  const primaryOf = () => {
    const strong = objectives.filter((o) => o !== 'ranking' && o !== 'event_driven');
    if (objectives.includes('concentration')) return 'concentration';
    if (objectives.includes('risk_assessment')) return 'risk_assessment';
    if (
      objectives.includes('ranking') &&
      /^\s*(which|who|what are the|top|list)\b/i.test(text) &&
      !objectives.includes('trend') &&
      !objectives.includes('exposure')
    )
      return 'ranking';
    if (objectives.includes('exposure') && objectives.includes('ranking')) return 'exposure';
    /* "Are investors increasing their exposure?" asks about a change: trend leads. */
    if (/^\s*(is|are|has|have)\b/i.test(text) && objectives.includes('trend')) return 'trend';
    return strong[0] || objectives[0];
  };
  const primary = primaryOf();
  const secondary = objectives.filter((o) => o !== primary);
  const measures = measuresOf(text);
  const horizon = spec?.timeHorizon || null;

  /* Focus terms: the content words of the question, for relevance checks downstream. */
  const STOP = new Set(
    'the a an of in on for to and or is are was were has have had how what which who why when where does do did be been being by with from at as it its this that these those most more less least over last past than into their there any all'.split(
      ' ',
    ),
  );
  const focusTerms = [...new Set(words(text).filter((w) => w.length > 2 && !STOP.has(w)))];

  return {
    version: INTENT_VERSION,
    question: text,
    primary,
    primaryLabel: OBJECTIVE_LABELS[primary],
    objectives: [primary, ...secondary],
    secondary,
    family: familyId,
    familyLabel: family?.label || null,
    familyScores: scores,
    entities,
    geography: countries.map((c) => c.label),
    subjectKinds: [...subjectKinds],
    horizon,
    measures,
    measure: measures[0] || null,
    comparisons: objectives.includes('relative_performance')
      ? entities.filter((e) => e.kind === 'ticker' || e.kind === 'country').map((e) => e.label)
      : [],
    dimensions: family?.dimensions || [],
    datasetFamilies: family?.datasetFamilies || [],
    calculations: family?.calculations || [],
    visualizations: [...new Set([primary, ...secondary].flatMap((o) => OBJECTIVE_VIZ[o] || []))],
    expectedGaps: family?.expectedGaps || [],
    /* How strong the evidence can be: a causal or forward question can rarely be settled
       by the data Sonar holds. */
    expectedEvidence:
      primary === 'causal' || horizon?.kind === 'forward'
        ? 'weak'
        : primary === 'ranking' || primary === 'trend'
          ? 'strong'
          : 'moderate',
    alternatives:
      primary === 'causal'
        ? ['timing coincidence', 'a common driver', 'measurement or revision effects']
        : [],
    needsHistory: objectives.includes('trend') || objectives.includes('concentration'),
    focusTerms,
  };
}

/**
 * The analytical plan block appended to the synthesis prompt (no extra model call): what the
 * question is trying to establish and what a finding has to do.
 */
export function intentBlock(intent) {
  if (!intent) return '';
  const lines = [
    `\n\nAnalytical plan (${intent.version}):`,
    `- Primary objective: ${intent.primaryLabel}.${intent.secondary.length ? ` Also: ${intent.secondary.map((o) => OBJECTIVE_LABELS[o]).join(', ')}.` : ''}`,
  ];
  if (intent.familyLabel) lines.push(`- Question family: ${intent.familyLabel}.`);
  if (intent.measure)
    lines.push(
      `- Measure asked about: ${intent.measure.replace(/_/g, ' ')}. Findings about another measure are context, not the answer.`,
    );
  if (intent.dimensions.length)
    lines.push(
      `- Dimensions worth examining if the records support them: ${intent.dimensions.join('; ')}.`,
    );
  if (intent.expectedGaps.length)
    lines.push(
      `- If the records lack any of these, say what the gap prevents you from concluding: ${intent.expectedGaps.join('; ')}.`,
    );
  if (intent.needsHistory)
    lines.push(
      '- This question needs change over time. With a single observation, say a trend cannot be established.',
    );
  return lines.join('\n');
}
