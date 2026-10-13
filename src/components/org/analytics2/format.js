// Shared number formatters for the Fund Analytics `1b` cockpit. JetBrains Mono
// tabular-nums is applied via the `an4-num` class; these only format the value.

export const money = (n) =>
  n == null
    ? '—'
    : `${n < 0 ? '-$' : '$'}${Math.abs(Math.round(Number(n))).toLocaleString('en-US')}`;

export const moneyK = (n) => {
  if (n == null) return '—';
  const k = Number(n) / 1000;
  return `${n < 0 ? '-$' : '$'}${Math.abs(k >= 100 ? Math.round(k) : Number(k.toFixed(1)))}K`;
};

export const pct = (n, dp = 2) =>
  n == null ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(dp)}%`;

export const signClass = (n) => (n == null ? '' : Number(n) >= 0 ? 'an4-pos' : 'an4-neg');

/**
 * Honest benchmark label. `index` → the real symbol (e.g. SPY, XIU.TO);
 * `pitch_proxy` → an explicit estimate label (never the index name over proxy
 * data); anything else → em-dash. Never returns "S&P 500" for a non-SPY fund.
 */
export const benchmarkLabel = (source, symbol) => {
  if (source === 'index' && symbol) return symbol;
  if (source === 'pitch_proxy') return 'Pitch benchmark (est.)';
  return '—';
};
export const BENCHMARK_PROXY_TITLE =
  'Estimated from pitch hindsight (average recorded benchmark return), not live index prices.';
