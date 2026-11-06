/**
 * Sonar macro series catalogue (Nov 2026). Pure: no database, no network.
 *
 * One place that knows, for every family of series in public.macro_series_values, what it is,
 * when a question needs it and how to state it. Readers (series-store.js) fetch rows from
 * macro_series_latest; this module picks the right row per family, names it in words and
 * builds the evidence text Sonar cites.
 *
 * Rules the catalogue enforces:
 *   - no raw code ever reaches an answer: a row the name maps cannot name is left out;
 *   - observed vs projected: IMF WEO and AMECO values for the current year or later are
 *     projections; the observed value is the year before, and the projection is labelled;
 *   - every figure carries its period, and a change is only stated against the same period
 *     one year earlier;
 *   - findings only.
 *
 * JODI codes are from JODI's own guides: "A Guide on JODI-Oil World Database, Item Names"
 * (Sep 2017) and "A Guide on JODI-Gas World Database, Item Names" (Apr 2025), jodidata.org.
 */
import { toIso3, iso3Name } from '@/lib/macro-sync/formats.js';

/* ------------------------------------------------------------------ key helpers */

export const keyPrefix = (row) => String(row?.series_key || '').split(':')[0];
export const keyBody = (row) => {
  const k = String(row?.series_key || '');
  const i = k.indexOf(':');
  return i < 0 ? '' : k.slice(i + 1);
};
const parts = (row) => keyBody(row).split('.');
const src = (row) => row?.source;
/* IMF keys: dataflow.{ISO3}.{CODE}.{...} */
const imfCode = (row) => parts(row)[2] || '';

export const yearOf = (period) => Number(String(period || '').slice(0, 4)) || null;

/* ------------------------------------------------------------------ readable code maps */

/** JODI-Oil products (ENERGY_PRODUCT), jodi-oil-wdb-item-names-ver2017.pdf. */
export const JODI_PRODUCTS = {
  CRUDEOIL: 'crude oil',
  NGL: 'natural gas liquids',
  OTHERCRUDE: 'other primary oil',
  TOTCRUDE: 'total crude oil',
  LPG: 'liquefied petroleum gases',
  NAPHTHA: 'naphtha',
  GASOLINE: 'motor and aviation gasoline',
  KEROSENE: 'kerosenes',
  JETKERO: 'kerosene-type jet fuel',
  GASDIES: 'gas/diesel oil',
  RESFUEL: 'fuel oil',
  ONONSPEC: 'other oil products',
  TOTPRODS: 'total oil products',
  NATGAS: 'natural gas',
};

/** JODI flows (FLOW_BREAKDOWN). REFINOBS is refinery INTAKE; refinery output is REFGROUT. */
export const JODI_FLOWS = {
  INDPROD: 'production',
  OSOURCES: 'receipts from other sources',
  TOTIMPSB: 'imports',
  TOTEXPSB: 'exports',
  TRANSBAK: 'products transferred and backflows',
  DIRECUSE: 'direct use',
  STOCKCH: 'stock change',
  STATDIFF: 'statistical difference',
  REFINOBS: 'refinery intake',
  CLOSTLV: 'closing stocks',
  REFGROUT: 'refinery output',
  RECEIPTS: 'receipts',
  PTRANSF: 'products transferred',
  IPTRANSF: 'interproduct transfers',
  TOTDEMO: 'demand',
  // JODI-Gas
  IMPLNG: 'LNG imports',
  IMPPIP: 'pipeline imports',
  EXPLNG: 'LNG exports',
  EXPPIP: 'pipeline exports',
  TOTDEMC: 'gross inland deliveries (calculated)',
  MAINTOT: 'deliveries for electricity and heat generation',
};
/* Gas demand reads better as JODI's own term. */
const JODI_GAS_FLOW_OVERRIDES = { TOTDEMO: 'gross inland deliveries' };

/** JODI units (UNIT_MEASURE). Gas M3 is million cubic metres (at 15 C, 760 mm Hg). */
export const JODI_UNITS = {
  KBD: 'thousand barrels per day',
  KBBL: 'thousand barrels',
  KL: 'thousand kilolitres',
  KTONS: 'thousand metric tons',
  M3: 'million cubic metres',
  TJ: 'terajoules',
};

/** IMF World Economic Outlook codes held. */
export const IMF_WEO = {
  NGDP_RPCH: { name: 'Real GDP growth', unit: '%' },
  PCPIPCH: { name: 'Inflation, average consumer prices', unit: '%' },
  LUR: { name: 'Unemployment rate', unit: '%' },
  GGXWDG_NGDP: { name: 'General government gross debt', unit: '% of GDP' },
  GGXCNL_NGDP: { name: 'General government net lending/borrowing', unit: '% of GDP' },
  BCA_NGDPD: { name: 'Current account balance', unit: '% of GDP' },
};

/** IMF balance of payments (financial account) codes held. */
export const IMF_BOP_ACCOUNT = {
  A_NFA_T: 'net acquisition of financial assets',
  L_NIL_T: 'net incurrence of liabilities',
};
export const IMF_BOP_FUNCTION = {
  D_F: 'direct investment',
  P_F: 'portfolio investment',
  O_F: 'other investment',
};

/** IMF trade in goods codes held. */
export const IMF_IMTS = {
  XG_FOB_USD: 'Goods exports (FOB)',
  MG_CIF_USD: 'Goods imports (CIF)',
};

/** BIS dataflows held. */
export const BIS_DATASETS = {
  WS_CBPOL: 'Central bank policy rate',
  WS_XRU: 'US dollar exchange rate',
  WS_EER: 'Effective exchange rate',
  WS_CREDIT_GAP: 'Credit-to-GDP gap',
  WS_DSR: 'Debt service ratio',
  WS_TC: 'Credit to the non-financial sector',
  WS_SPP: 'Residential property prices',
};
const BIS_DSR_BORROWERS = {
  H: 'households',
  N: 'non-financial corporations',
  P: 'private non-financial sector',
};
const BIS_TC_BORROWERS = {
  C: 'non-financial sector',
  G: 'general government',
  H: 'households',
  N: 'non-financial corporations',
  P: 'private non-financial sector',
};

/** ILO ECO_SECTOR codes (employment by broad sector). The finer ECO_AGGREGATE and ISIC
    detail is not named here, so it never reaches an answer. */
const ILO_SECTORS = {
  ECO_SECTOR_AGR: 'agriculture',
  ECO_SECTOR_IND: 'industry',
  ECO_SECTOR_SER: 'services',
  ECO_SECTOR_TOTAL: 'all sectors',
};

/** Pink Sheet unit strings -> words. */
const PINK_UNITS = {
  '$/mt': 'US$ per metric ton',
  '$/kg': 'US$ per kg',
  '$/bbl': 'US$ per barrel',
  '$/troy oz': 'US$ per troy ounce',
  '$/mmbtu': 'US$ per MMBtu',
  '$/dmtu': 'US$ per dry metric ton unit',
  '$/cubic meter': 'US$ per cubic metre',
  'cents/sheet': 'US cents per sheet',
  '2010=100': 'index, 2010 = 100',
};

/** A Pink Sheet name as people say it ("Rice, Viet Namese 5%" -> "Rice, Vietnamese 5%"). */
export function pinkName(row) {
  const raw = String(row?.series_name || keyBody(row) || '').trim();
  if (!raw) return null;
  return raw
    .replace(/\s*\*+\s*$/, '')
    .replace(/Viet Namese/i, 'Vietnamese')
    .replace(/\bcfr\b/i, 'CFR')
    .replace(/\bu\.v\./i, 'unit value')
    .replace(/\bavg\b/i, 'average')
    .replace(/\s+/g, ' ');
}
export const pinkUnit = (row) => PINK_UNITS[String(row?.unit || '').trim()] || null;

/* ------------------------------------------------------------------ euro area */

/** Euro area members (21 from 1 January 2026, when Bulgaria joined). */
export const EURO_AREA = new Set([
  'AUT',
  'BEL',
  'BGR',
  'CYP',
  'DEU',
  'EST',
  'ESP',
  'FIN',
  'FRA',
  'GRC',
  'HRV',
  'IRL',
  'ITA',
  'LTU',
  'LUX',
  'LVA',
  'MLT',
  'NLD',
  'PRT',
  'SVK',
  'SVN',
]);

/** Euro-area-wide series (no country): the ECB rates, euro-area HICP, EUR/USD. */
export const EURO_AREA_KEYS = [
  { source: 'ecb', series_key: 'ECB.FM:B.U2.EUR.4F.KR.DFR.LEV' },
  { source: 'ecb', series_key: 'ECB.FM:B.U2.EUR.4F.KR.MRR_FR.LEV' },
  { source: 'ecb', series_key: 'ECB.ICP:M.U2.N.000000.4.ANR' },
  { source: 'ecb', series_key: 'ECB.EXR:M.USD.EUR.SP00.A' },
  { source: 'bis', series_key: 'WS_CBPOL:M.XM' },
];
export const isEuroAreaRow = (row) =>
  EURO_AREA_KEYS.some((k) => k.source === row?.source && k.series_key === row?.series_key);

/* ------------------------------------------------------------------ regions */

export const REGIONS = {
  latin_america: {
    label: 'Latin America',
    re: /\blatin america|\blatam\b|south america|central america/i,
    members: [
      'ARG',
      'BOL',
      'BRA',
      'CHL',
      'COL',
      'CRI',
      'CUB',
      'DOM',
      'ECU',
      'SLV',
      'GTM',
      'HND',
      'MEX',
      'NIC',
      'PAN',
      'PRY',
      'PER',
      'URY',
      'VEN',
      'HTI',
      'JAM',
      'TTO',
    ],
  },
  euro_area: {
    label: 'the euro area',
    re: /\beuro ?(area|zone)\b/i,
    members: [...EURO_AREA],
  },
  europe: {
    label: 'Europe',
    re: /\beurope(an)?\b|\bthe eu\b|\beu countries\b/i,
    members: [
      ...EURO_AREA,
      'CZE',
      'DNK',
      'HUN',
      'POL',
      'ROU',
      'SWE',
      'GBR',
      'NOR',
      'CHE',
      'ISL',
      'SRB',
      'ALB',
      'MKD',
      'MNE',
      'BIH',
      'MDA',
      'UKR',
      'TUR',
    ],
  },
  africa: {
    label: 'Africa',
    re: /\bafrica(n)?\b/i,
    members: [
      'DZA',
      'AGO',
      'BEN',
      'BWA',
      'BFA',
      'BDI',
      'CMR',
      'CPV',
      'CAF',
      'TCD',
      'COM',
      'COD',
      'COG',
      'CIV',
      'DJI',
      'EGY',
      'GNQ',
      'ERI',
      'SWZ',
      'ETH',
      'GAB',
      'GMB',
      'GHA',
      'GIN',
      'GNB',
      'KEN',
      'LSO',
      'LBR',
      'LBY',
      'MDG',
      'MWI',
      'MLI',
      'MRT',
      'MUS',
      'MAR',
      'MOZ',
      'NAM',
      'NER',
      'NGA',
      'RWA',
      'STP',
      'SEN',
      'SYC',
      'SLE',
      'SOM',
      'ZAF',
      'SSD',
      'SDN',
      'TZA',
      'TGO',
      'TUN',
      'UGA',
      'ZMB',
      'ZWE',
    ],
  },
  middle_east: {
    label: 'the Middle East',
    re: /\bmiddle east(ern)?\b|\bgulf states\b|\bgcc\b|\bmena\b/i,
    members: [
      'BHR',
      'IRN',
      'IRQ',
      'ISR',
      'JOR',
      'KWT',
      'LBN',
      'OMN',
      'QAT',
      'SAU',
      'SYR',
      'ARE',
      'YEM',
      'EGY',
      'TUR',
    ],
  },
  asia: {
    label: 'Asia',
    re: /\basia(n)?\b|\basia[- ]pacific\b/i,
    members: [
      'CHN',
      'JPN',
      'KOR',
      'IND',
      'IDN',
      'THA',
      'MYS',
      'PHL',
      'VNM',
      'SGP',
      'HKG',
      'TWN',
      'PAK',
      'BGD',
      'LKA',
      'KHM',
      'LAO',
      'MMR',
      'MNG',
      'NPL',
      'KAZ',
      'UZB',
    ],
  },
  g7: {
    label: 'the G7',
    re: /\bg-?7\b/i,
    members: ['USA', 'JPN', 'DEU', 'GBR', 'FRA', 'ITA', 'CAN'],
  },
  g20: {
    label: 'the G20',
    re: /\bg-?20\b/i,
    members: [
      'ARG',
      'AUS',
      'BRA',
      'CAN',
      'CHN',
      'FRA',
      'DEU',
      'IND',
      'IDN',
      'ITA',
      'JPN',
      'KOR',
      'MEX',
      'RUS',
      'SAU',
      'ZAF',
      'TUR',
      'GBR',
      'USA',
    ],
  },
};

/** The largest economies, used when a theme question names no country. */
export const MAJORS = ['USA', 'CHN', 'JPN', 'DEU', 'IND', 'GBR', 'FRA', 'BRA', 'ITA', 'CAN'];

/* ------------------------------------------------------------------ commodities */

/**
 * understand's commodity words -> Pink Sheet series names, and the production family for
 * energy commodities. Lithium and palladium have no Pink Sheet series; they map to nothing,
 * and the reader says so rather than reach for a neighbour.
 */
export const COMMODITY_PINK = {
  copper: { label: 'Copper', pink: ['Copper'] },
  oil: {
    label: 'Crude oil',
    pink: ['Crude oil, Brent', 'Crude oil, WTI', 'Crude oil, Dubai'],
    production: 'oil_production',
  },
  brent: { label: 'Brent crude', pink: ['Crude oil, Brent'], production: 'oil_production' },
  wti: { label: 'WTI crude', pink: ['Crude oil, WTI'], production: 'oil_production' },
  natgas: {
    label: 'Natural gas',
    pink: ['Natural gas, Europe', 'Natural gas, US', 'Liquefied natural gas, Japan'],
    production: 'gas_production',
  },
  gold: { label: 'Gold', pink: ['Gold'] },
  silver: { label: 'Silver', pink: ['Silver'] },
  platinum: { label: 'Platinum', pink: ['Platinum'] },
  palladium: { label: 'Palladium', pink: [] },
  lithium: { label: 'Lithium', pink: [] },
  aluminium: { label: 'Aluminium', pink: ['Aluminum'] },
  nickel: { label: 'Nickel', pink: ['Nickel'] },
  zinc: { label: 'Zinc', pink: ['Zinc'] },
  lead: { label: 'Lead', pink: ['Lead'] },
  tin: { label: 'Tin', pink: ['Tin'] },
  iron_ore: { label: 'Iron ore', pink: ['Iron ore, cfr spot'] },
  coal: { label: 'Coal', pink: ['Coal, Australian', 'Coal, South African **'] },
  wheat: { label: 'Wheat', pink: ['Wheat, US HRW', 'Wheat, US SRW'] },
  corn: { label: 'Maize (corn)', pink: ['Maize'] },
  soybeans: { label: 'Soybeans', pink: ['Soybeans', 'Soybean oil', 'Soybean meal'] },
  rice: { label: 'Rice', pink: ['Rice, Thai 5%', 'Rice, Viet Namese 5%'] },
  coffee: { label: 'Coffee', pink: ['Coffee, Arabica', 'Coffee, Robusta'] },
  cocoa: { label: 'Cocoa', pink: ['Cocoa'] },
  sugar: { label: 'Sugar', pink: ['Sugar, world', 'Sugar, US', 'Sugar, EU'] },
  cotton: { label: 'Cotton', pink: ['Cotton, A Index'] },
  palm_oil: { label: 'Palm oil', pink: ['Palm oil'] },
  rubber: { label: 'Rubber', pink: ['Rubber, TSR20 **', 'Rubber, RSS3'] },
  fertiliser: {
    label: 'Fertiliser',
    pink: ['Urea', 'DAP', 'Potassium chloride **', 'TSP', 'Phosphate rock'],
  },
};

/** Words in a question -> commodity id. Specific names before general ones. */
export const COMMODITY_WORDS = [
  ['brent', /\bbrent\b/i],
  ['wti', /\bwti\b|west texas/i],
  ['natgas', /\bnatural gas\b|\blng\b|\bgas prices?\b|\bhenry hub\b|\bttf\b/i],
  ['iron_ore', /\biron ore\b/i],
  ['palm_oil', /\bpalm oil\b/i],
  ['oil', /\bcrude\b|\boil prices?\b|\boil\b|\bpetroleum\b|\bbarrels?\b/i],
  ['copper', /\bcopper\b/i],
  ['gold', /\bgold\b/i],
  ['silver', /\bsilver\b/i],
  ['platinum', /\bplatinum\b/i],
  ['palladium', /\bpalladium\b/i],
  ['lithium', /\blithium\b/i],
  ['aluminium', /\balumini?um\b/i],
  ['nickel', /\bnickel\b/i],
  ['zinc', /\bzinc\b/i],
  ['coal', /\bcoal\b/i],
  ['wheat', /\bwheat\b/i],
  ['corn', /\bcorn\b|\bmaize\b/i],
  ['soybeans', /\bsoy(beans?)?\b/i],
  ['rice', /\brice\b/i],
  ['coffee', /\bcoffee\b/i],
  ['cocoa', /\bcocoa\b/i],
  ['sugar', /\bsugar\b/i],
  ['cotton', /\bcotton\b/i],
  ['rubber', /\brubber\b/i],
  ['fertiliser', /\bfertili[sz]ers?\b|\burea\b|\bpotash\b|\bphosphate\b/i],
];

/* ------------------------------------------------------------------ themes */

/** Question themes and the words that signal them. */
export const THEME_CUES = {
  inflation:
    /\binflation|\bcpi\b|\bhicp\b|consumer prices|cost of living|deflation|price pressures?/i,
  rates:
    /interest rates?|policy rate|central bank|rate (hike|cut|decision)s?|monetary policy|\bfed\b|federal reserve|\becb\b|bank of (japan|england|canada)|\bboj\b|\bboe\b|repo rate|\bselic\b|bank rate|tightening|easing/i,
  currency:
    /currenc|exchange rate|\bfx\b|\blira\b|\bpesos?\b|\brupees?\b|\byen\b|\beuro\b|\brubles?\b|\broubles?\b|\brand\b|\byuan\b|\brenminbi\b|\bnaira\b|\breal\b(?= (is|has|was|fell|rose|slid|weak|strong)\b)|\bwon\b(?= (is|has|was|fell|rose|weak|strong)\b)|\bshekels?\b|\bforints?\b|\bzloty\b|\bkoruna\b|\bhryvnia\b|\bcedis?\b|\brupiah\b|\bringgit\b|\bbaht\b|\bsterling\b|\bshillings?\b|\briyals?\b|\bfranc\b|devaluat|depreciat|appreciat|dollar strength|strong dollar|weak dollar/i,
  credit:
    /\bcredit\b|household debt|corporate debt|private debt|leverage|debt service|borrowing|mortgage debt|indebted/i,
  housing: /house prices?|housing|property (prices?|market)|real estate|home prices?|mortgage/i,
  financial_stability: /financial stability|banking (crisis|stress)|systemic|bubble/i,
  trade:
    /\btrade (balance|deficit|surplus|war|flows?)\b|\bexports?\b|\bimports?\b|\btariffs?\b|current account|balance of payments/i,
  external:
    /remittance|external debt|foreign debt|reserves|\bfdi\b|foreign (direct )?investment|capital (flows?|flight)|external (financing|funding|position|stress|vulnerabilit)|financing (stress|needs|gap)|(dollar|fx|foreign[- ]exchange) shortage|balance[- ]of[- ]payments (stress|crisis)/i,
  energy: /\benergy\b|power supply|electricity/i,
  oil: /\boil\b|\bcrude\b|petroleum|barrels?|\bopec\b|refiner|diesel|gasoline|petrol|jet fuel/i,
  gas: /natural gas|\blng\b|gas (supply|cut ?off|imports?|exports?|storage|pipeline|demand)|pipeline gas|\bgas\b/i,
  power: /electricity|power (generation|mix|sector)|coal power|renewables|solar|wind power/i,
  commodity: /commodit|metals?\b|raw materials/i,
  food: /\bfood\b|grains?\b|staple|wheat|maize|\bcorn\b|\brice\b|fertili[sz]er|famine|hunger/i,
  geopolitics:
    /geopolitic|blockade|invasion|invade|\bwar\b|tensions?|cut ?off|embargo|disruption|supply shock|military|annex/i,
  risk: /\brisk\b|uncertaint|instabilit|volatil/i,
  conflict: /conflict|violence|fatalit|fighting|insurgen|attacks?\b/i,
  governance: /governance|corruption|rule of law|political stability|institutions/i,
  labour: /unemploy|jobs?\b|labou?r market|employment|workers/i,
  growth:
    /\bgdp\b|growth|recession|economy|economic (activity|outlook|output)|industrial production|output/i,
};

/** Themes broad enough to appear in company questions ("Nvidia revenue growth"): on their
    own they need a country, region, commodity, ranking or economy wording to count. */
export const WEAK_THEMES = new Set([
  'growth',
  'risk',
  'trade',
  'labour',
  'energy',
  'commodity',
  'credit',
]);

/** For each theme, the families that answer it, in order. */
export const THEME_FAMILIES = {
  inflation: ['inflation_monthly', 'inflation_annual', 'policy_rate', 'fx_usd'],
  rates: ['policy_rate', 'inflation_monthly', 'inflation_annual', 'fx_usd'],
  currency: [
    'fx_usd',
    'policy_rate',
    'inflation_monthly',
    'credit_gap',
    'fx_effective',
    'fx_reserves',
    'current_account',
  ],
  credit: ['debt_service', 'credit_gap', 'house_prices', 'total_credit', 'policy_rate'],
  housing: ['house_prices', 'debt_service', 'credit_gap', 'total_credit', 'policy_rate'],
  financial_stability: ['credit_gap', 'debt_service', 'house_prices', 'total_credit'],
  trade: ['trade_goods', 'current_account', 'bop', 'fx_usd'],
  external: ['external_debt', 'remittances', 'fx_reserves', 'bop', 'current_account'],
  energy: ['oil_production', 'oil_demand', 'gas_demand', 'gas_imports', 'power_mix'],
  oil: ['oil_production', 'oil_demand', 'oil_stocks', 'refined_products'],
  gas: ['gas_imports', 'gas_demand', 'gas_production', 'gas_stocks'],
  power: ['power_mix'],
  commodity: ['commodity_price'],
  food: ['food_prices_local', 'inflation_monthly'],
  geopolitics: ['geopolitical_risk', 'uncertainty', 'conflict'],
  risk: ['geopolitical_risk', 'uncertainty', 'governance'],
  conflict: ['conflict', 'geopolitical_risk'],
  governance: ['governance'],
  labour: ['unemployment', 'employment_sector'],
  growth: ['gdp_growth', 'activity', 'unemployment', 'inflation_annual'],
};

/** A country question with no theme gets this headline set. */
export const DEFAULT_FAMILIES = [
  'gdp_growth',
  'inflation_monthly',
  'inflation_annual',
  'unemployment',
  'policy_rate',
  'gov_debt',
  'current_account',
  'fx_usd',
  'geopolitical_risk',
  'governance',
];

/* ------------------------------------------------------------------ families */

const pct = '%';
const imfWeo = (code) => (row) =>
  src(row) === 'imf' && keyPrefix(row) === 'IMF.WEO' && imfCode(row) === code;
const weoName = (row) => IMF_WEO[imfCode(row)]?.name || null;
const weoUnit = (row) => IMF_WEO[imfCode(row)]?.unit || null;
const bis = (flow) => (row) => src(row) === 'bis' && keyPrefix(row) === flow;
/* ECB daily reference-rate crosses, local currency per US dollar: ECB.EXRUSD:D.{CCY}. */
const ecbUsdCross = (row) =>
  src(row) === 'ecb' && keyPrefix(row) === 'ECB.EXRUSD' && /^D\.[A-Z]{3}$/.test(keyBody(row));
/* IMF IRFCL official reserve assets in US dollars: IMF.IRFCL:dataflow.{ISO3}.IRFCLDT1_IRFCL65_USD.{SECTOR}.M */
const IRFCL_RESERVES_RE = /(?:^|\.)IRFCLDT1_IRFCL65_USD\.([A-Z0-9_]+)\.M$/;
const imfReserves = (row) =>
  src(row) === 'imf' && keyPrefix(row) === 'IMF.IRFCL' && IRFCL_RESERVES_RE.test(keyBody(row));
const jodi = (dataset, product, flows, units) => (row) => {
  if (!String(row?.source || '').startsWith('jodi')) return false;
  if (keyPrefix(row) !== `JODI.${dataset}`) return false;
  const [, p, f, u] = parts(row);
  return p === product && flows.includes(f) && units.includes(u);
};
const jodiName = (row) => {
  const [, p, f] = parts(row);
  const product = JODI_PRODUCTS[p];
  const flow = (p === 'NATGAS' && JODI_GAS_FLOW_OVERRIDES[f]) || JODI_FLOWS[f];
  if (!product || !flow) return null;
  const s = `${product} ${flow}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const jodiUnit = (row) => JODI_UNITS[parts(row)[3]] || null;
const named = (row) => row?.series_name || null;
const wb = (code) => (row) => src(row) === 'worldbank-ext' && keyPrefix(row) === `WB.${code}`;

/**
 * Each family: { id, label, themes, scope, present, unit, priority, rankable, match(row),
 * name(row), unitOf?(row), authority?(row), presentOf?(row), max?, rank?, cues? }.
 *   present  'rate' (state the value), 'level' (value, change in %), 'yoy_from_index'
 *            (compute the change on a year earlier from an index).
 *   rank     { source, dataset?, filter?(row) }: the one source a cross-country ranking uses,
 *            so every country is measured the same way.
 *   authority  higher wins among current candidates (national over BIS/IMF).
 */
export const FAMILIES = [
  {
    id: 'gdp_growth',
    label: 'Real GDP growth',
    themes: ['macro', 'growth', 'country'],
    scope: 'country',
    present: 'rate',
    unit: pct,
    priority: 1,
    rankable: true,
    cues: /\bgdp\b|growth|growing|recession/i,
    match: (r) =>
      imfWeo('NGDP_RPCH')(r) ||
      (src(r) === 'eurostat' &&
        keyPrefix(r) === 'ESTAT.nama_10_gdp' &&
        /CLV_PCH_PRE\.B1GQ$/.test(keyBody(r))),
    name: (r) => (src(r) === 'imf' ? weoName(r) : 'Real GDP growth'),
    authority: (r) => (src(r) === 'eurostat' ? 2 : 1),
    rank: {
      like: 'IMF.WEO:dataflow.%.NGDP_RPCH.A',
      source: 'imf',
      filter: imfWeo('NGDP_RPCH'),
    },
  },
  {
    id: 'inflation_annual',
    label: 'Inflation (annual average)',
    themes: ['macro', 'inflation', 'country'],
    scope: 'country',
    present: 'rate',
    unit: pct,
    priority: 3,
    rankable: true,
    cues: /\binflation\b/i,
    match: imfWeo('PCPIPCH'),
    name: weoName,
    rank: {
      like: 'IMF.WEO:dataflow.%.PCPIPCH.A',
      source: 'imf',
      filter: imfWeo('PCPIPCH'),
    },
  },
  {
    id: 'unemployment',
    label: 'Unemployment rate',
    themes: ['macro', 'labour', 'country'],
    scope: 'country',
    present: 'rate',
    unit: pct,
    priority: 4,
    rankable: true,
    cues: /unemploy|jobless/i,
    match: (r) =>
      imfWeo('LUR')(r) ||
      (src(r) === 'ilostat' &&
        keyPrefix(r) === 'ILO.UNE_DEAP_SEX_AGE_RT_A' &&
        /\.AGE_YTHADULT_YGE15$/.test(keyBody(r))) ||
      (src(r) === 'eurostat' &&
        keyPrefix(r) === 'ESTAT.une_rt_m' &&
        /\.SA\.TOTAL\.T\.PC_ACT$/.test(keyBody(r))) ||
      (src(r) === 'ons' && r.series_key === 'ONS:MGSX') ||
      (src(r) === 'ibge' && r.series_key === 'SIDRA.6381.4099:BRA') ||
      (src(r) === 'ecb' && keyPrefix(r) === 'ECB.AME' && /\.ZUTN$/.test(keyBody(r))),
    name: (r) => {
      if (src(r) === 'imf') return weoName(r);
      if (src(r) === 'ilostat') return 'Unemployment rate (ages 15 and over)';
      if (src(r) === 'ecb') return 'Unemployment rate (AMECO)';
      return named(r) || 'Unemployment rate';
    },
    authority: (r) =>
      ({ ons: 3, ibge: 3, eurostat: 2.5, ilostat: 1.5, imf: 1, ecb: 1 })[src(r)] || 1,
    rank: {
      like: 'ILO.UNE_DEAP_SEX_AGE_RT_A:%.AGE_YTHADULT_YGE15',

      source: 'ilostat',
      filter: (r) =>
        keyPrefix(r) === 'ILO.UNE_DEAP_SEX_AGE_RT_A' && /\.AGE_YTHADULT_YGE15$/.test(keyBody(r)),
    },
  },
  {
    id: 'gov_debt',
    label: 'Government debt',
    themes: ['macro', 'fiscal', 'country'],
    scope: 'country',
    present: 'rate',
    unit: '% of GDP',
    priority: 6,
    rankable: true,
    cues: /government debt|public debt|sovereign debt|debt[- ]to[- ]gdp|national debt/i,
    match: (r) =>
      imfWeo('GGXWDG_NGDP')(r) ||
      (src(r) === 'eurostat' &&
        keyPrefix(r) === 'ESTAT.gov_10dd_edpt1' &&
        /\.GD\.S13\.PC_GDP$/.test(keyBody(r))),
    name: () => 'General government gross debt',
    authority: (r) => (src(r) === 'eurostat' ? 2 : 1),
    rank: {
      like: 'IMF.WEO:dataflow.%.GGXWDG_NGDP.A',
      source: 'imf',
      filter: imfWeo('GGXWDG_NGDP'),
    },
  },
  {
    id: 'gov_balance',
    label: 'Government budget balance',
    themes: ['macro', 'fiscal', 'country'],
    scope: 'country',
    present: 'rate',
    unit: '% of GDP',
    priority: 7,
    rankable: true,
    cues: /deficit|budget balance|fiscal balance|surplus/i,
    match: imfWeo('GGXCNL_NGDP'),
    name: weoName,
    rank: {
      like: 'IMF.WEO:dataflow.%.GGXCNL_NGDP.A',
      source: 'imf',
      filter: imfWeo('GGXCNL_NGDP'),
    },
  },
  {
    id: 'current_account',
    label: 'Current account balance',
    themes: ['macro', 'trade', 'external', 'country'],
    scope: 'country',
    present: 'rate',
    unit: '% of GDP',
    priority: 8,
    rankable: true,
    cues: /current account/i,
    match: imfWeo('BCA_NGDPD'),
    name: weoName,
    rank: {
      like: 'IMF.WEO:dataflow.%.BCA_NGDPD.A',
      source: 'imf',
      filter: imfWeo('BCA_NGDPD'),
    },
  },
  {
    id: 'inflation_monthly',
    label: 'Consumer price inflation (latest month)',
    themes: ['macro', 'inflation', 'food'],
    scope: 'country',
    present: 'rate',
    unit: pct,
    priority: 2,
    rankable: true,
    cues: /\binflation\b|\bcpi\b|consumer prices|hicp/i,
    match: (r) =>
      (src(r) === 'imf' && keyPrefix(r) === 'IMF.CPI' && /\.CPI\._T\.IX\.M$/.test(keyBody(r))) ||
      (src(r) === 'ecb' && keyPrefix(r) === 'ECB.ICP' && /\.N\.000000\.4\.ANR$/.test(keyBody(r))) ||
      (src(r) === 'eurostat' &&
        keyPrefix(r) === 'ESTAT.prc_hicp_manr' &&
        /\.CP00\.RCH_A$/.test(keyBody(r))) ||
      (src(r) === 'ons' && r.series_key === 'ONS:D7G7') ||
      (src(r) === 'ibge' && /^SIDRA\.1737\.(2265|63):BRA$/.test(r.series_key)) ||
      (src(r) === 'bcb' && r.series_key === 'SGS.433') ||
      (src(r) === 'bcra' && r.series_key === 'BCRA:28') ||
      (src(r) === 'arg-series' && r.series_key === 'ARGSERIES:148.3_INIVELNAL_DICI_M_26') ||
      (src(r) === 'singstat' && r.series_key === 'SINGSTAT.M213751:1') ||
      (src(r) === 'mospi' && /^MOSPI\.CPI\.inflation:/i.test(r.series_key)) ||
      (src(r) === 'cbrt' && r.series_key === 'EVDS:TP.TUKFIY2025.GENEL'),
    presentOf: (r) =>
      (src(r) === 'imf' && keyPrefix(r) === 'IMF.CPI') ||
      src(r) === 'arg-series' ||
      src(r) === 'singstat' ||
      src(r) === 'cbrt'
        ? 'yoy_from_index'
        : 'rate',
    name: (r) => {
      if (src(r) === 'imf') return 'Consumer prices, change on a year earlier';
      if (src(r) === 'ecb' || src(r) === 'eurostat') return 'HICP inflation, annual rate';
      if (src(r) === 'arg-series') return 'Consumer prices (INDEC), change on a year earlier';
      if (src(r) === 'singstat') return 'Consumer prices, change on a year earlier';
      if (src(r) === 'cbrt') return 'Consumer prices (TurkStat CPI), change on a year earlier';
      if (src(r) === 'mospi') return 'Consumer price inflation (MoSPI)';
      if (src(r) === 'ons') return 'CPI inflation, annual rate (ONS)';
      if (r.series_key === 'SIDRA.1737.2265:BRA') return 'IPCA inflation, 12-month change (IBGE)';
      if (r.series_key === 'SIDRA.1737.63:BRA') return 'IPCA inflation, monthly change (IBGE)';
      if (src(r) === 'bcb') return 'IPCA consumer prices, monthly change';
      if (src(r) === 'bcra') return 'Consumer price inflation, year on year (BCRA)';
      return named(r);
    },
    unitOf: (r) => (src(r) === 'bcb' || r.series_key === 'SIDRA.1737.63:BRA' ? '% m/m' : pct),
    /* Twelve-month rates first; month-on-month only when nothing else is current. */
    authority: (r) =>
      src(r) === 'bcb' || r.series_key === 'SIDRA.1737.63:BRA'
        ? 0.5
        : {
            ons: 3,
            ibge: 3,
            bcra: 3,
            cbrt: 3,
            singstat: 3,
            mospi: 3,
            'arg-series': 2.5,
            ecb: 2,
            eurostat: 2,
            imf: 1,
          }[src(r)] || 1,
    rank: {
      like: 'IMF.CPI:dataflow.%.CPI._T.IX.M',

      source: 'imf',
      filter: (r) => keyPrefix(r) === 'IMF.CPI' && /\.CPI\._T\.IX\.M$/.test(keyBody(r)),
    },
  },
  {
    id: 'policy_rate',
    label: 'Policy interest rate',
    themes: ['rates', 'currency', 'country'],
    scope: 'country',
    present: 'rate',
    unit: pct,
    priority: 2.5,
    rankable: true,
    cues: /policy rate|interest rates?|central bank|rate (hike|cut)|monetary policy|repo rate|bank rate|\bselic\b/i,
    match: (r) =>
      bis('WS_CBPOL')(r) ||
      (src(r) === 'boe' && r.series_key === 'BOE:IUDBEDR') ||
      (src(r) === 'sarb' && r.series_key === 'SARB:MMRD002A') ||
      (src(r) === 'bcb' && r.series_key === 'SGS.432') ||
      (src(r) === 'bcra' && r.series_key === 'BCRA:6') ||
      (src(r) === 'ecb' && /^ECB\.FM:B\.U2\.EUR\.4F\.KR\.(DFR|MRR_FR)\.LEV$/.test(r.series_key)),
    name: (r) => {
      if (src(r) === 'bis') return 'Central bank policy rate';
      if (src(r) === 'bcb') return 'Selic target rate';
      if (src(r) === 'boe') return 'Bank of England Bank Rate';
      if (src(r) === 'sarb') return 'SARB repo rate';
      if (src(r) === 'bcra') return 'BCRA monetary policy rate';
      /* ECB.FM rows are dated at each change, so the period is when the rate was set. */
      if (src(r) === 'ecb')
        return /DFR/.test(r.series_key)
          ? 'ECB deposit facility rate (level set at its latest change)'
          : 'ECB main refinancing rate (level set at its latest change)';
      return named(r);
    },
    unitOf: () => '% a year',
    /* National central bank first; the ECB deposit rate is the euro area's policy stance. */
    authority: (r) =>
      src(r) === 'ecb' ? (/DFR/.test(r.series_key) ? 3 : 2) : src(r) === 'bis' ? 1 : 3,
    /* Monthly only: the daily series (WS_CBPOL:D.*) states the same rate, so ranking both
       would list an economy twice. */
    rank: {
      like: 'WS_CBPOL:M.%',
      source: 'bis',
      filter: (r) => bis('WS_CBPOL')(r) && /^M\./.test(keyBody(r)),
    },
  },
  {
    id: 'fx_usd',
    label: 'Exchange rate against the US dollar',
    themes: ['currency'],
    scope: 'country',
    present: 'level',
    unit: null,
    priority: 5,
    rankable: false,
    cues: /exchange rate|currenc|against the dollar|\bfx\b/i,
    match: (r) =>
      (bis('WS_XRU')(r) && /\.A$/.test(keyBody(r)) && !/\.(USD|XDR)\.A$/.test(keyBody(r))) ||
      (src(r) === 'ecb' && r.series_key === 'ECB.EXR:M.USD.EUR.SP00.A') ||
      ecbUsdCross(r) ||
      (src(r) === 'cbrt' && r.series_key === 'EVDS:TP.DK.USD.A.YTL') ||
      (src(r) === 'bcb' && r.series_key === 'SGS.1') ||
      (src(r) === 'bcra' && r.series_key === 'BCRA:5') ||
      (src(r) === 'cbn' && r.series_key === 'CBN.FX:US_DOLLAR') ||
      (src(r) === 'sarb' && r.series_key === 'SARB:EXCX135D') ||
      (src(r) === 'boj' && r.series_key === 'BOJ.FM08:FXERD04') ||
      (src(r) === 'boe' && r.series_key === 'BOE:XUDLUSS'),
    name: (r) => {
      if (src(r) === 'bis') return `${parts(r)[2]} per US dollar (monthly average)`;
      if (ecbUsdCross(r)) return `${parts(r)[1]} per US dollar (ECB reference rate cross)`;
      if (src(r) === 'ecb') return 'US dollars per euro (ECB reference rate, monthly average)';
      if (src(r) === 'cbrt') return 'Turkish lira per US dollar (CBRT indicative buying rate)';
      if (src(r) === 'cbn') return 'Naira per US dollar (CBN central rate)';
      if (src(r) === 'boj') return 'Yen per US dollar (Tokyo, 17:00 JST)';
      if (src(r) === 'bcb') return 'Brazilian reais per US dollar (selling rate)';
      if (src(r) === 'bcra') return 'Argentine pesos per US dollar (wholesale rate)';
      if (src(r) === 'sarb') return 'Rand per US dollar';
      if (src(r) === 'boe') return 'US dollars per pound sterling (spot)';
      return named(r);
    },
    unitOf: (r) => {
      if (src(r) === 'bis') return `${parts(r)[2]} per USD`;
      if (ecbUsdCross(r)) return `${parts(r)[1]} per USD`;
      if (src(r) === 'ecb') return 'USD per EUR';
      if (src(r) === 'cbrt') return 'TRY per USD';
      if (src(r) === 'cbn') return 'NGN per USD';
      if (src(r) === 'boj') return 'JPY per USD';
      return r.unit || null;
    },
    /* National central banks first. The ECB daily cross ranks level with BIS's monthly
       average, so whichever is fresher wins (pickBest: lag, then the finer period); a stale
       daily cross never displaces a current monthly print. */
    authority: (r) => (src(r) === 'bis' || ecbUsdCross(r) ? 1 : 3),
  },
  {
    id: 'fx_effective',
    label: 'Effective exchange rate',
    themes: ['currency'],
    scope: 'country',
    present: 'level',
    unit: 'index',
    priority: 9,
    rankable: false,
    match: (r) => bis('WS_EER')(r) && /^M\.[RN]\.B\./.test(keyBody(r)),
    name: (r) =>
      parts(r)[1] === 'R'
        ? 'Real effective exchange rate (broad basket)'
        : 'Nominal effective exchange rate (broad basket)',
    unitOf: () => 'index',
    authority: (r) => (parts(r)[1] === 'R' ? 2 : 1),
  },
  {
    id: 'fx_reserves',
    label: 'International reserves',
    themes: ['currency', 'external'],
    scope: 'country',
    present: 'level',
    unit: 'USD millions',
    priority: 10,
    rankable: false,
    cues: /reserves/i,
    match: (r) =>
      (src(r) === 'bcb' && r.series_key === 'SGS.13621') ||
      (src(r) === 'bcra' && r.series_key === 'BCRA:1') ||
      (src(r) === 'cbrt' && r.series_key === 'EVDS:TP.AB.TOPLAM') ||
      imfReserves(r),
    name: (r) => {
      if (imfReserves(r)) return 'Official reserve assets (IMF reserves data template)';
      if (src(r) === 'cbrt') return 'CBRT gross official reserves (weekly)';
      return named(r) || 'International reserves';
    },
    /* BCB, BCRA and CBRT store USD millions; IMF IRFCL stores US dollars (units). */
    unitOf: (r) => (imfReserves(r) ? 'US$' : r.unit || 'USD millions'),
    /* National central banks (daily or weekly) first; IMF monthly where none is current. One
       IMF sector per economy: S1XS1311 (monetary authorities and central government), then
       S1X, then any other. */
    authority: (r) => {
      if (!imfReserves(r)) return 3;
      const sector = IRFCL_RESERVES_RE.exec(keyBody(r))[1];
      return sector === 'S1XS1311' ? 2 : sector === 'S1X' ? 1.9 : 1.5;
    },
  },
  {
    id: 'credit_gap',
    label: 'Credit-to-GDP gap',
    themes: ['credit', 'financial_stability', 'currency'],
    scope: 'country',
    present: 'rate',
    unit: 'percentage points',
    priority: 11,
    rankable: true,
    cues: /credit gap|credit[- ]to[- ]gdp|credit boom/i,
    match: (r) => bis('WS_CREDIT_GAP')(r) && /\.P\.A\.C$/.test(keyBody(r)),
    name: () => 'Credit-to-GDP gap, private non-financial sector (actual minus long-run trend)',
    unitOf: () => 'percentage points',
    rank: {
      like: 'WS_CREDIT_GAP:%.P.A.C',
      source: 'bis',
      filter: (r) => keyPrefix(r) === 'WS_CREDIT_GAP' && /\.P\.A\.C$/.test(keyBody(r)),
    },
  },
  {
    id: 'debt_service',
    label: 'Debt service ratio',
    themes: ['credit', 'housing', 'financial_stability'],
    scope: 'country',
    present: 'rate',
    unit: '% of income',
    priority: 12,
    rankable: true,
    max: 2,
    cues: /debt service|household debt|debt burden/i,
    match: (r) => bis('WS_DSR')(r) && /^Q\.[A-Z0-9]{2}\.[HNP]$/.test(keyBody(r)),
    name: (r) => `Debt service ratio, ${BIS_DSR_BORROWERS[parts(r)[2]]}`,
    unitOf: () => '% of income',
    authority: (r) => ({ H: 3, P: 2, N: 1 })[parts(r)[2]] || 0,
    rank: {
      like: 'WS_DSR:%.H',
      source: 'bis',
      filter: (r) => keyPrefix(r) === 'WS_DSR' && /\.H$/.test(keyBody(r)),
    },
  },
  {
    id: 'total_credit',
    label: 'Credit to the non-financial sector',
    themes: ['credit', 'housing', 'financial_stability'],
    scope: 'country',
    present: 'rate',
    unit: '% of GDP',
    priority: 13,
    rankable: true,
    max: 2,
    cues: /household debt|corporate debt|private debt|leverage/i,
    match: (r) => bis('WS_TC')(r) && /^Q\.[A-Z0-9]{2}\.[CGHNP]\.A\.M\.770\.A$/.test(keyBody(r)),
    name: (r) => `Credit to ${BIS_TC_BORROWERS[parts(r)[2]]}, all lenders`,
    unitOf: () => '% of GDP',
    authority: (r) => ({ H: 3, N: 2, P: 1.5, G: 1, C: 0.5 })[parts(r)[2]] || 0,
    rank: {
      like: 'WS_TC:%.H.A.M.770.A',
      source: 'bis',
      filter: (r) => keyPrefix(r) === 'WS_TC' && /\.H\.A\.M\.770\.A$/.test(keyBody(r)),
    },
  },
  {
    id: 'house_prices',
    label: 'Residential property prices',
    themes: ['housing', 'credit', 'financial_stability'],
    scope: 'country',
    present: 'rate',
    unit: '% change on a year earlier',
    priority: 14,
    rankable: true,
    cues: /house prices?|home prices?|property prices?|housing/i,
    match: (r) => bis('WS_SPP')(r) && /^Q\.[A-Z0-9]{2}\.[RN]\.771$/.test(keyBody(r)),
    name: (r) =>
      parts(r)[2] === 'R'
        ? 'Residential property prices, real (inflation-adjusted), change on a year earlier'
        : 'Residential property prices, nominal, change on a year earlier',
    unitOf: () => '%',
    authority: (r) => (parts(r)[2] === 'R' ? 2 : 1),
    rank: {
      like: 'WS_SPP:%.R.771',
      source: 'bis',
      filter: (r) => keyPrefix(r) === 'WS_SPP' && /\.R\.771$/.test(keyBody(r)),
    },
  },
  {
    id: 'trade_goods',
    label: 'Trade in goods',
    themes: ['trade'],
    scope: 'country',
    present: 'level',
    unit: 'US$',
    priority: 15,
    rankable: true,
    max: 2,
    cues: /\bexports?\b|\bimports?\b|\btrade (balance|deficit|surplus|in goods)\b/i,
    match: (r) =>
      src(r) === 'imf' &&
      keyPrefix(r) === 'IMF.IMTS' &&
      /\.(XG_FOB_USD|MG_CIF_USD)\.G001\.M$/.test(keyBody(r)),
    name: (r) => `${IMF_IMTS[imfCode(r)]}, month`,
    unitOf: () => 'US$',
    authority: (r) => (imfCode(r) === 'XG_FOB_USD' ? 2 : 1),
    rank: {
      like: 'IMF.IMTS:dataflow.%.XG_FOB_USD.G001.M',
      source: 'imf',
      filter: (r) => keyPrefix(r) === 'IMF.IMTS' && /\.XG_FOB_USD\.G001\.M$/.test(keyBody(r)),
    },
  },
  {
    id: 'bop',
    label: 'Balance of payments, financial account',
    themes: ['trade', 'external'],
    scope: 'country',
    present: 'level',
    unit: 'US$',
    priority: 16,
    rankable: false,
    max: 2,
    match: (r) =>
      src(r) === 'imf' &&
      keyPrefix(r) === 'IMF.BOP' &&
      /\.(A_NFA_T|L_NIL_T)\.(D_F|P_F|O_F)\.USD\.Q$/.test(keyBody(r)),
    name: (r) => {
      const [, , acct, fn] = parts(r);
      const a = IMF_BOP_ACCOUNT[acct];
      const f = IMF_BOP_FUNCTION[fn];
      if (!a || !f) return null;
      return `${f.charAt(0).toUpperCase() + f.slice(1)}, ${a} (quarter)`;
    },
    unitOf: () => 'US$',
    /* Direct investment liabilities (inflows) first, then assets (outflows). */
    authority: (r) =>
      ({ 'L_NIL_T.D_F': 3, 'A_NFA_T.D_F': 2.5, 'L_NIL_T.P_F': 2, 'A_NFA_T.P_F': 1.5 })[
        `${parts(r)[2]}.${parts(r)[3]}`
      ] || 1,
  },
  {
    id: 'oil_production',
    label: 'Crude oil production',
    themes: ['energy', 'oil'],
    scope: 'country',
    present: 'level',
    unit: 'thousand barrels per day',
    priority: 20,
    rankable: true,
    cues: /produc\w* (the )?most (crude|oil)|oil produc|crude produc|(crude|oil) output|barrels per day/i,
    match: (r) =>
      (src(r) === 'eia' && keyPrefix(r) === 'EIA.1.57.TBPD') ||
      jodi('oil_primary', 'CRUDEOIL', ['INDPROD'], ['KBD'])(r),
    name: (r) => (src(r) === 'eia' ? 'Crude oil production (EIA)' : jodiName(r)),
    unitOf: (r) => (src(r) === 'eia' ? 'thousand barrels per day' : jodiUnit(r)),
    authority: (r) => (src(r) === 'eia' ? 1 : 2),
    rank: {
      like: 'EIA.1.57.TBPD:%',
      source: 'eia',
      filter: (r) => keyPrefix(r) === 'EIA.1.57.TBPD',
    },
  },
  {
    id: 'oil_demand',
    label: 'Oil products demand',
    themes: ['energy', 'oil'],
    scope: 'country',
    present: 'level',
    unit: 'thousand barrels per day',
    priority: 21,
    rankable: true,
    cues: /oil (demand|consumption)|consum\w* (the )?most oil/i,
    match: jodi('oil_secondary', 'TOTPRODS', ['TOTDEMO'], ['KBD']),
    name: jodiName,
    unitOf: jodiUnit,
    rank: {
      like: 'JODI.oil_secondary:%.TOTPRODS.TOTDEMO.KBD',
      source: 'jodi-oil',
      filter: jodi('oil_secondary', 'TOTPRODS', ['TOTDEMO'], ['KBD']),
    },
  },
  {
    id: 'oil_stocks',
    label: 'Crude oil stocks',
    themes: ['energy', 'oil'],
    scope: 'country',
    present: 'level',
    unit: null,
    priority: 22,
    rankable: false,
    cues: /oil (stocks|inventor|storage)|crude (stocks|inventor)/i,
    match: jodi('oil_primary', 'CRUDEOIL', ['CLOSTLV'], ['KBBL', 'KTONS']),
    name: jodiName,
    unitOf: jodiUnit,
    authority: (r) => (parts(r)[3] === 'KBBL' ? 2 : 1),
  },
  {
    id: 'refined_products',
    label: 'Refinery output and fuel demand',
    themes: ['energy', 'oil'],
    scope: 'country',
    present: 'level',
    unit: 'thousand barrels per day',
    priority: 23,
    rankable: false,
    max: 2,
    cues: /refiner|diesel|gasoline|petrol|jet fuel/i,
    match: (r) =>
      jodi('oil_secondary', 'TOTPRODS', ['REFGROUT'], ['KBD'])(r) ||
      jodi('oil_secondary', 'GASDIES', ['TOTDEMO'], ['KBD'])(r),
    name: jodiName,
    unitOf: jodiUnit,
    authority: (r) => (parts(r)[2] === 'REFGROUT' ? 2 : 1),
  },
  {
    id: 'gas_production',
    label: 'Natural gas production',
    themes: ['energy', 'gas'],
    scope: 'country',
    present: 'level',
    unit: 'million cubic metres',
    priority: 24,
    rankable: true,
    cues: /gas produc|produc\w* (the )?most (natural )?gas/i,
    match: jodi('gas', 'NATGAS', ['INDPROD'], ['M3']),
    name: jodiName,
    unitOf: jodiUnit,
    rank: {
      like: 'JODI.gas:%.NATGAS.INDPROD.M3',
      source: 'jodi-gas',
      filter: jodi('gas', 'NATGAS', ['INDPROD'], ['M3']),
    },
  },
  {
    id: 'gas_demand',
    label: 'Natural gas demand',
    themes: ['energy', 'gas'],
    scope: 'country',
    present: 'level',
    unit: 'million cubic metres',
    priority: 25,
    rankable: true,
    cues: /gas (demand|consumption|deliveries)/i,
    match: jodi('gas', 'NATGAS', ['TOTDEMO'], ['M3']),
    name: jodiName,
    unitOf: jodiUnit,
    rank: {
      like: 'JODI.gas:%.NATGAS.TOTDEMO.M3',
      source: 'jodi-gas',
      filter: jodi('gas', 'NATGAS', ['TOTDEMO'], ['M3']),
    },
  },
  {
    id: 'gas_imports',
    label: 'Natural gas imports',
    themes: ['energy', 'gas'],
    scope: 'country',
    present: 'level',
    unit: 'million cubic metres',
    priority: 26,
    rankable: true,
    max: 3,
    cues: /gas imports?|import\w* (the )?most (natural )?gas|lng imports?|pipeline gas/i,
    match: jodi('gas', 'NATGAS', ['TOTIMPSB', 'IMPLNG', 'IMPPIP'], ['M3']),
    name: jodiName,
    unitOf: jodiUnit,
    authority: (r) => ({ TOTIMPSB: 3, IMPPIP: 2, IMPLNG: 1 })[parts(r)[2]] || 0,
    rank: {
      like: 'JODI.gas:%.NATGAS.TOTIMPSB.M3',
      source: 'jodi-gas',
      filter: jodi('gas', 'NATGAS', ['TOTIMPSB'], ['M3']),
    },
  },
  {
    id: 'gas_stocks',
    label: 'Natural gas stocks',
    themes: ['energy', 'gas'],
    scope: 'country',
    present: 'level',
    unit: 'million cubic metres',
    priority: 27,
    rankable: false,
    cues: /gas (stocks|storage|inventor)/i,
    match: jodi('gas', 'NATGAS', ['CLOSTLV'], ['M3']),
    name: jodiName,
    unitOf: jodiUnit,
  },
  {
    id: 'power_mix',
    label: 'Electricity generation mix',
    themes: ['energy', 'power'],
    scope: 'country',
    present: 'rate',
    unit: '% of generation',
    priority: 28,
    rankable: false,
    max: 4,
    match: (r) => {
      if (src(r) !== 'ember' || keyPrefix(r) !== 'EMBER') return false;
      const [, cat, , , unit] = parts(r);
      return /electricity generation/i.test(cat || '') && unit === '%';
    },
    name: (r) => {
      const variable = parts(r)[3];
      return variable ? `${variable} share of electricity generation` : null;
    },
    unitOf: () => '% of generation',
    authority: (r) => Number(r.value) || 0, // largest shares first
  },
  {
    id: 'commodity_price',
    label: 'Commodity price',
    themes: ['commodity', 'energy', 'food', 'metals', 'oil', 'gas'],
    scope: 'global',
    present: 'level',
    unit: null,
    priority: 30,
    rankable: false,
    match: (r) => src(r) === 'pinksheet' && keyPrefix(r) === 'PINK',
    name: pinkName,
    unitOf: pinkUnit,
  },
  {
    id: 'food_prices_local',
    label: 'Local food prices',
    themes: ['food', 'food_security'],
    scope: 'country',
    present: 'level',
    unit: null,
    priority: 31,
    rankable: false,
    max: 4,
    cues: /\bfood prices?\b|\bstaples?\b|\bmaize\b|\bwheat\b|\brice\b|\bsorghum\b|\bmillet\b|\bbeans\b/i,
    match: (r) =>
      (src(r) === 'fewsnet' && keyPrefix(r) === 'FEWS') ||
      (src(r) === 'faostat' && keyPrefix(r) === 'FAO.PP'),
    name: (r) =>
      src(r) === 'faostat'
        ? String(r.series_name || '').replace(/^Producer price:\s*/, 'Producer price, ') || null
        : named(r),
    unitOf: (r) => (src(r) === 'faostat' ? 'US$ per tonne' : r.unit || null),
    authority: (r) => (src(r) === 'fewsnet' ? 2 : 1),
  },
  {
    id: 'geopolitical_risk',
    label: 'Geopolitical risk',
    themes: ['geopolitics', 'risk'],
    scope: 'country',
    present: 'level',
    unit: 'index',
    priority: 17,
    rankable: true,
    cues: /geopolitic/i,
    match: (r) => src(r) === 'gpr' && /^GPR\.(GPR|GPRT|GPRA|GPRC)$/.test(keyPrefix(r)),
    name: (r) =>
      ({
        'GPR.GPR': 'Geopolitical risk index (world)',
        'GPR.GPRT': 'Geopolitical threats index (world)',
        'GPR.GPRA': 'Geopolitical acts index (world)',
        'GPR.GPRC': 'Country geopolitical risk index (share of newspaper articles)',
      })[keyPrefix(r)] || null,
    unitOf: (r) =>
      keyPrefix(r) === 'GPR.GPRC' ? 'share of articles, %' : 'index, 1985-2019 = 100',
    authority: (r) =>
      ({ 'GPR.GPR': 3, 'GPR.GPRT': 2, 'GPR.GPRA': 1, 'GPR.GPRC': 3 })[keyPrefix(r)] || 0,
    rank: {
      like: 'GPR.GPRC:%',
      source: 'gpr',
      filter: (r) => keyPrefix(r) === 'GPR.GPRC',
    },
  },
  {
    id: 'uncertainty',
    label: 'Uncertainty',
    themes: ['risk', 'geopolitics'],
    scope: 'country',
    present: 'level',
    unit: 'index',
    priority: 18,
    rankable: true,
    max: 2,
    cues: /uncertainty/i,
    match: (r) =>
      (src(r) === 'wui' && keyPrefix(r) === 'WUI.WUI') ||
      (src(r) === 'epu' && /^EPU\.(EPU|EPU_[A-Z_]+|GEPU_current|GEPU_ppp)$/.test(keyPrefix(r))),
    name: (r) => {
      if (src(r) === 'wui') return 'World Uncertainty Index';
      const p = keyPrefix(r);
      if (p === 'EPU.GEPU_current')
        return 'Global economic policy uncertainty (current-price GDP weights)';
      if (p === 'EPU.GEPU_ppp') return 'Global economic policy uncertainty (PPP GDP weights)';
      return named(r) || 'Economic policy uncertainty index';
    },
    unitOf: () => 'index',
    authority: (r) => (src(r) === 'wui' ? 2 : keyPrefix(r) === 'EPU.EPU' ? 1.5 : 1),
    rank: {
      like: 'WUI.WUI:%',
      source: 'wui',
      filter: (r) => keyPrefix(r) === 'WUI.WUI',
    },
  },
  {
    id: 'conflict',
    label: 'Organised violence',
    themes: ['conflict', 'geopolitics'],
    scope: 'country',
    present: 'level',
    unit: 'deaths',
    priority: 19,
    rankable: true,
    max: 2,
    cues: /conflict|violence|fatalit|deaths/i,
    match: (r) => src(r) === 'ucdp' && /^UCDP\.(deaths|events)\.all$/.test(keyPrefix(r)),
    name: (r) =>
      keyPrefix(r) === 'UCDP.deaths.all'
        ? 'Deaths in organised violence (month, UCDP)'
        : 'Events of organised violence (month, UCDP)',
    unitOf: (r) => (keyPrefix(r) === 'UCDP.deaths.all' ? 'deaths' : 'events'),
    authority: (r) => (keyPrefix(r) === 'UCDP.deaths.all' ? 2 : 1),
    rank: {
      like: 'UCDP.deaths.all:%',
      source: 'ucdp',
      filter: (r) => keyPrefix(r) === 'UCDP.deaths.all',
    },
  },
  {
    id: 'news_tone',
    label: 'News coverage',
    themes: ['risk', 'news'],
    scope: 'country',
    present: 'level',
    unit: null,
    priority: 29,
    rankable: false,
    match: (r) => src(r) === 'gdelt' && /^GDELT\.timeline(tone|vol)$/.test(keyPrefix(r)),
    name: (r) =>
      keyPrefix(r) === 'GDELT.timelinetone'
        ? 'News coverage tone (GDELT average tone)'
        : 'Share of global news coverage (GDELT)',
    unitOf: (r) =>
      keyPrefix(r) === 'GDELT.timelinetone' ? 'average tone' : '% of global coverage',
    authority: (r) => (keyPrefix(r) === 'GDELT.timelinetone' ? 2 : 1),
  },
  {
    id: 'governance',
    label: 'Governance (Worldwide Governance Indicators)',
    themes: ['governance', 'risk'],
    scope: 'country',
    present: 'rate',
    unit: 'score, -2.5 to 2.5',
    priority: 19.5,
    rankable: true,
    max: 2,
    cues: /governance|corruption|rule of law|political stability/i,
    match: (r) =>
      src(r) === 'worldbank-ext' && /^WB\.GOV_WGI_(VA|PV|GE|RQ|RL|CC)\.EST$/.test(keyPrefix(r)),
    name: (r) => (named(r) ? `${named(r)} (WGI estimate)` : null),
    unitOf: () => 'score, -2.5 to 2.5',
    authority: (r) =>
      ({ 'WB.GOV_WGI_PV.EST': 3, 'WB.GOV_WGI_RL.EST': 2.5, 'WB.GOV_WGI_CC.EST': 2 })[
        keyPrefix(r)
      ] || 1,
    rank: {
      like: 'WB.GOV_WGI_PV.EST:%',
      source: 'worldbank-ext',
      filter: wb('GOV_WGI_PV.EST'),
    },
  },
  {
    id: 'remittances',
    label: 'Remittances',
    themes: ['external'],
    scope: 'country',
    present: 'rate',
    unit: '% of GDP',
    priority: 32,
    rankable: true,
    cues: /remittance/i,
    match: (r) =>
      wb('BX.TRF.PWKR.DT.GD.ZS')(r) || wb('BX.TRF.PWKR.CD.DT')(r) || wb('BM.TRF.PWKR.CD.DT')(r),
    name: named,
    unitOf: (r) => r.unit || null,
    presentOf: (r) => (wb('BX.TRF.PWKR.DT.GD.ZS')(r) ? 'rate' : 'level'),
    authority: (r) => (wb('BX.TRF.PWKR.DT.GD.ZS')(r) ? 3 : wb('BX.TRF.PWKR.CD.DT')(r) ? 2 : 1),
    rank: {
      like: 'WB.BX.TRF.PWKR.DT.GD.ZS:%',
      source: 'worldbank-ext',
      filter: wb('BX.TRF.PWKR.DT.GD.ZS'),
    },
  },
  {
    id: 'external_debt',
    label: 'External debt',
    themes: ['external'],
    scope: 'country',
    present: 'rate',
    unit: '% of GNI',
    priority: 33,
    rankable: true,
    max: 2,
    cues: /external debt|foreign debt|debt service/i,
    match: (r) =>
      wb('DT.DOD.DECT.GN.ZS')(r) ||
      wb('DT.TDS.DECT.EX.ZS')(r) ||
      wb('DT.DOD.DECT.CD')(r) ||
      wb('DT.DOD.DSTC.ZS')(r),
    name: named,
    unitOf: (r) => r.unit || null,
    presentOf: (r) => (wb('DT.DOD.DECT.CD')(r) ? 'level' : 'rate'),
    authority: (r) =>
      ({
        'WB.DT.DOD.DECT.GN.ZS': 3,
        'WB.DT.TDS.DECT.EX.ZS': 2,
        'WB.DT.DOD.DSTC.ZS': 1.5,
        'WB.DT.DOD.DECT.CD': 1,
      })[keyPrefix(r)] || 0,
    rank: {
      like: 'WB.DT.DOD.DECT.GN.ZS:%',
      source: 'worldbank-ext',
      filter: wb('DT.DOD.DECT.GN.ZS'),
    },
  },
  {
    id: 'employment_sector',
    label: 'Employment by sector',
    themes: ['labour'],
    scope: 'country',
    present: 'level',
    unit: 'thousands',
    priority: 34,
    rankable: false,
    max: 3,
    match: (r) => src(r) === 'ilostat' && keyPrefix(r) === 'ILO.EMP_TEMP_SEX_ECO_NB_A',
    name: (r) => {
      const sector = ILO_SECTORS[parts(r)[1]];
      return sector && sector !== 'all sectors' ? `Employment in ${sector}` : null;
    },
    unitOf: () => 'thousand people',
    authority: (r) =>
      ({ ECO_SECTOR_SER: 3, ECO_SECTOR_IND: 2, ECO_SECTOR_AGR: 1 })[parts(r)[1]] || 0,
  },
  {
    id: 'activity',
    label: 'Economic activity',
    themes: ['growth'],
    scope: 'country',
    present: 'level',
    unit: null,
    priority: 3.5,
    rankable: false,
    cues: /economic activity|industrial production|industrial output/i,
    match: (r) =>
      (src(r) === 'bcb' && r.series_key === 'SGS.24363') ||
      (src(r) === 'eurostat' && keyPrefix(r) === 'ESTAT.sts_inpr_m') ||
      (src(r) === 'arg-series' && r.series_key === 'ARGSERIES:143.3_NO_PR_2004_A_21') ||
      (src(r) === 'ons' && (r.series_key === 'ONS:IHYQ' || r.series_key === 'ONS:ABMI')),
    presentOf: (r) =>
      r.series_key === 'ONS:IHYQ'
        ? 'rate'
        : r.series_key === 'ONS:ABMI'
          ? 'level'
          : 'yoy_from_index',
    name: (r) => {
      if (src(r) === 'eurostat') return 'Industrial production, change on a year earlier';
      if (src(r) === 'bcb') return 'IBC-Br economic activity index, change on a year earlier';
      if (src(r) === 'arg-series')
        return 'EMAE economic activity (INDEC), change on a year earlier';
      return named(r);
    },
    unitOf: (r) => (r.series_key === 'ONS:ABMI' ? 'GBP millions' : pct),
    authority: (r) => (r.series_key === 'ONS:IHYQ' ? 3 : 2),
  },
];

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

/**
 * Prefixes held in macro_series_values that no family surfaces, each with a reason. The
 * coverage test fails on any prefix that is in neither (scripts/fixtures/macro-prefixes.json).
 */
export const NOT_SURFACED = {
  'insee|INSEE':
    'One placeholder series id with no name ("replace with a named series"); nothing to state.',
  'bcb|SGS.11':
    'Effective overnight Selic in % per day. The policy rate is SGS 432 (Selic target, % a year); SGS 11 is never presented as it.',
  'bcb|SGS.10813':
    'USD/BRL buying rate; the selling rate (SGS 1) is the one stated, so the pair is not shown twice.',
};

/**
 * Prefixes a family surfaces only in part. Each names the family, an example key it states
 * (the coverage test checks the family matches it) and what is left out, so a sample of the
 * prefix that misses the stated keys still counts as covered, on purpose.
 */
export const PARTLY_SURFACED = {
  'ecb|ECB.EXR': {
    family: 'fx_usd',
    example: 'ECB.EXR:M.USD.EUR.SP00.A',
    note: 'Only EUR/USD; the other euro reference rates repeat what BIS WS_XRU states against the dollar.',
  },
  'jodi-oil|JODI.oil_primary': {
    family: 'oil_production',
    example: 'JODI.oil_primary:SA.CRUDEOIL.INDPROD.KBD',
    note: 'Crude production (kb/d) and crude closing stocks; transfers, stock changes, statistical differences and ton duplicates are bookkeeping lines.',
  },
  'jodi-oil|JODI.oil_secondary': {
    family: 'oil_demand',
    example: 'JODI.oil_secondary:DE.TOTPRODS.TOTDEMO.KBD',
    note: 'Total products demand, refinery output and diesel demand (kb/d); per-product trade and balancing lines are not stated.',
  },
  'jodi-gas|JODI.gas': {
    family: 'gas_imports',
    example: 'JODI.gas:DE.NATGAS.TOTIMPSB.M3',
    note: 'Production, deliveries, imports (total, LNG, pipeline) and stocks in million m3; terajoule and LNG-ton duplicates and balancing lines are not stated.',
  },
  'ilostat|ILO.EMP_TEMP_SEX_ECO_NB_A': {
    family: 'employment_sector',
    example: 'ILO.EMP_TEMP_SEX_ECO_NB_A:KEN.ECO_SECTOR_AGR',
    note: 'Broad sectors only (agriculture, industry, services); the ISIC and aggregate detail is not named, so it is never shown.',
  },
  'singstat|SINGSTAT.M213751': {
    family: 'inflation_monthly',
    example: 'SINGSTAT.M213751:1',
    note: 'All-items CPI only; the 21 sub-indices are not stated.',
  },
  'cbn|CBN.FX': {
    family: 'fx_usd',
    example: 'CBN.FX:US_DOLLAR',
    note: 'Naira per US dollar only; other CBN central rates are not stated.',
  },
  'cbrt|EVDS': {
    family: 'fx_usd',
    example: 'EVDS:TP.DK.USD.A.YTL',
    note: 'USD/TRY, weekly gross reserves and the CPI index are stated; the one-week lending quotation (TP.PY.P02.1H) is held but not stated until it is confirmed to equal the policy rate (BIS WS_CBPOL:D.TR states it daily).',
  },
};

/* ------------------------------------------------------------------ matching */

/** The family a row belongs to, or null. First match wins (families do not overlap). */
export function familyOf(row) {
  for (const f of FAMILIES) {
    try {
      if (f.match(row)) return f;
    } catch {
      /* a malformed key never matches */
    }
  }
  return null;
}

/** The ISO3 a row is about: its column, else what the key says (AMECO rows before the fix). */
export function rowIso3(row) {
  if (row?.country_iso3) return row.country_iso3;
  if (row?.source === 'ecb' && keyPrefix(row) === 'ECB.AME') {
    const code = parts(row)[1];
    if (/^[A-Z]{3}$/.test(code || '')) return code === 'ROM' ? 'ROU' : toIso3(code);
  }
  return null;
}

/* ------------------------------------------------------------------ periods */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-09' -> 'Sep 2026'; '2026-Q2' -> 'Q2 2026'; '2026-11-03' -> '3 Nov 2026'. */
export function periodLabel(p) {
  const s = String(p || '');
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)))
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  if ((m = /^(\d{4})-Q([1-4])$/.exec(s))) return `Q${m[2]} ${m[1]}`;
  return s;
}

/** End of the period as a Date (for recency comparisons). */
export function periodEnd(p) {
  const s = String(p || '');
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return new Date(Date.UTC(+m[1], +m[2], 0));
  if ((m = /^(\d{4})-Q([1-4])$/.exec(s))) return new Date(Date.UTC(+m[1], +m[2] * 3, 0));
  if ((m = /^(\d{4})$/.exec(s))) return new Date(Date.UTC(+m[1], 11, 31));
  return null;
}

/** Months between two periods' ends (b minus a), or null. */
export function monthsBetween(a, b) {
  const da = periodEnd(a);
  const db = periodEnd(b);
  if (!da || !db) return null;
  return (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
}

/* ------------------------------------------------------------------ projections */

/** IMF WEO and AMECO publish the current year and beyond as forecasts. */
export function isProjection(row, now = new Date()) {
  const y = yearOf(row?.period);
  if (!y || !/^\d{4}$/.test(String(row?.period))) return false;
  const forecaster =
    (row?.source === 'imf' && keyPrefix(row) === 'IMF.WEO') ||
    (row?.source === 'ecb' && keyPrefix(row) === 'ECB.AME');
  return forecaster && y >= now.getUTCFullYear();
}

/* ------------------------------------------------------------------ numbers */

/** A number as Sonar writes it (the same string goes into the evidence and the answer). */
export function fmtNum(v, { money = false } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (money && a >= 1e12) return `${sign}${(a / 1e12).toFixed(2)} trillion`;
  if (money && a >= 1e9) return `${sign}${(a / 1e9).toFixed(1)} billion`;
  if (money && a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)} million`;
  if (a >= 1000) return `${sign}${Math.round(a).toLocaleString('en-US')}`;
  if (a >= 100) return `${sign}${a.toFixed(1)}`;
  if (a >= 10) return `${sign}${a.toFixed(1)}`;
  return `${sign}${a.toFixed(2)}`;
}

/** Year-on-year change from an index, in %, or null. */
export function yoyFromIndex(value, yearAgo) {
  const v = Number(value);
  const p = Number(yearAgo);
  if (!Number.isFinite(v) || !Number.isFinite(p) || p === 0) return null;
  return (v / p - 1) * 100;
}

/* ------------------------------------------------------------------ presentation */

const isRateUnit = (u) => /%|percent|percentage points|score/i.test(String(u || ''));

/**
 * One latest row -> its statement: { value, unit, period, name, change, changeText,
 * projection } or null when the row cannot be stated (no name, or an index without its
 * year-ago value). Pure.
 */
export function presentRow(row, family = familyOf(row), { now = new Date() } = {}) {
  if (!row || !family) return null;
  const name = family.name(row);
  if (!name) return null;
  const mode = family.presentOf ? family.presentOf(row) : family.present;
  const unit = (family.unitOf ? family.unitOf(row) : null) || row.unit || family.unit || null;

  let observed = row;
  let projection = null;
  if (isProjection(row, now)) {
    /* The latest year is a forecast: the observed value is the year before. */
    projection = { period: row.period, value: Number(row.value) };
    if (row.year_ago_value == null || !row.year_ago_period) return null;
    observed = {
      ...row,
      period: row.year_ago_period,
      value: row.year_ago_value,
      year_ago_period: null,
      year_ago_value: null,
    };
  }

  let value = Number(observed.value);
  let change = null;
  let changeKind = null;
  let changeText = null;
  let statedUnit = unit;
  if (mode === 'yoy_from_index') {
    value = yoyFromIndex(observed.value, observed.year_ago_value);
    if (value == null) return null;
    statedUnit = '% on a year earlier';
  } else if (observed.year_ago_value != null && observed.year_ago_period) {
    const prev = Number(observed.year_ago_value);
    if (Number.isFinite(prev)) {
      if (mode === 'rate' || isRateUnit(unit)) {
        change = value - prev;
        changeKind = 'pp';
        changeText = `${change >= 0 ? 'up' : 'down'} ${fmtNum(Math.abs(change))} percentage points from ${fmtNum(prev)} in ${periodLabel(observed.year_ago_period)}`;
      } else if (prev !== 0) {
        change = (value / prev - 1) * 100;
        changeKind = 'pct';
        changeText = `${change >= 0 ? 'up' : 'down'} ${fmtNum(Math.abs(change))}% from ${fmtNum(prev, { money: /US\$|USD/.test(unit || '') })} in ${periodLabel(observed.year_ago_period)}`;
      }
    }
  }
  if (!Number.isFinite(value)) return null;
  return {
    name,
    value,
    unit: statedUnit,
    period: observed.period,
    change,
    changeKind,
    changeText,
    projection,
    mode,
    money: /US\$|USD/.test(statedUnit || '') && !/ per /.test(statedUnit || ''),
  };
}

/* How finely a period is dated: a day beats a month beats a quarter beats a year. */
const periodPrecision = (p) => {
  const s = String(p || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 3;
  if (/^\d{4}-\d{2}$/.test(s)) return 2;
  if (/^\d{4}-Q[1-4]$/.test(s)) return 1;
  return 0;
};

/**
 * Pick the best rows of one family for one country (or scope): the most authoritative among
 * those current (within `freshMonths` of the freshest candidate), then the most recent (by
 * month, then the finer-dated period: a daily print in the same month as a monthly average
 * wins). Returns up to family.max rows (default 1), distinct series. Pure.
 */
export function pickBest(rows, family, { freshMonths = 6, max = family.max || 1, now } = {}) {
  const cands = (rows || [])
    .filter((r) => r && r.value != null && family.match(r))
    .map((r) => ({ r, s: presentRow(r, family, { now }) }))
    .filter((x) => x.s);
  if (!cands.length) return [];
  const freshest = cands.reduce(
    (best, x) => (!best || String(x.s.period) > String(best) ? x.s.period : best),
    null,
  );
  const scored = cands.map((x) => {
    const lag = monthsBetween(x.s.period, freshest) ?? 99;
    const current = lag <= freshMonths;
    const auth = family.authority ? family.authority(x.r) : 1;
    return { ...x, current, auth, lag, prec: periodPrecision(x.s.period) };
  });
  scored.sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      b.auth - a.auth ||
      a.lag - b.lag ||
      b.prec - a.prec ||
      String(a.r.series_key).localeCompare(String(b.r.series_key)),
  );
  const out = [];
  const seenNames = new Set();
  for (const x of scored) {
    if (out.length >= max) break;
    if (seenNames.has(x.s.name)) continue; // one statement per measure
    seenNames.add(x.s.name);
    out.push(x);
  }
  return out;
}

/** "Turkey" for TUR; "the euro area" for euro-area rows; "the world" for global ones. */
export function placeLabel(row, iso3) {
  if (isEuroAreaRow(row)) return 'the euro area';
  const c = iso3 || rowIso3(row);
  if (c) return iso3Name(c) || c;
  return 'the world';
}

/**
 * The evidence text for a statement: numbers and periods in words, the source named.
 * Every number the answer may use is in this text (the grounding guard checks it).
 */
export function statementText(s, { place, attribution }) {
  const val = fmtNum(s.value, { money: s.money });
  const unit = s.unit ? (s.unit.startsWith('%') ? s.unit : ` ${s.unit}`) : '';
  const head = `${place ? `${place}: ` : ''}${s.name}, ${periodLabel(s.period)}: ${val}${unit}`;
  const change = s.changeText ? `, ${s.changeText}` : '';
  const proj = s.projection
    ? ` IMF/AMECO projection for ${s.projection.period}: ${fmtNum(s.projection.value)} (a projection, not an outcome).`
    : '';
  return `${head}${change}.${proj} Source: ${attribution}.`;
}

/** Dataset page a series links to. */
export function datasetHref(row, iso3) {
  const fam = familyOf(row);
  if (fam && ['geopolitical_risk', 'uncertainty', 'conflict', 'news_tone'].includes(fam.id))
    return `/datasets/geopolitical-risk${iso3 ? `?country=${iso3}` : ''}`;
  return `/datasets/world-bank${iso3 ? `?country=${iso3}` : ''}`;
}

/**
 * A latest row -> an evidence item { title, text, date, citation, meta }, or null.
 * `attributionOf(source)` returns the adapter's attribution verbatim.
 */
export function rowToItem(
  row,
  { family = familyOf(row), iso3 = null, attributionOf, now, scope } = {},
) {
  const s = presentRow(row, family, { now });
  if (!s) return null;
  const where = iso3 ? rowIso3(row) || iso3 : rowIso3(row);
  /* World series name themselves ("Geopolitical risk index (world)", "Copper"). */
  const place = where || isEuroAreaRow(row) ? placeLabel(row, where) : null;
  const attribution = (attributionOf && attributionOf(row.source)) || row.source;
  const val = fmtNum(s.value, { money: s.money });
  const unitShort = s.unit ? (s.unit.startsWith('%') ? s.unit : ` ${s.unit}`) : '';
  return {
    title: `${place ? `${place}: ` : ''}${s.name} ${val}${unitShort} (${periodLabel(s.period)})`,
    text: statementText(s, { place, attribution }),
    date: String(s.period),
    citation: { label: attribution, href: datasetHref(row, where) },
    meta: {
      family: family.id,
      name: s.name,
      place,
      attribution,
      mode: s.mode,
      source: row.source,
      series_key: row.series_key,
      iso3: where || null,
      scope: scope || (isEuroAreaRow(row) ? 'euro_area' : where ? 'country' : 'global'),
      period: s.period,
      value: s.value,
      unit: s.unit,
      change: s.change,
      changeKind: s.changeKind,
      yearAgoPeriod: row.year_ago_period || null,
      ...(s.projection ? { projection: s.projection } : {}),
    },
  };
}

/* ------------------------------------------------------------------ FEWS NET aggregation */

/** FEWS key FEWS:{ISO2}.{market}.{product}.{unit}.{currency}.{priceType}[.suffix]. */
function fewsParts(row) {
  const b = keyBody(row);
  const segs = b.split('.');
  if (segs.length < 6) return null;
  return {
    market: segs[1],
    product: segs[2],
    unit: segs[3],
    currency: segs[4],
    priceType: segs[5],
  };
}

const median = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/**
 * A country's FEWS NET markets -> one row per product: the median latest price across the
 * markets reporting in the product's latest month, and the median of the same markets' prices
 * a year earlier. Retail prices only (wholesale and wages are other measures). Pure.
 */
export function aggregateFews(rows) {
  const groups = new Map();
  for (const r of rows || []) {
    if (r.source !== 'fewsnet' || r.value == null) continue;
    const p = fewsParts(r);
    if (!p || p.priceType !== 'Retail') continue;
    const k = `${p.product}|${p.unit}|${p.currency}`;
    if (!groups.has(k)) groups.set(k, { ...p, rows: [] });
    groups.get(k).rows.push(r);
  }
  const out = [];
  for (const g of groups.values()) {
    const latest = g.rows.reduce((m, r) => (String(r.period) > m ? String(r.period) : m), '');
    const cur = g.rows.filter((r) => String(r.period) === latest);
    const withPrev = cur.filter((r) => r.year_ago_value != null);
    const value = median(cur.map((r) => Number(r.value)));
    if (value == null) continue;
    const prev =
      withPrev.length >= Math.max(1, Math.ceil(cur.length / 2))
        ? median(withPrev.map((r) => Number(r.year_ago_value)))
        : null;
    out.push({
      source: 'fewsnet',
      series_key: `FEWS:${g.product}|${g.unit}|${g.currency}`,
      country_iso3: cur[0].country_iso3,
      period: latest,
      value,
      year_ago_period:
        prev != null ? cur.find((r) => r.year_ago_period)?.year_ago_period || null : null,
      year_ago_value: prev,
      series_name: `${g.product}, median retail price across ${cur.length} market${cur.length === 1 ? '' : 's'}`,
      unit: `${g.currency} per ${String(g.unit).replace(/_/g, ' ')}`,
      markets: cur.length,
    });
  }
  return out.sort((a, b) => b.markets - a.markets);
}

/* ------------------------------------------------------------------ key indicators table */

/** Short publisher names for tables (the citation keeps the full attribution). */
export const SOURCE_SHORT = {
  imf: 'IMF',
  'worldbank-ext': 'World Bank',
  bis: 'BIS',
  ecb: 'ECB',
  eurostat: 'Eurostat',
  ons: 'ONS',
  boe: 'Bank of England',
  insee: 'INSEE',
  istat: 'Istat',
  sarb: 'SARB',
  bcb: 'Banco Central do Brasil',
  ibge: 'IBGE',
  bcra: 'BCRA',
  'arg-series': 'INDEC',
  bcrp: 'BCRP',
  boj: 'Bank of Japan',
  cbn: 'Central Bank of Nigeria',
  singstat: 'SingStat',
  mospi: 'MoSPI',
  ilostat: 'ILO',
  gpr: 'Caldara-Iacoviello GPR',
  epu: 'Economic Policy Uncertainty',
  wui: 'World Uncertainty Index',
  ucdp: 'UCDP',
  gdelt: 'GDELT',
  eia: 'EIA',
  ember: 'Ember',
  'jodi-oil': 'JODI',
  'jodi-gas': 'JODI',
  pinksheet: 'World Bank Pink Sheet',
  fewsnet: 'FEWS NET',
  faostat: 'FAOSTAT',
  cepal: 'CEPALSTAT',
  afdb: 'AfDB',
  cbrt: 'CBRT',
};

/**
 * Evidence items -> rows for the country layout's Key indicators table: label, latest value,
 * period, change on a year earlier and source. Pure; the UI renders them as given.
 */
export function keyIndicatorRows(items, max = 8) {
  return (items || [])
    .filter((it) => it?.meta?.family && it.meta.value != null)
    .slice(0, max)
    .map((it) => {
      const m = it.meta;
      const fam = FAMILY_BY_ID[m.family];
      const unit = m.unit || '';
      const money = /US\$|USD/.test(unit) && !/ per /.test(unit);
      const value = `${fmtNum(m.value, { money })}${unit ? (unit.startsWith('%') ? unit : ` ${unit}`) : ''}`;
      let change = null;
      if (m.change != null && Number.isFinite(m.change)) {
        const sign = m.change > 0 ? '+' : m.change < 0 ? '-' : '';
        change =
          m.changeKind === 'pp'
            ? `${sign}${fmtNum(Math.abs(m.change))} pp`
            : `${sign}${fmtNum(Math.abs(m.change))}%`;
      }
      const label = `${fam?.label || it.title}${m.scope === 'euro_area' ? ' (euro area)' : ''}`;
      return {
        id: `${m.source}:${m.series_key}`,
        label,
        name: it.title,
        value,
        period: periodLabel(m.period),
        change,
        source: SOURCE_SHORT[m.source] || m.source,
        attribution: it.citation?.label || m.source,
        href: it.citation?.href || null,
        scope: m.scope,
        projection: m.projection
          ? `${fmtNum(m.projection.value)} projected for ${m.projection.period}`
          : null,
      };
    });
}
