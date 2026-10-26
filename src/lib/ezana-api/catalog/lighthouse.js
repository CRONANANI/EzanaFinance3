/**
 * Ezana API catalog: lighthouse dimension. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape.
 *
 *   PARAMS  query params this dimension adds (names must be new)
 *   ROUTES  { groupKey: [route, ...] } appended to an existing group
 *   GROUPS  new groups, each with dimension: 'lighthouse'
 */
import { WB_INDICATORS } from '@/lib/lighthouse/indicators';

export const SANCTIONS_ENTITY_TYPES = ['individual', 'entity', 'vessel', 'aircraft'];
export const OFAC_ACTION_KINDS = [
  'designation',
  'removal',
  'update',
  'general_license',
  'guidance',
  'regulation',
  'enforcement',
];
export const GPR_INDEXES = ['GPR', 'GPRT', 'GPRA', 'GPRC'];
export const WB_DEFAULT_INDICATOR = 'NY.GDP.MKTP.KD.ZG';

export const PARAMS = {
  indicator: {
    type: 'string',
    enum: WB_INDICATORS.map((i) => i.id),
    desc: `World Bank indicator code (default ${WB_DEFAULT_INDICATOR}, real GDP growth): ${WB_INDICATORS.map((i) => `${i.id} ${i.label.toLowerCase()}`).join('; ')}.`,
  },
  iso3: {
    type: 'string',
    repeatable: true,
    max: 10,
    pattern: /^[A-Za-z0-9_]{2,10}$/,
    desc: 'Country as an ISO3 code (for example USA), or an OECD aggregate code (OECD, EA17, W). Repeat for several, up to 30.',
  },
  program: {
    type: 'string',
    max: 60,
    desc: 'Sanctions program code as OFAC writes it, for example RUSSIA-EO14024 or SDGT.',
  },
  entity_type: {
    type: 'string',
    enum: SANCTIONS_ENTITY_TYPES,
    desc: 'Listing type: individual, entity, vessel or aircraft.',
  },
  id_number: {
    type: 'string',
    max: 60,
    desc: 'An identifier on the listing (IMO number, passport, tax id, registration...), matched on letters and digits from the start.',
  },
  action_kind: {
    type: 'string',
    enum: OFAC_ACTION_KINDS,
    desc: 'Kind of Treasury action: designation, removal, update, general_license, guidance, regulation or enforcement.',
  },
  gpr_index: {
    type: 'string',
    enum: GPR_INDEXES,
    desc: 'GPR series: GPR (global), GPRT (global threats), GPRA (global acts) or GPRC (country indexes).',
  },
};

const RANK_SORT = ['highest', 'lowest'];
const EMPIRE_SOURCE =
  'Ezana Global Empire Rankings, built from World Bank World Development Indicators';
const DIM_FIELDS = {
  id: 'string',
  name: 'string',
  category: 'string',
  score: 'number',
  rank: 'integer',
  of: 'integer',
};

export const ROUTES = {};

export const GROUPS = [
  {
    key: 'empire',
    dimension: 'lighthouse',
    title: 'Global Empire Rankings',
    base: '/v1/empire',
    icon: 'bi-globe2',
    framing:
      "Ezana's own ranking of countries across Dalio-style power dimensions, scored only from live, sourced dimensions. It is Ezana's ranking, not an official index.",
    source: EMPIRE_SOURCE,
    routes: [
      {
        id: 'empire.rankings',
        kind: 'insight',
        path: '/v1/empire/rankings',
        scope: 'macro',
        status: 'live',
        list: true,
        params: ['limit'],
        method:
          "Each live dimension score is put on a 0 to 100 scale where higher means stronger (inverted where lower is better), a country's composite is the mean of its scores, and only countries scored on at least 70% of the live dimensions are ranked; this is Ezana's ranking, not an official index.",
        fields: {
          rank: 'integer',
          iso3: 'string',
          country: 'string',
          composite: 'number',
          coverage: 'number',
          dimensions_scored: 'integer',
          dimensions_live: 'integer',
          strongest: 'array',
          weakest: 'array',
          year: 'integer',
        },
        summary:
          "Composite Empire rankings for the latest scored year, strongest first, with each country's coverage and its strongest and weakest dimensions. meta.dimensions lists every dimension and whether it is live.",
      },
      {
        id: 'empire.country',
        kind: 'insight',
        path: '/v1/empire/countries/{country}',
        scope: 'macro',
        status: 'live',
        params: [],
        method:
          "Each live dimension is ranked across every scored country (ties share a rank); strongest and weakest are the country's three best and three worst ranks, and the composite rank follows the 70% coverage rule of the rankings.",
        fields: {
          iso3: 'string',
          country: 'string',
          year: 'integer',
          composite: 'number',
          composite_rank: 'integer',
          ranked_countries: 'integer',
          dimensions_scored: 'integer',
          dimensions_live: 'integer',
          dimensions: 'array',
          strongest: 'array',
          weakest: 'array',
        },
        summary:
          'One country (ISO3 code in the path, for example USA): its score and rank on every live dimension, its three strongest and three weakest dimensions, and its composite rank (null below the coverage rule).',
      },
      {
        id: 'empire.dimension',
        kind: 'data',
        path: '/v1/empire/dimensions/{dimension}',
        scope: 'macro',
        status: 'live',
        list: true,
        params: [],
        fields: {
          rank: 'integer',
          iso3: 'string',
          country: 'string',
          score: 'number',
          of: 'integer',
          year: 'integer',
        },
        summary:
          'The full ranking for one live dimension (for example economic_output or debt_burden), strongest first, on a 0 to 100 scale where higher means stronger.',
      },
      {
        id: 'empire.compare',
        kind: 'insight',
        path: '/v1/empire/compare',
        scope: 'macro',
        status: 'live',
        params: ['a', 'b'],
        method:
          'Both countries are read from the same Empire model; on each live dimension the higher 0 to 100 score leads, equal scores tie, and a dimension where either country is unscored has no leader.',
        fields: {
          year: 'integer',
          a: 'object',
          b: 'object',
          dimensions: 'array',
          leads: 'object',
        },
        summary:
          'Country a against country b (ISO3 codes, both required) on every live dimension: both scores, the gap (a minus b) and the leader (an ISO3 code, tie, or null when either is unscored), a tally of leads and both composite ranks.',
      },
    ],
  },
  {
    key: 'macro',
    dimension: 'lighthouse',
    title: 'Macro: OECD and World Bank',
    base: '/v1/macro',
    icon: 'bi-bar-chart-line',
    framing:
      'Comparable macro series for cross-country screens: the OECD Economic Outlook (with projections flagged) and the World Bank World Development Indicators.',
    source: 'OECD Economic Outlook and World Bank World Development Indicators',
    routes: [
      {
        id: 'macro.oecd_series',
        kind: 'data',
        path: '/v1/macro/oecd/series',
        scope: 'macro',
        status: 'live',
        list: true,
        params: [],
        fields: {
          slug: 'string',
          label: 'string',
          lens: 'string',
          unit: 'string',
          frequency: 'string',
          signed: 'boolean',
          higher_is_better: 'boolean',
          projection_from_year: 'integer',
        },
        summary:
          'The OECD Economic Outlook series Ezana carries: slug, label, unit, frequency and the first year that is a projection rather than an outturn.',
      },
      {
        id: 'macro.oecd_observations',
        kind: 'data',
        path: '/v1/macro/oecd/{slug}',
        scope: 'macro',
        status: 'live',
        params: ['iso3', 'limit', 'cursor'],
        fields: {
          area: 'string',
          area_name: 'string',
          is_aggregate: 'boolean',
          year: 'integer',
          value: 'number',
          unit: 'string',
          projection: 'boolean',
        },
        summary:
          'Annual observations for one OECD series (a slug from /v1/macro/oecd/series), by area then year, for the countries in iso3 or every area; projection is true from the projection start year.',
      },
      {
        id: 'macro.oecd_ranking',
        kind: 'insight',
        path: '/v1/macro/oecd/{slug}/ranking',
        scope: 'macro',
        status: 'live',
        list: true,
        params: ['sort', 'year', 'limit'],
        paramEnums: { sort: RANK_SORT },
        method:
          "Each country's latest observation (capped at year when given) is ranked on the latest year most countries report, aggregates left out, equal values sharing a rank, and change is the move on the prior year.",
        fields: {
          rank: 'integer',
          iso3: 'string',
          country: 'string',
          value: 'number',
          prior_value: 'number',
          change: 'number',
          unit: 'string',
          year: 'integer',
          projection: 'boolean',
          of: 'integer',
        },
        summary:
          'Countries ranked on one OECD series for a single common year, highest first by default (sort highest or lowest), with the change on the prior year.',
      },
      {
        id: 'macro.world_bank_country',
        kind: 'data',
        path: '/v1/macro/world-bank/countries/{country}',
        scope: 'macro',
        status: 'live',
        list: true,
        params: [],
        fields: {
          indicator: 'string',
          label: 'string',
          unit: 'string',
          latest_year: 'integer',
          latest_value: 'number',
          prior_year: 'integer',
          prior_value: 'number',
          change: 'number',
        },
        summary:
          "A country's (ISO3 code in the path) latest and prior value for each of the eight World Bank indicators Ezana carries (growth, inflation, unemployment, current account, debt, exports, GDP per capita, reserves).",
      },
      {
        id: 'macro.world_bank_rankings',
        kind: 'insight',
        path: '/v1/macro/world-bank/rankings',
        scope: 'macro',
        status: 'live',
        list: true,
        params: ['indicator', 'sort', 'year', 'limit'],
        paramEnums: { sort: RANK_SORT },
        method:
          'Countries are ranked on one year for everyone: the year asked for, else the newest year where at least 85% of reporting economies have a value, else the best-covered year; regional and income-group aggregates are left out, territories are flagged, and equal values share a rank.',
        fields: {
          rank: 'integer',
          iso3: 'string',
          country: 'string',
          value: 'number',
          year: 'integer',
          of: 'integer',
          territory: 'boolean',
        },
        summary:
          'Countries ranked on one World Bank indicator (default real GDP growth) for a single common year, highest first by default (sort highest or lowest).',
      },
    ],
  },
  {
    key: 'geopolitical_risk',
    dimension: 'lighthouse',
    title: 'Geopolitical risk',
    base: '/v1/geopolitical-risk',
    icon: 'bi-exclamation-triangle',
    framing:
      'The Caldara and Iacoviello Geopolitical Risk index, global and by country, monthly: a news-based read of war, terrorism and tension risk.',
    source: 'Caldara and Iacoviello Geopolitical Risk (GPR) Index',
    routes: [
      {
        id: 'gpr.index',
        kind: 'data',
        path: '/v1/geopolitical-risk/index',
        scope: 'macro',
        status: 'live',
        params: ['country', 'gpr_index', 'from', 'to', 'limit', 'cursor'],
        fields: {
          index: 'string',
          iso3: 'string',
          country: 'string',
          month: 'date',
          value: 'number',
        },
        summary:
          'Monthly GPR values, newest month first: the global index, its threats and acts components (iso3 WLD) and the country indexes. country takes an ISO3 code.',
      },
      {
        id: 'gpr.movers',
        kind: 'insight',
        path: '/v1/geopolitical-risk/movers',
        scope: 'macro',
        status: 'live',
        list: true,
        params: ['limit'],
        method:
          'For each country reporting the newest month, the mean of its last 3 months is compared with the median of the 60 months before them (at least 24 required), and countries are ordered by the rise.',
        fields: {
          iso3: 'string',
          country: 'string',
          latest_month: 'string',
          latest_value: 'number',
          recent_mean: 'number',
          baseline_median: 'number',
          rise: 'number',
          rise_pct: 'number',
          baseline_months: 'integer',
        },
        summary:
          'Countries with the largest rise in geopolitical risk over the last 3 months against their own 5-year median, largest rise first.',
      },
    ],
  },
  {
    key: 'sanctions',
    dimension: 'lighthouse',
    title: 'Sanctions',
    base: '/v1/sanctions',
    icon: 'bi-shield-exclamation',
    framing:
      "The U.S. Treasury's Specially Designated Nationals list, parsed: names, aliases, identifiers, programs and linked parties, with listing activity over time. Research data, not a compliance screening tool.",
    source: 'U.S. Treasury Office of Foreign Assets Control (OFAC)',
    routes: [
      {
        id: 'sanctions.entities',
        kind: 'data',
        path: '/v1/sanctions/entities',
        scope: 'sanctions',
        status: 'live',
        params: [
          'q',
          'id_number',
          'entity_type',
          'country',
          'program',
          'from',
          'to',
          'limit',
          'cursor',
        ],
        fields: {
          id: 'integer',
          name: 'string',
          type: 'string',
          programs: 'array',
          countries: 'array',
          localities: 'array',
          listed_on: 'date',
          secondary_risk: 'boolean',
          matched_alias: 'string',
          identifier: 'object',
          links: 'integer',
        },
        summary:
          "Search active SDN listings by name or alias, identifier, type, country (as OFAC writes it, for example Iran), program and listing date, newest listing first. This is not a compliance screening tool: use OFAC's own search for screening.",
      },
      {
        id: 'sanctions.entity',
        kind: 'data',
        path: '/v1/sanctions/entities/{id}',
        scope: 'sanctions',
        status: 'live',
        params: [],
        fields: {
          id: 'integer',
          name: 'string',
          type: 'string',
          programs: 'array',
          countries: 'array',
          localities: 'array',
          listed_on: 'date',
          removed_on: 'date',
          secondary_risk: 'array',
          remarks: 'string',
          aliases: 'array',
          identifiers: 'array',
          links: 'array',
          linked_from: 'array',
        },
        summary:
          'One SDN entry by OFAC entry number, with its aliases, identifiers, programs and the parties it is linked to or linked from.',
      },
      {
        id: 'sanctions.activity',
        kind: 'insight',
        path: '/v1/sanctions/activity',
        scope: 'sanctions',
        status: 'live',
        params: ['days', 'country', 'program', 'entity_type'],
        method:
          'Listings are counted by the month of their OFAC publication date over whole calendar months covering the window (default 730 days), and the top countries and programs count each listing once under every country or program it carries.',
        fields: {
          from: 'date',
          to: 'date',
          months: 'array',
          total: 'integer',
          top_countries: 'array',
          top_programs: 'array',
        },
        summary:
          'Monthly new SDN listings over the window, filterable by country, program and type, with the top countries and programs in that window.',
      },
      {
        id: 'sanctions.country_trend',
        kind: 'insight',
        path: '/v1/sanctions/countries/trend',
        scope: 'sanctions',
        status: 'live',
        list: true,
        params: ['days', 'country'],
        method:
          'New listings are counted per address country and month of OFAC publication over whole months covering the window (default 730 days, at most 10 years); a listing counts once under each of its countries.',
        fields: { country: 'string', month: 'date', listings: 'integer' },
        summary:
          'New SDN listings per country per month (heat map data), oldest month first. Months with no listings for a country are omitted.',
      },
      {
        id: 'sanctions.actions',
        kind: 'data',
        path: '/v1/sanctions/actions',
        scope: 'sanctions',
        status: 'live',
        params: ['action_kind', 'from', 'to', 'limit', 'cursor'],
        fields: {
          id: 'string',
          date: 'date',
          title: 'string',
          kinds: 'array',
          program_hints: 'array',
          url: 'string',
        },
        summary:
          "Recent Treasury OFAC actions from OFAC's Recent Actions page, newest first, with the kinds of action and the programs the title names.",
      },
      {
        id: 'sanctions.summary',
        kind: 'insight',
        path: '/v1/sanctions/summary',
        scope: 'sanctions',
        status: 'live',
        params: [],
        method:
          'Counts are listing records on calendar-day windows ending today by OFAC publication date; removals are counted from the first day Ezana tracked the list, and top programs count each listing under every program it carries over the last 365 days.',
        fields: {
          active: 'integer',
          listed_last_30_days: 'integer',
          listed_prior_30_days: 'integer',
          listed_last_90_days: 'integer',
          listed_last_365_days: 'integer',
          removed_last_30_days: 'integer',
          removed_since_tracking: 'integer',
          tracking_since: 'date',
          earliest_listed: 'date',
          latest_listed: 'date',
          coverage: 'object',
          top_programs: 'array',
        },
        summary:
          'Headline SDN counts: active entries, new listings in the last 30, 90 and 365 days, observed removals, data coverage and the top programs of the last year.',
      },
    ],
  },
];
