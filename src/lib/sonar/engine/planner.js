/**
 * Sonar research engine: the research planner (engine v3, Section 4).
 *
 * Turns a research spec plus its resolution into an EXECUTABLE plan: which
 * evidence sources run, with what parameters, priority, capacity and time
 * budget, and which sources are excluded and why. Retrieval capacity follows
 * the question: a source scores max over active domains of
 * (domain score x config weight). Below the config threshold a source is
 * excluded, so an AI lobbying question never spends capacity on OECD
 * figures just because they exist.
 *
 * Pure. Unit-tested in scripts/check-sonar-engine.mjs.
 */
import { SOURCES, DEFAULT_CONFIG, weightOf } from './domains';
import { topicForText } from '@/lib/lobbying/topics';
import { routeMacro, findCountries, frameworksForRoute } from '@/lib/sonar/macro/route';
import { FRAMEWORKS } from '@/lib/sonar/macro/playbook';

/* Dataset entitlement each gated source needs (entitlements.js ids). */
export const SOURCE_DATASET = {
  congress_sector: 'congress',
  congress_company: 'congress',
  politician_dossier: 'congress',
  congress_activity: 'congress',
  contracts_history: 'gov-contracts',
  institutional_13f: '13f',
  sec_filings: 'sec-filings',
  lobbying_leaders: 'lobbying',
  lobbying_company: 'lobbying',
  sanctions: 'sanctions',
  prediction_markets: 'prediction-markets',
  echo: 'echo',
  ipo_filings: 'ipo-filings',
};

/* Per research depth: tasks allowed, items per source, time per task. */
export const DEPTHS = {
  quick: { maxTasks: 5, items: 3, taskMs: 2_000, label: 'Quick research' },
  standard: { maxTasks: 8, items: 5, taskMs: 2_500, label: 'Standard research' },
  deep: { maxTasks: 30, items: 8, taskMs: 20_000, label: 'Deep research' },
};

/* What a chart needs, by source. A planned chart renders only if its data
   comes back (analysis.js decides). */
const VIS_BY_SOURCE = {
  lobbying_leaders: { id: 'lobbying_leaders', type: 'leaderboard', metric: 'lobbying_spend' },
  congress_sector: { id: 'congress_monthly', type: 'timeline', metric: 'trade_count' },
  contracts_history: {
    id: 'contracts_leaders',
    type: 'leaderboard',
    metric: 'contract_obligations',
  },
  price_performance: { id: 'performance_leaders', type: 'leaderboard', metric: 'price_change' },
  revenue_geo: { id: 'revenue_exposure', type: 'bars', metric: 'revenue_by_region' },
  commodity_series: { id: 'commodity_price', type: 'line', metric: 'price_change' },
  macro_series: { id: 'macro_series', type: 'line', metric: 'macro_series' },
  institutional_13f: { id: 'holders_leaders', type: 'leaderboard', metric: 'holdings_value' },
};

export function paramsFor(source, resolution, spec) {
  const r = resolution || {};
  const tickers = r.universe?.tickers || [];
  const p = {};
  switch (source) {
    case 'market_snapshot':
    case 'analysts':
    case 'ipo_filings':
    case 'company_financials':
    case 'product_segments':
    case 'holder_positioning':
      if (!r.company?.ticker) return null;
      return { ticker: r.company.ticker, name: r.company.name };
    case 'peer_financials':
      if (!r.company?.ticker) return null;
      return { ticker: r.company.ticker, name: r.company.name, peers: r.peers || [] };
    case 'customer_capex':
      if (!r.company?.ticker || !r.customers?.length) return null;
      return { ticker: r.company.ticker, name: r.company.name, customers: r.customers };
    case 'export_controls': {
      const iso2 = (r.countries || []).map((c) => c.iso2).filter(Boolean);
      return {
        ticker: r.company?.ticker || null,
        name: r.company?.name || r.subject?.label || null,
        countries: iso2.length ? iso2 : ['CN', 'HK'],
      };
    }
    case 'capex_monetization':
    case 'hyperscaler_capex':
    case 'contracts_profile':
    case 'value_chain':
      if (!r.company?.ticker) return null;
      return { ticker: r.company.ticker, name: r.company.name };
    case 'lobbying_profile':
      if (!r.company?.ticker) return null;
      return { ticker: r.company.ticker, name: r.company.name, peers: (r.peers || []).slice(0, 6) };
    case 'competitive_products':
      if (!r.company?.ticker) return null;
      return { ticker: r.company.ticker, name: r.company.name, customers: r.customers || [] };
    case 'estimates':
    case 'disclosures':
    case 'lobbying_associations':
      if (!r.company?.ticker) return null;
      return { ticker: r.company.ticker, name: r.company.name };
    case 'politician_dossier':
      return r.politician ? { politician: r.politician } : null;
    /* Nov 7: chamber-wide activity runs only when no member or company is
       the subject; the runner re-checks the question itself. */
    case 'congress_activity':
      return r.politician || tickers.length || r.company?.ticker
        ? null
        : { rawQuery: spec.rawQuery || spec.question || '' };
    case 'commodity_series':
      return r.commodity ? { commodity: r.commodity, horizon: spec.timeHorizon } : null;
    case 'macro_country':
      return r.countries?.[0]?.iso3
        ? { country: r.countries[0], rawQuery: spec.rawQuery || spec.question || '' }
        : null;
    case 'macro_series':
      return macroSeriesParams(spec, r);
    case 'industry_registry':
      return r.industry?.registry ? { industry: r.industry } : null;
    case 'lobbying_leaders':
      return {
        issueBuckets: issueBucketsFor(spec, r),
        text: issueTextFor(spec),
        topic: topicForText(spec.rawQuery)?.key || null,
        years: yearsFor(spec),
      };
    case 'sanctions':
      return { countries: r.countries || [], query: spec.rawQuery };
    case 'news':
    case 'echo':
    case 'prediction_markets': {
      const phrase = r.subject?.label || spec.question;
      return {
        phrase,
        /* An investment memo reads the news once per angle. */
        ...(source === 'news' && spec.format === 'investment_memo'
          ? { phrases: memoNewsPhrases(r, spec) }
          : {}),
        tickers: tickers.slice(0, 6),
        query: spec.rawQuery,
      };
    }
    default: {
      const need = SOURCES[source]?.needs || [];
      if (need.includes('tickers') && !tickers.length) return null;
      p.tickers = tickers.slice(
        0,
        source === 'revenue_geo' || source === 'institutional_13f' ? 10 : 30,
      );
      p.names = r.universe?.names || {};
      p.universeLabel = r.universe?.label || null;
      p.years = yearsFor(spec);
      return p;
    }
  }
}

/**
 * macro_series params from the spec: the macro router's reading of the question (countries,
 * themes, commodity, ranking) plus the resolver's countries, max 4. Null when the question
 * names none of these, so the planner records the unmet need instead of running it.
 */
export function macroSeriesParams(spec, resolution) {
  const route = routeMacro(spec?.rawQuery || spec?.question || '');
  const isos = [...route.countries];
  for (const c of resolution?.countries || []) {
    if (c?.iso3 && /^[A-Z]{3}$/.test(c.iso3) && !isos.includes(c.iso3)) isos.push(c.iso3);
  }
  const countries = route.ranking ? [] : isos.slice(0, 4);
  if (!countries.length && !route.themes.length && !route.commodity && !route.ranking) return null;
  /* Nov 6: the frameworks the question needs shape the plan. Their families become
     required evidence, read first; a currency question also reads the structural
     vulnerabilities (external debt, credit gap, debt service). */
  const frameworks = route.ranking ? [] : frameworksForRoute({ ...route, countries });
  const required = [
    ...new Set([
      ...frameworks.flatMap((id) => FRAMEWORKS[id]?.families || []),
      ...(frameworks.includes('currency') ? ['external_debt', 'credit_gap', 'debt_service'] : []),
    ]),
  ].filter((f) => f !== 'sanctions');
  return {
    countries,
    themes: route.themes,
    families: [...new Set([...required, ...route.families])],
    required,
    frameworks,
    currency: route.currency || null,
    commodity: route.commodity,
    ranking: route.ranking,
    region: route.region,
  };
}

/* The sources an investment risk assessment always reads when its subject
   allows, whatever the weights say: the memo has a section for each. */
export const MEMO_SOURCES = [
  'company_financials',
  'product_segments',
  'holder_positioning',
  'peer_financials',
  'customer_capex',
  'estimates',
  'disclosures',
  'export_controls',
  'competitive_products',
  'lobbying_associations',
  'capex_monetization',
  'hyperscaler_capex',
  'contracts_profile',
  'lobbying_profile',
  'value_chain',
  'market_snapshot',
  'analysts',
  'revenue_geo',
  'contracts_history',
  'lobbying_company',
  'sec_filings',
  'news',
  'echo',
];

/* Sources a memo reads through a richer reader instead. */
const MEMO_REPLACED = {
  institutional_13f: 'holder_positioning',
  contracts_history: 'contracts_profile',
  lobbying_company: 'lobbying_profile',
};

const SHORT_NAME = (s) =>
  String(s || '')
    .replace(/,?\s+(Corporation|Corp\.?|Incorporated|Inc\.?|Ltd\.?|plc|Holdings?)$/i, '')
    .trim();

/** One news search per memo angle: "NVIDIA export controls", "NVIDIA competition". */
export function memoNewsPhrases(resolution, spec) {
  const name = SHORT_NAME(resolution?.subject?.label || resolution?.company?.name) || spec.question;
  const byAngle = {
    geopolitics: `${name} export controls`,
    competition: `${name} competition`,
    customers: `${name} customers`,
    contracts: `${name} government contract`,
    financials: `${name} earnings`,
    valuation: `${name} analysts`,
    industry: `${name} supply chain`,
    lobbying: `${name} lobbying`,
  };
  const out = [name];
  for (const a of spec.angles || []) if (byAngle[a.id]) out.push(byAngle[a.id]);
  if (!out.some((p) => /export controls/.test(p))) out.push(byAngle.geopolitics);
  return [...new Set(out)].slice(0, 6);
}

/* LDA issue buckets a lobbying question maps to (lobbying_filings.issue_buckets:
   defense, energy, health, tax, tech, trade, other). */
export function issueBucketsFor(spec, resolution) {
  const t = `${spec.rawQuery} ${resolution?.industry?.label || ''}`.toLowerCase();
  const out = [];
  if (
    /\b(ai|artificial intelligence|tech\w*|semiconductor|chips?|software|data|privacy|cyber|internet|telecom)\b/.test(
      t,
    )
  )
    out.push('tech');
  if (/\b(defen[cs]e|military|weapons?|pentagon)\b/.test(t)) out.push('defense');
  if (/\b(energy|oil|gas|nuclear|climate|power)\b/.test(t)) out.push('energy');
  if (/\b(health|drug|pharma\w*|medicare|medicaid)\b/.test(t)) out.push('health');
  if (/\b(tax\w*)\b/.test(t)) out.push('tax');
  if (/\b(trade|tariffs?|export)\b/.test(t)) out.push('trade');
  return out;
}

/* A topic narrower than an LDA issue area (src/lib/lobbying/topics.js),
   searched in the filings' specific issue text once its ingest is complete. */
export function issueTextFor(spec) {
  return topicForText(spec.rawQuery)?.tsquery || null;
}

function yearsFor(spec) {
  const now = new Date(spec?.timeHorizon?.asOf || Date.now());
  const y = now.getUTCFullYear();
  return { from: y - 2, to: y };
}

/**
 * Build the plan.
 * @param {object} spec        buildResearchSpec() output
 * @param {object} resolution  resolveResearch() output
 * @param {{ config?: object, depth?: 'quick'|'standard'|'deep', entitledDatasets?: string[]|null }} opts
 * @returns {{ version: string, configVersion: string, depth: string, tasks: Array, excluded: Array, visualizations: Array }}
 */
export function planResearch(
  spec,
  resolution,
  { config = DEFAULT_CONFIG, depth = 'standard', entitledDatasets = null } = {},
) {
  const D = DEPTHS[depth] || DEPTHS.standard;
  const threshold = Number(config.threshold) || 0.3;
  const entitled = entitledDatasets ? new Set(entitledDatasets) : null;
  const candidates = [];
  const excluded = [];
  const memo = spec.format === 'investment_memo';
  for (const source of Object.keys(SOURCES)) {
    /* The memo's positioning reader replaces the plain top-holders list. */
    if (memo && MEMO_REPLACED[source]) {
      excluded.push({ source, reason: `replaced:${MEMO_REPLACED[source]}` });
      continue;
    }
    let priority = 0;
    const drivers = [];
    for (const d of spec.domains || []) {
      const w = weightOf(config, d.id, source);
      const s = d.score * w;
      if (s > 0) drivers.push({ domain: d.id, contribution: Number(s.toFixed(3)) });
      if (s > priority) priority = s;
    }
    if (memo && MEMO_SOURCES.includes(source)) {
      priority = Math.max(priority, 0.85);
      drivers.push({ domain: 'investment_memo', contribution: 0.85 });
    }
    if (priority < threshold) {
      if (priority > 0)
        excluded.push({ source, reason: 'below_threshold', priority: Number(priority.toFixed(3)) });
      continue;
    }
    const ds = SOURCE_DATASET[source];
    if (entitled && ds && !entitled.has(ds)) {
      excluded.push({ source, reason: 'not_entitled', dataset: ds });
      continue;
    }
    const params = paramsFor(source, resolution, spec);
    if (!params) {
      excluded.push({
        source,
        reason: `unmet_needs:${(SOURCES[source].needs || []).join(',') || 'params'}`,
      });
      continue;
    }
    candidates.push({
      source,
      priority: Number(priority.toFixed(3)),
      drivers: drivers.sort((a, b) => b.contribution - a.contribution).slice(0, 3),
      params,
    });
  }
  candidates.sort((a, b) => b.priority - a.priority);
  const kept = candidates.slice(0, D.maxTasks);
  for (const c of candidates.slice(D.maxTasks)) {
    excluded.push({ source: c.source, reason: 'depth_cap', priority: c.priority });
  }
  const tasks = kept.map((c, i) => ({
    id: `t${i + 1}_${c.source}`,
    source: c.source,
    params: c.params,
    priority: c.priority,
    maxItems: Math.max(1, Math.round(D.items * (0.5 + c.priority / 2))),
    budgetMs: D.taskMs,
    dependsOn: [],
    reason: c.drivers.map((d) => d.domain).join('+') || 'default',
    drivers: c.drivers,
  }));
  const visualizations = tasks
    .map((t) => VIS_BY_SOURCE[t.source])
    .filter(Boolean)
    .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
  return {
    version: 'plan-v1',
    configVersion: config.version,
    depth,
    tasks,
    excluded,
    visualizations,
  };
}

/* Evidence a company memo reads its countries from: where revenue is reported, export
   rules, customers and disclosures. */
const MEMO_COUNTRY_SOURCES = new Set([
  'revenue_geo',
  'export_controls',
  'customer_capex',
  'disclosures',
  'product_segments',
]);

/**
 * The countries a company memo's macro context covers: any the question names first, then
 * those its revenue, export-control and customer evidence names most often. Max 3. Pure.
 */
export function memoContextCountries(evidence, resolution, { max = 3 } = {}) {
  const counts = new Map();
  for (const e of evidence || []) {
    if (!MEMO_COUNTRY_SOURCES.has(e.source)) continue;
    for (const iso3 of findCountries(`${e.title || ''}. ${e.text || ''}`)) {
      counts.set(iso3, (counts.get(iso3) || 0) + 1);
    }
  }
  const named = (resolution?.countries || [])
    .map((c) => c?.iso3)
    .filter((c) => c && /^[A-Z]{3}$/.test(c));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([iso3]) => iso3);
  return [...new Set([...named, ...ranked])].slice(0, max);
}
