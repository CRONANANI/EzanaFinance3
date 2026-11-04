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

/* Dataset entitlement each gated source needs (entitlements.js ids). */
export const SOURCE_DATASET = {
  congress_sector: 'congress',
  congress_company: 'congress',
  politician_dossier: 'congress',
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
  deep: { maxTasks: 14, items: 8, taskMs: 12_000, label: 'Deep research' },
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
  institutional_13f: { id: 'holders_leaders', type: 'leaderboard', metric: 'holdings_value' },
};

function paramsFor(source, resolution, spec) {
  const r = resolution || {};
  const tickers = r.universe?.tickers || [];
  const p = {};
  switch (source) {
    case 'market_snapshot':
    case 'analysts':
    case 'ipo_filings':
      if (!r.company?.ticker) return null;
      return { ticker: r.company.ticker, name: r.company.name };
    case 'politician_dossier':
      return r.politician ? { politician: r.politician } : null;
    case 'commodity_series':
      return r.commodity ? { commodity: r.commodity, horizon: spec.timeHorizon } : null;
    case 'macro_country':
      return r.countries?.[0]?.iso3 ? { country: r.countries[0] } : null;
    case 'industry_registry':
      return r.industry?.registry ? { industry: r.industry } : null;
    case 'lobbying_leaders':
      return {
        issueBuckets: issueBucketsFor(spec, r),
        text: issueTextFor(spec),
        years: yearsFor(spec),
      };
    case 'sanctions':
      return { countries: r.countries || [], query: spec.rawQuery };
    case 'news':
    case 'echo':
    case 'prediction_markets':
      return {
        phrase: r.subject?.label || spec.question,
        tickers: tickers.slice(0, 6),
        query: spec.rawQuery,
      };
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

/* A topic narrower than an LDA issue area, searched in the filings' specific
   issue descriptions (lobbying_filings.specific_issues) when they exist. */
const ISSUE_TEXT = [
  [
    /\b(ai|artificial intelligence|machine learning|generative)\b/i,
    '"artificial intelligence" OR "machine learning" OR "generative AI" OR AI',
  ],
  [/\b(semiconductors?|chips?|chips act)\b/i, 'semiconductor OR semiconductors OR "CHIPS Act"'],
  [
    /\b(crypto\w*|digital assets?|stablecoins?|blockchain)\b/i,
    'cryptocurrency OR "digital asset" OR "digital assets" OR stablecoin OR blockchain',
  ],
  [
    /\b(tiktok|social media|online safety|kids online)\b/i,
    '"social media" OR "online safety" OR TikTok',
  ],
];
export function issueTextFor(spec) {
  const hit = ISSUE_TEXT.find(([re]) => re.test(spec.rawQuery || ''));
  return hit ? hit[1] : null;
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
  for (const source of Object.keys(SOURCES)) {
    let priority = 0;
    const drivers = [];
    for (const d of spec.domains || []) {
      const w = weightOf(config, d.id, source);
      const s = d.score * w;
      if (s > 0) drivers.push({ domain: d.id, contribution: Number(s.toFixed(3)) });
      if (s > priority) priority = s;
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
