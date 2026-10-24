/**
 * The ten few-shot examples for the understanding call (spec A4), also the
 * fixture for scripts/check-sonar-understand.mjs. `entities` lists the
 * expected CHOSEN entities as kind:id.
 */
export const EXAMPLES = [
  {
    raw: 'give me a lyout of the semiconductor industry in the USA',
    corrected: 'give me a layout of the semiconductor industry in the USA',
    intent: 'industry_layout',
    entities: ['industry:semiconductors', 'country:US'],
  },
  {
    raw: 'steel industry in canda',
    corrected: 'steel industry in Canada',
    intent: 'industry_country',
    entities: ['industry:steel', 'country:CA'],
  },
  { raw: 'USA', corrected: 'USA', intent: 'ticker_lookup', entities: ['ticker:USA'] },
  {
    raw: '$USA 13F holders',
    corrected: '$USA 13F holders',
    intent: 'fund',
    entities: ['ticker:USA'],
  },
  {
    raw: 'top 10 chip compnies in the US',
    corrected: 'top 10 chip companies in the US',
    intent: 'ranking',
    entities: ['industry:semiconductors', 'country:US'],
  },
  {
    raw: 'nancy pelosy trades',
    corrected: 'nancy pelosi trades',
    intent: 'politician',
    entities: ['person_politician:bioguide:P000197'],
  },
  {
    raw: 'how does the aerospace supply chain work',
    corrected: 'how does the aerospace supply chain work',
    intent: 'industry_layout',
    entities: ['industry:aerospace_defense'],
  },
  {
    raw: 'NVDA vs AMD',
    corrected: 'NVDA vs AMD',
    intent: 'comparison',
    entities: ['ticker:NVDA', 'ticker:AMD'],
  },
  {
    raw: 'CHIPS act winners',
    corrected: 'CHIPS act winners',
    intent: 'policy',
    entities: ['policy:chips_act'],
  },
  {
    raw: 'AI stocks in the UK',
    corrected: 'AI stocks in the UK',
    intent: 'theme',
    entities: ['theme:ai', 'country:GB'],
  },
  /* Country ranks (sonar-country-ranking-fix). `metric` is the macro slot;
     metricExplicit is false when the ping only says "world economy". */
  {
    raw: 'what ranking is india in the world economy',
    corrected: 'what ranking is india in the world economy',
    intent: 'country_rank',
    entities: ['country:IN'],
    metric: 'gdp_nominal_usd',
    metricExplicit: false,
  },
  {
    raw: 'where does canada rank by gdp per capita',
    corrected: 'where does canada rank by gdp per capita',
    intent: 'country_rank',
    entities: ['country:CA'],
    metric: 'gdp_per_capita_usd',
    metricExplicit: true,
  },
  {
    raw: "is india bigger than japan's economy",
    corrected: "is india bigger than japan's economy",
    intent: 'comparison',
    entities: ['country:IN', 'country:JP'],
    metric: 'gdp_nominal_usd',
  },
  {
    raw: 'top 10 economies',
    corrected: 'top 10 economies',
    intent: 'ranking',
    entities: [],
    metric: 'gdp_nominal_usd',
    metricExplicit: false,
  },
  {
    raw: 'fastest growing economies',
    corrected: 'fastest growing economies',
    intent: 'ranking',
    entities: [],
    metric: 'gdp_growth_real',
    metricExplicit: true,
  },
  {
    raw: 'how does brazil rank on the global empire index',
    corrected: 'how does brazil rank on the global empire index',
    intent: 'country_rank',
    entities: ['country:BR'],
    metric: 'lighthouse_composite',
    metricExplicit: true,
  },
];
