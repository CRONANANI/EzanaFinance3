/**
 * Ezana API catalog: eyes dimension. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape.
 *
 *   PARAMS  query params this dimension adds (names must be new)
 *   ROUTES  { groupKey: [route, ...] } appended to an existing group
 *   GROUPS  new groups, each with dimension: 'eyes'
 *
 * Eyes Above data is open data, not disclosure-based: nothing here is
 * delayed. Patents, night lights and chokepoint transits answer an empty
 * list with meta.coverage until their ingest lands; they never invent a row.
 */

/** Every series the Eyes Above ingest writes (FRED ids, plus the NY Fed GSCPI). */
export const EYES_SERIES = {
  cre: [
    'BOGZ1FL075035503Q',
    'COMREPUSQ159N',
    'CREACBW027SBOG',
    'DRCRELEXFACBS',
    'PRMFGCONS',
    'TLCOMCONS',
    'TLNRESCONS',
    'TLOFCONS',
  ],
  supply: ['FRGEXPUSM649NCIS', 'FRGSHPUSM649NCIS', 'GSCPI'],
};

export const PARAMS = {
  series: {
    type: 'string',
    enum: [...EYES_SERIES.cre, ...EYES_SERIES.supply],
    desc: 'One series id (a FRED id, or GSCPI for the New York Fed index).',
  },
  cpc: {
    type: 'string',
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Y'],
    desc: 'CPC section letter: A human necessities, B operations and transport, C chemistry, D textiles, E fixed constructions, F mechanical engineering, G physics, H electricity, Y emerging cross-sectional.',
  },
  min_grants: {
    type: 'int',
    min: 1,
    max: 1000,
    desc: 'Minimum grants in the last 12 months for a company to rank (default 10).',
  },
  region_kind: {
    type: 'string',
    enum: ['metro', 'port', 'industrial', 'energy'],
    desc: 'Region type: metro, port, industrial or energy.',
  },
};

const LIST = ['limit', 'cursor'];

const SERIES_CHANGE_FIELDS = {
  id: 'string',
  title: 'string',
  units: 'string',
  frequency: 'string',
  source: 'string',
  latest_date: 'date',
  latest_value: 'number',
  prior_date: 'date',
  prior_value: 'number',
  change_prior: 'number',
  change_prior_pct: 'number',
  year_ago_date: 'date',
  year_ago_value: 'number',
  change_yoy: 'number',
  change_yoy_pct: 'number',
};
const OBS_FIELDS = { date: 'date', value: 'number' };

export const ROUTES = {};

export const GROUPS = [
  {
    key: 'patents',
    dimension: 'eyes',
    title: 'Patents',
    base: '/v1/patents',
    icon: 'bi-lightbulb',
    framing:
      'Innovation signal: granted patents matched to listed companies, so a research pipeline speeding up or slowing down shows before it reaches the income statement.',
    source: 'USPTO PatentSearch (PatentsView)',
    routes: [
      {
        id: 'patents.grants',
        kind: 'data',
        path: '/v1/patents/grants',
        scope: 'eyes',
        status: 'live',
        params: ['ticker', 'q', 'cpc', 'from', 'to', ...LIST],
        fields: {
          patent_id: 'string',
          granted_at: 'date',
          filed_at: 'date',
          title: 'string',
          assignee: 'string',
          ticker: 'string',
          cpc_section: 'string',
          cpc_title: 'string',
        },
        summary:
          'Granted US patents with the first assignee and its matched ticker, filterable by ticker, assignee or title text, CPC section and grant date, newest grant first.',
      },
      {
        id: 'patents.momentum',
        kind: 'insight',
        method:
          'Grants per matched company in the last 12 months against the 12 months before, as a percent change, with the most common CPC section of the recent grants.',
        path: '/v1/patents/momentum',
        scope: 'eyes',
        status: 'live',
        list: true,
        params: ['min_grants', 'sort', 'limit'],
        paramEnums: { sort: ['change', 'grants'] },
        fields: {
          ticker: 'string',
          assignee: 'string',
          grants_12m: 'integer',
          grants_prior_12m: 'integer',
          change_pct: 'number',
          top_cpc: 'string',
          top_cpc_title: 'string',
          last_grant: 'date',
        },
        summary:
          'Listed companies ranked by patent grant growth (sort=change, the default) or by grants in the last 12 months (sort=grants). Companies with no grants in the prior 12 months rank last on change.',
      },
      {
        id: 'patents.company_monthly',
        kind: 'insight',
        method:
          'Grants whose assignee matches the company, counted per calendar month over the last 36 months; months with no grant are left out.',
        path: '/v1/patents/companies/{ticker}/monthly',
        scope: 'eyes',
        status: 'live',
        params: [],
        fields: { month: 'date', grants: 'integer' },
        summary: 'Monthly patent grants for one company over the last 36 months, oldest first.',
      },
    ],
  },
  {
    key: 'supply_chain',
    dimension: 'eyes',
    title: 'Supply chain',
    base: '/v1/supply-chain',
    icon: 'bi-box-seam',
    framing:
      'Physical-flow signal: port calls, chokepoint transits and freight volumes read from vessel positions and shipping invoices, weeks before trade statistics are published.',
    source: 'IMF PortWatch, Cass Information Systems (via FRED) and the New York Fed',
    routes: [
      {
        id: 'supply_chain.ports',
        kind: 'insight',
        method:
          'Mean daily port calls over the latest days of data (the days param, default 28) against the mean over the 365 days before that window, as a percent change, for the 100 busiest ports.',
        path: '/v1/supply-chain/ports',
        scope: 'eyes',
        status: 'live',
        list: true,
        params: ['days', 'country', 'sort', 'limit'],
        paramEnums: { sort: ['move', 'rise', 'fall', 'calls'] },
        fields: {
          portid: 'string',
          name: 'string',
          country: 'string',
          iso3: 'string',
          lat: 'number',
          lon: 'number',
          last_date: 'date',
          recent_calls_per_day: 'number',
          baseline_calls_per_day: 'number',
          change_pct: 'number',
          import_tonnes_per_day: 'number',
          export_tonnes_per_day: 'number',
        },
        summary:
          'The busiest ports ranked by the change in daily calls, recent window against a one-year baseline, with imports, exports and country. sort=move (the default) puts the largest change either way first; rise, fall and calls are the alternatives. days runs 7 to 180.',
      },
      {
        id: 'supply_chain.port_daily',
        kind: 'data',
        path: '/v1/supply-chain/ports/{portid}/daily',
        scope: 'eyes',
        status: 'live',
        params: ['from', 'to', ...LIST],
        fields: {
          date: 'date',
          calls: 'integer',
          calls_container: 'integer',
          calls_tanker: 'integer',
          calls_dry_bulk: 'integer',
          import_tonnes: 'integer',
          export_tonnes: 'integer',
        },
        summary:
          'Daily port calls by vessel type and estimated import and export tonnes for one port (a PortWatch id such as port1201), newest day first. The port is in meta.port.',
      },
      {
        id: 'supply_chain.chokepoints',
        kind: 'insight',
        method:
          'Mean daily transits over the latest days of data (the days param, default 7) against the mean over the 365 days before that window, as a percent change, per maritime chokepoint.',
        path: '/v1/supply-chain/chokepoints',
        scope: 'eyes',
        status: 'live',
        list: true,
        params: ['days'],
        fields: {
          id: 'string',
          name: 'string',
          last_date: 'date',
          recent_transits_per_day: 'number',
          baseline_transits_per_day: 'number',
          change_pct: 'number',
          recent_tankers_per_day: 'number',
          recent_containers_per_day: 'number',
        },
        summary:
          'Transits through the maritime chokepoints (Suez, Hormuz, Panama, Malacca and others), recent days against a one-year baseline, largest change first. days runs 7 to 180.',
      },
      {
        id: 'supply_chain.freight',
        kind: 'data',
        path: '/v1/supply-chain/freight',
        scope: 'eyes',
        status: 'live',
        list: true,
        params: ['series'],
        fields: SERIES_CHANGE_FIELDS,
        summary:
          'Freight and supply chain pressure series (Cass shipments and expenditures, and the GSCPI once loaded): the latest value with its month-over-month and year-over-year change.',
      },
      {
        id: 'supply_chain.freight_history',
        kind: 'data',
        path: '/v1/supply-chain/freight/{series}/history',
        scope: 'eyes',
        status: 'live',
        params: ['from', 'to', ...LIST],
        fields: OBS_FIELDS,
        summary:
          'Every observation of one freight series, newest first. The series itself is in meta.series.',
      },
    ],
  },
  {
    key: 'real_estate',
    dimension: 'eyes',
    title: 'Commercial real estate',
    base: '/v1/real-estate',
    icon: 'bi-buildings',
    framing:
      'Property-cycle signal: commercial real estate prices, bank lending, delinquency and construction spending in one place, for REITs, regional banks and builders.',
    source: 'FRED (Federal Reserve Board, BIS and Census Bureau series)',
    routes: [
      {
        id: 'real_estate.indicators',
        kind: 'insight',
        method:
          'For each series, the latest observation against the one before it and against the observation nearest the same date a year earlier, as absolute and percent changes.',
        path: '/v1/real-estate/indicators',
        scope: 'eyes',
        status: 'live',
        list: true,
        params: ['series'],
        fields: SERIES_CHANGE_FIELDS,
        summary:
          'The latest value of each commercial real estate series (price index, bank loans, delinquency rate, construction spending), with its change on the prior period and on the prior year.',
      },
      {
        id: 'real_estate.history',
        kind: 'data',
        path: '/v1/real-estate/indicators/{series}/history',
        scope: 'eyes',
        status: 'live',
        params: ['from', 'to', ...LIST],
        fields: OBS_FIELDS,
        summary:
          'Every observation of one commercial real estate series, newest first. The series itself is in meta.series.',
      },
    ],
  },
  {
    key: 'night_lights',
    dimension: 'eyes',
    title: 'Night lights',
    base: '/v1/night-lights',
    icon: 'bi-moon-stars',
    framing:
      'Activity-from-orbit signal: monthly satellite night-time brightness over cities, ports, industrial zones and oil fields, an activity proxy that does not wait for official statistics.',
    source: 'NASA Black Marble (VIIRS VNP46A3)',
    routes: [
      {
        id: 'night_lights.regions',
        kind: 'data',
        path: '/v1/night-lights/regions',
        scope: 'eyes',
        status: 'live',
        params: ['region_kind', 'country', ...LIST],
        fields: {
          id: 'string',
          name: 'string',
          kind: 'string',
          country: 'string',
          bbox: 'array',
        },
        summary:
          'The tracked regions (economic zones, cities, ports and energy fields) with their bounding box as [min_lon, min_lat, max_lon, max_lat], by id.',
      },
      {
        id: 'night_lights.region',
        kind: 'insight',
        method:
          'Mean VIIRS radiance over the region bounding box per month (cloud-free monthly composites), with the percent change on the same month a year earlier.',
        path: '/v1/night-lights/regions/{id}',
        scope: 'eyes',
        status: 'live',
        params: ['from', 'to'],
        fields: {
          month: 'date',
          mean_radiance: 'number',
          sum_radiance: 'number',
          valid_pixels: 'integer',
          yoy_change_pct: 'number',
        },
        summary:
          'Monthly mean night-time radiance for one region, oldest first, with year-over-year change: an activity proxy. The region itself is in meta.region.',
      },
    ],
  },
];
