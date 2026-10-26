/**
 * Is the Global Empire Rankings backbone usable? (pure; tested)
 *   unseeded: the seed migration or the first sync has not run (too few
 *             dimensions / mapped metrics / countries, or the materialized
 *             view is missing, unpopulated or empty);
 *   stale:    scores exist but the latest scoring year is more than three
 *             years old (the weekly World Bank sync has stopped landing);
 *   ok.
 * An empty backbone used to surface only as silent "No matches" in Sonar.
 */
export const EMPIRE_MIN = { dims: 18, metricMap: 1, countries: 50 };
export const EMPIRE_STALE_YEARS = 3;

export function empireStatus(
  { dims, metricMap, countries, populated, latestYear },
  now = new Date(),
) {
  if (
    !(dims >= EMPIRE_MIN.dims) ||
    !(metricMap >= EMPIRE_MIN.metricMap) ||
    !(countries >= EMPIRE_MIN.countries) ||
    populated !== true ||
    !Number.isFinite(latestYear)
  ) {
    return 'unseeded';
  }
  return now.getUTCFullYear() - latestYear > EMPIRE_STALE_YEARS ? 'stale' : 'ok';
}
