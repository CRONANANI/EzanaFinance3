/**
 * Curated OECD Economic Outlook series surfaced on Ezana. BigQuery holds all
 * 282 EO measures; only slugs listed here are synced to Supabase and shown on
 * /datasets/oecd-macro. Rule: comparable measures only — ratios, percentages,
 * growth rates. National-currency levels (XDC) are deliberately excluded from
 * presentation (not cross-country comparable). Adding a series = one reviewed
 * entry here + re-running /api/cron/sync-oecd-rollups.
 *
 * EO editions include projections: PROJECTION_FROM_YEAR marks where actuals
 * end. Update when a newer EO vintage is loaded.
 */
export const PROJECTION_FROM_YEAR = 2024;

export const OECD_LENSES = [
  { id: 'growth', label: 'Growth' },
  { id: 'households', label: 'Households' },
  { id: 'inflation', label: 'Inflation' },
  { id: 'rates', label: 'Rates' },
  { id: 'government', label: 'Government' },
  { id: 'external', label: 'External' },
];

/**
 * Scale metadata (added for the explorer redesign — wireframe 3a):
 *  - `short`   terse label for matrix column headers / radar axes.
 *  - `signed`  value is meaningfully +/- ; render on a diverging scale around 0.
 *  - `inv`     higher is WORSE; invert when rank-normalizing so outward/greener
 *              always means "stronger" (lower unemployment, lower debt → better).
 *  - `clamp`   cap the ranking bar at this value and flag the row off-scale, so a
 *              single outlier (Japan gross debt ~240) can't flatten every other bar.
 *  - `skew`    heavily concentrated distribution (CHN/USA dominate world exports).
 *  - `decimals` display precision.
 * These are presentation-only — the sync (`sync-oecd-rollups`) ignores them.
 */
export const OECD_CURATED_SERIES = [
  // Growth
  {
    slug: 'eo-gdpv_annpct',
    lens: 'growth',
    label: 'Real GDP growth',
    unitLabel: '% YoY',
    short: 'GDP',
    signed: true,
    decimals: 1,
  },
  {
    slug: 'eo-gap',
    lens: 'growth',
    label: 'Output gap',
    unitLabel: '% of potential GDP',
    short: 'Gap',
    signed: true,
    decimals: 1,
  },
  {
    slug: 'eo-gdpvtr_annpct',
    lens: 'growth',
    label: 'Potential output growth',
    unitLabel: '% YoY',
    short: 'Pot.',
    decimals: 1,
  },
  // Households — Ezana's founding OECD series first
  {
    slug: 'eo-sratio',
    lens: 'households',
    label: 'Household net saving rate',
    unitLabel: '% of net disposable income',
    short: 'Saving',
    signed: true,
    decimals: 1,
  },
  {
    slug: 'eo-unr',
    lens: 'households',
    label: 'Unemployment rate',
    unitLabel: '% of labour force',
    short: 'Unemp',
    inv: true,
    decimals: 1,
  },
  {
    slug: 'eo-lfpr1574',
    lens: 'households',
    label: 'Labour force participation',
    unitLabel: '% of pop. 15–74',
    short: 'LFP',
    decimals: 1,
  },
  {
    slug: 'eo-hrs',
    lens: 'households',
    label: 'Hours worked per worker',
    unitLabel: 'hours / year',
    short: 'Hours',
    inv: true,
    decimals: 0,
  },
  {
    slug: 'eo-et_annpct',
    lens: 'households',
    label: 'Employment growth',
    unitLabel: '% YoY',
    short: 'Emp.g',
    signed: true,
    decimals: 1,
  },
  // Inflation
  {
    slug: 'eo-cpi_ytypct',
    lens: 'inflation',
    label: 'Headline inflation',
    unitLabel: '% YoY',
    short: 'Infl',
    inv: true,
    decimals: 1,
  },
  {
    slug: 'eo-pcore_ytypct',
    lens: 'inflation',
    label: 'Core inflation',
    unitLabel: '% YoY',
    short: 'Core',
    inv: true,
    decimals: 1,
  },
  {
    slug: 'eo-pcp_ytypct',
    lens: 'inflation',
    label: 'Consumption deflator',
    unitLabel: '% YoY',
    short: 'Defl',
    inv: true,
    decimals: 1,
  },
  // Rates
  {
    slug: 'eo-ircb',
    lens: 'rates',
    label: 'Central bank key rate',
    unitLabel: '%',
    short: 'Key rate',
    inv: true,
    decimals: 1,
  },
  {
    slug: 'eo-irs',
    lens: 'rates',
    label: 'Short-term interest rate',
    unitLabel: '%',
    short: 'ST rate',
    inv: true,
    decimals: 1,
  },
  {
    slug: 'eo-irl',
    lens: 'rates',
    label: 'Long-term govt bond yield',
    unitLabel: '%',
    short: 'LT rate',
    inv: true,
    decimals: 1,
  },
  // Government
  {
    slug: 'eo-ggflq',
    lens: 'government',
    label: 'Government gross debt',
    unitLabel: '% of GDP',
    short: 'Debt',
    inv: true,
    clamp: 150,
    decimals: 1,
  },
  {
    slug: 'eo-nlgq',
    lens: 'government',
    label: 'Government net lending',
    unitLabel: '% of GDP',
    short: 'Net lend',
    signed: true,
    decimals: 1,
  },
  {
    slug: 'eo-taxq',
    lens: 'government',
    label: 'Tax & social contributions',
    unitLabel: '% of GDP',
    short: 'Tax',
    decimals: 1,
  },
  // External
  {
    slug: 'eo-cbgdpr',
    lens: 'external',
    label: 'Current account balance',
    unitLabel: '% of GDP',
    short: 'Cur.acct',
    signed: true,
    decimals: 1,
  },
  {
    slug: 'eo-xsha',
    lens: 'external',
    label: 'Share of world exports',
    unitLabel: '% of world',
    short: 'Exports',
    skew: true,
    decimals: 1,
  },
  {
    slug: 'eo-mpen',
    lens: 'external',
    label: 'Import penetration',
    unitLabel: 'ratio',
    short: 'Imports',
    decimals: 2,
  },
];

export const OECD_CURATED_SLUGS = OECD_CURATED_SERIES.map((s) => s.slug);
export const OECD_SERIES_BY_SLUG = Object.fromEntries(OECD_CURATED_SERIES.map((s) => [s.slug, s]));

/** Aggregate areas: shown ONLY in the aggregates strip. Never ranked, never in a
 *  country table, never in a color scale. */
export const OECD_AGGREGATE_AREAS = ['OECD', 'EA17', 'W', 'WXOECD', 'W_O', 'DAE', 'OIL_SAU_O'];

/** The three surfaced in the aggregates strip, in display order. */
export const OECD_AGGREGATE_STRIP = ['OECD', 'EA17', 'W'];

/** Headline indicator per lens — the matrix columns when lens === 'all'. */
export const OECD_HEADLINE_SLUGS = [
  'eo-gdpv_annpct',
  'eo-unr',
  'eo-cpi_ytypct',
  'eo-ircb',
  'eo-ggflq',
  'eo-cbgdpr',
];
