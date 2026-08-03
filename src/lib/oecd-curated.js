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

export const OECD_CURATED_SERIES = [
  // Growth
  { slug: 'eo-gdpv_annpct', lens: 'growth', label: 'Real GDP growth', unitLabel: '% YoY' },
  { slug: 'eo-gap', lens: 'growth', label: 'Output gap', unitLabel: '% of potential GDP' },
  { slug: 'eo-gdpvtr_annpct', lens: 'growth', label: 'Potential output growth', unitLabel: '% YoY' },
  // Households — Ezana's founding OECD series first
  { slug: 'eo-sratio', lens: 'households', label: 'Household net saving rate', unitLabel: '% of net disposable income' },
  { slug: 'eo-unr', lens: 'households', label: 'Unemployment rate', unitLabel: '% of labour force' },
  { slug: 'eo-lfpr1574', lens: 'households', label: 'Labour force participation', unitLabel: '% of pop. 15–74' },
  { slug: 'eo-hrs', lens: 'households', label: 'Hours worked per worker', unitLabel: 'hours / year' },
  { slug: 'eo-et_annpct', lens: 'households', label: 'Employment growth', unitLabel: '% YoY' },
  // Inflation
  { slug: 'eo-cpi_ytypct', lens: 'inflation', label: 'Headline inflation', unitLabel: '% YoY' },
  { slug: 'eo-pcore_ytypct', lens: 'inflation', label: 'Core inflation', unitLabel: '% YoY' },
  { slug: 'eo-pcp_ytypct', lens: 'inflation', label: 'Consumption deflator', unitLabel: '% YoY' },
  // Rates
  { slug: 'eo-ircb', lens: 'rates', label: 'Central bank key rate', unitLabel: '%' },
  { slug: 'eo-irs', lens: 'rates', label: 'Short-term interest rate', unitLabel: '%' },
  { slug: 'eo-irl', lens: 'rates', label: 'Long-term govt bond yield', unitLabel: '%' },
  // Government
  { slug: 'eo-ggflq', lens: 'government', label: 'Government gross debt', unitLabel: '% of GDP' },
  { slug: 'eo-nlgq', lens: 'government', label: 'Government net lending', unitLabel: '% of GDP' },
  { slug: 'eo-taxq', lens: 'government', label: 'Tax & social contributions', unitLabel: '% of GDP' },
  // External
  { slug: 'eo-cbgdpr', lens: 'external', label: 'Current account balance', unitLabel: '% of GDP' },
  { slug: 'eo-xsha', lens: 'external', label: 'Share of world exports', unitLabel: '% of world' },
  { slug: 'eo-mpen', lens: 'external', label: 'Import penetration', unitLabel: 'ratio' },
];

export const OECD_CURATED_SLUGS = OECD_CURATED_SERIES.map((s) => s.slug);
export const OECD_SERIES_BY_SLUG = Object.fromEntries(
  OECD_CURATED_SERIES.map((s) => [s.slug, s]),
);
