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
];
