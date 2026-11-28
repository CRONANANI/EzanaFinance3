/**
 * Side-by-side price selection for the shared price contract (Sonar 6.5.1, Nov 28 2026).
 *
 * Compares what Sonar valuation selects today (the legacy stored-close rule: the newest
 * price_data_cache close within 10 days, on or before the as-of date, positive) with what
 * the contract adapter (sonar-valuation-prices.js) would select from the SAME cached rows.
 * No provider is called, nothing is written. Used by the deterministic tests and by the
 * read-only validation plan in docs/SONAR_6_5_1.md before SONAR_PRICE_CONTRACT is enabled.
 */
import { valuationPrices, VALUATION_MAX_AGE_DAYS } from './sonar-valuation-prices.js';

const day = (d) => String(d || '').slice(0, 10);

/** The legacy selection, per ticker: { price, asOf } or absent. */
export function legacySelection(rows = [], { asOf, maxAgeDays = VALUATION_MAX_AGE_DAYS } = {}) {
  const since = new Date(Date.parse(`${asOf}T00:00:00Z`) - maxAgeDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const out = {};
  const sorted = [...rows].sort((a, b) => (day(a.date) < day(b.date) ? 1 : -1));
  for (const r of sorted) {
    const t = String(r?.ticker || '').toUpperCase();
    const d = day(r?.date);
    if (!t || out[t] || d < since || d > asOf) continue;
    const c = r.close == null || r.close === '' ? NaN : Number(r.close);
    if (!Number.isFinite(c) || c <= 0) continue;
    out[t] = { price: c, asOf: d };
  }
  return out;
}

/**
 * -> { rows: [{ ticker, verdict, legacy, contract, flags: [] }], summary: {verdict: n} }
 * verdict: same | price_differs | legacy_only (contract rejects) | contract_only | neither
 * flags:   adjusted_close_differs (close and adj_close disagree: which one valuation should
 *          use is a methodology decision), quote_row (no volume: a quote stored as a close),
 *          sample
 */
export function comparePriceSelection(rows = [], { asOf } = {}) {
  const legacy = legacySelection(rows, { asOf });
  const { prices, rejected } = valuationPrices({ cacheRows: rows, asOf });
  const tickers = [
    ...new Set(rows.map((r) => String(r?.ticker || '').toUpperCase()).filter(Boolean)),
  ].sort();
  const out = [];
  const summary = {};
  const byCategory = {};
  for (const t of tickers) {
    const l = legacy[t] || null;
    const c = prices[t] || null;
    const newest = rows
      .filter((r) => String(r.ticker).toUpperCase() === t)
      .sort((a, b) => (day(a.date) < day(b.date) ? 1 : -1))[0];
    const flags = [];
    if (
      newest?.adj_close != null &&
      newest?.close != null &&
      Number(newest.adj_close) !== Number(newest.close)
    )
      flags.push('adjusted_close_differs');
    if (newest && newest.volume == null) flags.push('quote_row');
    if (newest?.state === 'sample' || newest?._sample) flags.push('sample');
    /* Sonar 6.5.2 categories. An adjusted close below the close by under 5% looks like a
       dividend adjustment; a larger gap looks like a split or another corporate action,
       where valuation must use the per-share basis that matches the share count. */
    const all = rows.filter((r) => String(r.ticker).toUpperCase() === t);
    if (all.some((r) => day(r.date) > asOf)) flags.push('future_dated');
    if (newest?.adj_close != null && Number(newest.close) > 0) {
      const gap = Math.abs(1 - Number(newest.adj_close) / Number(newest.close));
      if (gap > 0 && gap < 0.05) flags.push('adjustment_dividend_like');
      else if (gap >= 0.05) flags.push('adjustment_corporate_action_like');
    }
    const valid = all.filter((r) => day(r.date) <= asOf);
    const latest = valid.sort((a, b) => (day(a.date) < day(b.date) ? 1 : -1))[0];
    if (
      latest &&
      (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${day(latest.date)}T00:00:00Z`)) / 86400000 >
        VALUATION_MAX_AGE_DAYS
    )
      flags.push('stale');
    if (latest && !(Number(latest.close) > 0)) flags.push('zero_or_missing');
    const verdict =
      l && c
        ? l.price === c.price && l.asOf === c.asOf
          ? 'same'
          : 'price_differs'
        : l
          ? 'legacy_only'
          : c
            ? 'contract_only'
            : 'neither';
    summary[verdict] = (summary[verdict] || 0) + 1;
    for (const f of flags) byCategory[f] = (byCategory[f] || 0) + 1;
    out.push({
      ticker: t,
      verdict,
      legacy: l,
      contract: c,
      rejectedReason: rejected[t] || null,
      flags,
    });
  }
  return { rows: out, summary, byCategory };
}
