/**
 * Pitch hindsight maths (QA ORG-17). Pure: callers pass price histories.
 *
 * The benchmark is SPY's return over the SAME window as the pitch: from its
 * first close on or after `decision_at` to its latest close. (It used to be
 * SPY's one-day change, with an invented 12.1% fallback.) The pitch's price
 * at decision is the ticker's close on that same day when history has it,
 * otherwise the price recorded at submission.
 *
 * When a number cannot be computed it is null, never estimated: no
 * benchmark means no alpha and no state.
 */

const dayOf = (v) => (v ? String(v).slice(0, 10) : null);
const closeOf = (row) => {
  const n = Number(row?.close ?? row?.adjClose ?? row?.price);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Ascending [{ date, close }] with usable closes only. */
function series(history) {
  return (Array.isArray(history) ? history : [])
    .map((r) => ({ date: dayOf(r?.date), close: closeOf(r) }))
    .filter((r) => r.date && r.close != null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** First close on or after `when` (next trading day for a weekend). */
export function closeOnOrAfter(history, when) {
  const d = dayOf(when);
  if (!d) return null;
  return series(history).find((r) => r.date >= d) || null;
}

export function latestClose(history) {
  const s = series(history);
  return s.length ? s[s.length - 1] : null;
}

const pct = (from, to) => (from && to != null ? ((to - from) / from) * 100 : null);
const round1 = (n) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10) / 10);

export function stateFor(alpha) {
  if (alpha == null) return null;
  return alpha > 5 ? 'outperforming' : alpha < -5 ? 'underperforming' : 'roughly_inline';
}

/**
 * @param {object} a
 * @param {{ decision_at: string, current_price_at_submission?: number }} a.pitch
 * @param {Array} a.tickerHistory  FMP EOD rows for the pitch ticker
 * @param {Array} a.spyHistory     FMP EOD rows for SPY
 * @param {number|null} [a.tickerQuote]  live price (preferred for "current")
 * @param {number|null} [a.spyQuote]     live SPY price (preferred for "current")
 */
export function computeHindsight({
  pitch,
  tickerHistory,
  spyHistory,
  tickerQuote = null,
  spyQuote = null,
}) {
  const atDecision = closeOnOrAfter(tickerHistory, pitch?.decision_at);
  const submitted = Number(pitch?.current_price_at_submission) || null;
  const priceAt = atDecision?.close ?? submitted;
  const current = Number(tickerQuote) || latestClose(tickerHistory)?.close || null;

  const spyStart = closeOnOrAfter(spyHistory, pitch?.decision_at);
  const spyNow = Number(spyQuote) || latestClose(spyHistory)?.close || null;

  const returnPct = round1(pct(priceAt, current));
  const benchPct = spyStart ? round1(pct(spyStart.close, spyNow)) : null;
  const alpha = returnPct != null && benchPct != null ? round1(returnPct - benchPct) : null;

  return {
    current_price: current,
    price_at_decision: priceAt,
    return_pct: returnPct,
    benchmark_return_pct: benchPct,
    alpha_pct: alpha,
    current_state: stateFor(alpha),
  };
}
