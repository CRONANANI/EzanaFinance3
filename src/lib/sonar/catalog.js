/**
 * Sonar's dataset catalog, DERIVED from EzanaQL's own catalog
 * (src/lib/ezanaql/catalog.js) so there is exactly one schema
 * (sonar-ezanaql-coverage-prompt.md Step 1). Nothing here duplicates field
 * lists: entity keys come from a hand-kept field-name map, dims from the
 * declared field types (date → time, money/int/float → numeric,
 * string → category), metrics from the money/int/float fields.
 *
 * Entity kinds: company, person_politician, person_insider, fund, agency,
 * industry, sector, country, region, bill, issue, market, committee, theme.
 */
import { CATALOG } from '@/lib/ezanaql/catalog';

/** field name → the entity kind that field identifies. First match wins. */
const ENTITY_FIELD_KINDS = [
  ['ticker', 'company'],
  ['cusip', 'company'],
  ['issuer', 'company'],
  ['company', 'company'],
  ['recipient', 'company'],
  ['client', 'company'],
  ['assignee', 'company'],
  ['holding', 'company'],
  ['bioguide_id', 'person_politician'],
  ['politician', 'person_politician'],
  ['member_last', 'person_politician'],
  ['insider_name', 'person_insider'],
  ['filer_cik', 'fund'],
  ['filer', 'fund'],
  ['institution', 'fund'],
  ['awarding_agency', 'agency'],
  ['committee_id', 'committee'],
  ['committee', 'committee'],
  ['country_code', 'country'],
  ['country', 'country'],
  ['market_id', 'market'],
  ['question', 'market'],
  ['chokepoint', 'region'],
  ['port', 'region'],
  ['commodity', 'theme'],
  ['category', 'issue'],
  ['sector', 'sector'],
  ['industry', 'industry'],
];

const TYPE_TO_DIM = {
  date: 'time',
  money: 'numeric',
  int: 'numeric',
  float: 'numeric',
  bool: 'category',
  string: 'category',
};
const METRIC_AGGS = { money: 'sum', int: 'sum', float: 'avg' };
const METRIC_FMTS = { money: 'currency_compact', int: 'int', float: 'ratio' };

/** Keywords each dataset contributes to the news query (Step 6). */
const NEWS_KEYWORDS = {
  'gov.contracts': ['contract award', 'federal contract'],
  'capitol.congress_trades': ['congress', 'stock trade disclosure'],
  'capitol.holdings': ['congress', 'portfolio'],
  'capitol.lobbying': ['lobbying'],
  'capitol.committee_seats': ['committee'],
  'capitol.campaign_finance': ['campaign finance', 'donors'],
  'prediction.markets': ['odds', 'prediction market'],
  'titans.holdings_13f': ['13F', 'institutional holdings'],
  'titans.activist_stakes': ['13D', 'activist stake'],
  'titans.whale_moves': ['institutional buying'],
  'lighthouse.oecd': ['economic outlook'],
  'eyes.chokepoints': ['shipping', 'chokepoint'],
  'eyes.ports': ['port traffic', 'trade'],
  'eyes.patents': ['patent'],
  'house.filings': ['financial disclosure'],
};

function deriveDef(id, def) {
  const fields = def.fields || {};
  const entityKeys = {};
  for (const [fieldName, kind] of ENTITY_FIELD_KINDS) {
    if (fields[fieldName] && entityKeys[kind] == null) entityKeys[kind] = fieldName;
  }
  const dims = {};
  const metrics = {};
  for (const [name, f] of Object.entries(fields)) {
    const type = f?.type || 'string';
    dims[name] = TYPE_TO_DIM[type] || 'category';
    if (METRIC_AGGS[type]) {
      metrics[name] = { agg: METRIC_AGGS[type], format: METRIC_FMTS[type] };
    }
  }
  return {
    id,
    label: def.label || id,
    available: Boolean(def.available),
    entityKeys,
    dims,
    metrics,
    newsKeywords: NEWS_KEYWORDS[id] || [],
  };
}

/** Every EzanaQL dataset as a Sonar DatasetDef, keyed by its catalog id. */
export const DATASET_DEFS = Object.fromEntries(
  Object.entries(CATALOG).map(([id, def]) => [id, deriveDef(id, def)]),
);

export const LIVE_DATASETS = Object.values(DATASET_DEFS)
  .filter((d) => d.available)
  .map((d) => d.id);

export function getDatasetDef(id) {
  return DATASET_DEFS[id] || null;
}

/** Entity kinds a dataset exposes. */
export function entityKindsOf(id) {
  return Object.keys(DATASET_DEFS[id]?.entityKeys || {});
}

/** All dataset pairs (live only) that share at least one entity kind, with
 *  the shared kinds. The link rules and the coverage matrix both derive from
 *  this, so a new catalog entry joins the system without new Sonar code. */
export function sharedKeyPairs() {
  const live = LIVE_DATASETS;
  const pairs = [];
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = new Set(entityKindsOf(live[i]));
      const shared = entityKindsOf(live[j]).filter((k) => a.has(k));
      if (shared.length) pairs.push({ pair: [live[i], live[j]], shared });
    }
  }
  return pairs;
}
