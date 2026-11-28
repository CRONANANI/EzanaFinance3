/**
 * Sonar 6.4: deterministic macroeconomic analysis (Nov 28 2026). Pure: no I/O.
 *
 * From validated series already in Ezana (macro_series_values):
 *   - IMF consumer price index, monthly (IMF.STA/CPI, index level, not seasonally adjusted)
 *   - BIS central bank policy rates, monthly and daily (WS_CBPOL)
 *
 * Calculations, per country:
 *   inflation trend   year-on-year change of the index (month t against t-12, both
 *                     observed; a missing month is never filled), the 3-month change
 *                     annualised, and the year-on-year rate six months earlier.
 *                     "Accelerating" means the 3-month annualised rate is above the
 *                     year-on-year rate AND the year-on-year rate is above its level six
 *                     months earlier; "decelerating" the reverse of both; otherwise mixed.
 *   real policy rate  the policy rate minus year-on-year inflation for the SAME month (the
 *                     latest month both exist), so the two never come from different dates.
 *   policy changes    each change in the policy rate inside the window, from the daily
 *                     series when it covers the window (exact effective dates), otherwise
 *                     month to month (the month it took effect).
 */

export const MACRO_VERSION = 'macro-v1';

const shiftMonth = (p, k) => {
  const [y, m] = p.split('-').map(Number);
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

/** Year-on-year rates for every month whose year-earlier month is observed. */
export function yoySeries(index = {}) {
  const out = {};
  for (const p of Object.keys(index).sort()) {
    const prev = index[shiftMonth(p, -12)];
    if (Number.isFinite(index[p]) && Number.isFinite(prev) && prev > 0)
      out[p] = index[p] / prev - 1;
  }
  return out;
}

/**
 * The inflation trend from a monthly index.
 * @param {Record<string, number>} index { 'YYYY-MM': level }
 */
export function inflationTrend(index = {}) {
  const months = Object.keys(index).sort();
  const yoy = yoySeries(index);
  const yoyMonths = Object.keys(yoy).sort();
  const latestYoYPeriod = yoyMonths[yoyMonths.length - 1] || null;
  const latestIndexPeriod = months[months.length - 1] || null;
  const latestYoY = latestYoYPeriod ? yoy[latestYoYPeriod] : null;
  const earlierPeriod = latestYoYPeriod ? shiftMonth(latestYoYPeriod, -6) : null;
  const yoySixMonthsEarlier =
    earlierPeriod && yoy[earlierPeriod] != null ? yoy[earlierPeriod] : null;
  const p3 = latestYoYPeriod ? shiftMonth(latestYoYPeriod, -3) : null;
  const annualized3m =
    latestYoYPeriod && Number.isFinite(index[p3]) && index[p3] > 0
      ? (index[latestYoYPeriod] / index[p3]) ** 4 - 1
      : null;
  let direction = null;
  if (latestYoY != null && annualized3m != null && yoySixMonthsEarlier != null) {
    const up = annualized3m > latestYoY && latestYoY > yoySixMonthsEarlier;
    const down = annualized3m < latestYoY && latestYoY < yoySixMonthsEarlier;
    direction = up ? 'accelerating' : down ? 'decelerating' : 'mixed';
  }
  return {
    latestIndexPeriod,
    latestYoYPeriod,
    latestYoY,
    annualized3m,
    yoySixMonthsEarlier,
    earlierPeriod,
    direction,
    accelerating: direction === 'accelerating',
    /* The newest index month has no year-earlier observation (a gap in the series). */
    gapNote:
      latestIndexPeriod && latestYoYPeriod && latestIndexPeriod !== latestYoYPeriod
        ? `The ${latestIndexPeriod} index has no observation twelve months earlier (${shiftMonth(latestIndexPeriod, -12)} is missing from the series), so the latest year-on-year rate is for ${latestYoYPeriod}.`
        : null,
  };
}

/**
 * Sonar 6.4 hardening: which figures are observed and which are derived, and the months
 * missing inside the observed span. Nothing is interpolated: a derived figure needs every
 * input month observed, and a missing month is listed, never filled.
 */
export function macroProvenance(index = {}) {
  const months = Object.keys(index)
    .filter((p) => Number.isFinite(index[p]))
    .sort();
  const missingMonths = [];
  if (months.length) {
    for (let p = months[0]; p < months[months.length - 1]; p = shiftMonth(p, 1)) {
      if (!Number.isFinite(index[p])) missingMonths.push(p);
      if (missingMonths.length > 24) break;
    }
  }
  return {
    observed: ['consumer price index (monthly level)', 'policy rate (as published)'],
    derived: {
      latestYoY: 'index(t) / index(t-12) - 1, both months observed',
      annualized3m: '(index(t) / index(t-3))^4 - 1, both months observed',
      yoySixMonthsEarlier: 'year-on-year rate six months before, both months observed',
      realRate: 'policy rate minus year-on-year inflation for the same month',
      changes: 'differences between consecutive observed policy rate values',
    },
    interpolated: false,
    missingMonths,
    firstObserved: months[0] || null,
    lastObserved: months[months.length - 1] || null,
  };
}

/** Policy rate minus year-on-year inflation for the latest month both are observed. */
export function realPolicyRate(policyMonthly = {}, index = {}) {
  const yoy = yoySeries(index);
  const both = Object.keys(policyMonthly)
    .filter((p) => yoy[p] != null && Number.isFinite(policyMonthly[p]))
    .sort();
  const p = both[both.length - 1];
  if (!p) return { realRate: null, realRatePeriod: null, policyRate: null, inflation: null };
  return {
    realRate: policyMonthly[p] - yoy[p] * 100,
    realRatePeriod: p,
    policyRate: policyMonthly[p],
    inflation: yoy[p],
  };
}

/**
 * Policy rate changes since `from` (a 'YYYY-MM' month). Daily observations, when they
 * cover the window, give the effective date of each change; otherwise monthly values give
 * the month of each change.
 */
export function policyChanges({ daily = {}, monthly = {} } = {}, { from }) {
  const dDays = Object.keys(daily).sort();
  const dailyCovers = dDays.length && dDays[0].slice(0, 7) <= shiftMonth(from, -1);
  const series = dailyCovers ? daily : monthly;
  const keys = Object.keys(series).sort();
  const changes = [];
  let prev = null;
  for (const k of keys) {
    const v = series[k];
    if (v == null || !Number.isFinite(v)) continue;
    if (prev != null && v !== prev.v && k.slice(0, 7) >= from)
      changes.push({
        date: k,
        from: prev.v,
        to: v,
        change: Math.round((v - prev.v) * 10000) / 10000,
      });
    prev = { k, v };
  }
  const latestKey = keys[keys.length - 1] || null;
  return {
    basis: dailyCovers ? 'daily' : 'monthly',
    changes,
    count: changes.length,
    net: Math.round(changes.reduce((s, c) => s + c.change, 0) * 10000) / 10000,
    latest: latestKey ? { date: latestKey, value: series[latestKey] } : null,
  };
}

/*
 * Countries the macro executor can name, with the words a question uses for them
 * (names, demonyms, central banks). Small on purpose: this module also runs in the browser.
 * Every ISO3 here has an IMF CPI or a BIS policy-rate series in Ezana's data.
 */
const COUNTRY_WORDS = [
  ['USA', String.raw`u\.?s\.?a?\.?|united states|america|american|the fed|federal reserve|fomc`],
  ['CAN', String.raw`canada|canadian|bank of canada`],
  ['GBR', String.raw`u\.?k\.?|united kingdom|britain|british|england|bank of england`],
  ['JPN', String.raw`japan|japanese|bank of japan|boj`],
  ['DEU', String.raw`germany|german`],
  ['FRA', String.raw`france|french`],
  ['ITA', String.raw`italy|italian`],
  ['ESP', String.raw`spain|spanish`],
  ['CHE', String.raw`switzerland|swiss|snb`],
  ['SWE', String.raw`sweden|swedish|riksbank`],
  ['NOR', String.raw`norway|norwegian|norges bank`],
  ['DNK', String.raw`denmark|danish`],
  ['POL', String.raw`poland|polish`],
  ['CZE', String.raw`czech(?:ia| republic)?`],
  ['HUN', String.raw`hungary|hungarian`],
  ['ROU', String.raw`romania|romanian`],
  ['TUR', String.raw`turkey|turkish|t[uü]rkiye`],
  ['RUS', String.raw`russia|russian`],
  ['CHN', String.raw`china|chinese|pboc`],
  ['IND', String.raw`india|indian|reserve bank of india|rbi`],
  ['IDN', String.raw`indonesia|indonesian`],
  ['KOR', String.raw`south korea|korea|korean`],
  ['AUS', String.raw`australia|australian|rba`],
  ['NZL', String.raw`new zealand|rbnz`],
  ['BRA', String.raw`brazil|brazilian`],
  ['MEX', String.raw`mexico|mexican|banxico`],
  ['ARG', String.raw`argentina|argentine|argentinian`],
  ['CHL', String.raw`chile|chilean`],
  ['COL', String.raw`colombia|colombian`],
  ['PER', String.raw`peru|peruvian`],
  ['ZAF', String.raw`south africa|south african`],
  ['NGA', String.raw`nigeria|nigerian`],
  ['EGY', String.raw`egypt|egyptian`],
  ['SAU', String.raw`saudi arabia|saudi`],
  ['ISR', String.raw`israel|israeli`],
  ['THA', String.raw`thailand|thai`],
  ['MYS', String.raw`malaysia|malaysian`],
  ['PHL', String.raw`philippines|philippine|filipino`],
  ['HKG', String.raw`hong kong`],
].map(([iso, w]) => [iso, new RegExp(String.raw`(?:^|[^\p{L}])(?:${w})(?=[^\p{L}]|$)`, 'iu')]);

/** ISO3 codes of the countries a question names, in the order of the list above. */
export function macroCountries(question) {
  const q = String(question || '');
  /* "US dollar", "American Express": the country word inside a non-country phrase. */
  const masked = q.replace(/\b(?:us dollar|u\.s\. dollar|american express|america's cup)\b/gi, ' ');
  return COUNTRY_WORDS.filter(([, re]) => re.test(masked)).map(([iso]) => iso);
}
