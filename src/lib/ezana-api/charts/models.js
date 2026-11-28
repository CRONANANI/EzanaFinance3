/**
 * Chart models for the Ezana API (pure, tested by
 * scripts/check-ezana-api-charts.mjs). Each builder turns one endpoint's
 * output into a renderer-neutral model; svg.js, vega.js and png.js draw it.
 *
 * Model kinds:
 *   heatmap  { rows: [label], cols: [label], values: [[number|null]], unit }
 *   bars     { categories: [label], values: [number|null], unit, horizontal, diverging }
 *   line     { points: [{ x: iso, y: number }], unit, yDomain? }
 * Every model: { kind, title, subtitle, source, note?, unit }. Values are
 * never invented: a missing input stays null and draws as an empty cell.
 */

/* Colours for exported images (PNG/SVG opened outside the app, where CSS
   variables do not resolve). Values mirror src/app/theme-variables.css. */
export const THEMES = {
  dark: {
    bg: '#0a0e13',
    panel: '#0f151c',
    text: '#f0f6fc',
    muted: '#8b949e',
    grid: 'rgba(16, 185, 129, 0.10)',
    positive: '#10b981',
    negative: '#ef4444',
    accent: '#d4af37',
    empty: 'rgba(139, 148, 158, 0.12)',
  },
  light: {
    bg: '#ffffff',
    panel: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
    grid: 'rgba(0, 0, 0, 0.06)',
    positive: '#059669',
    negative: '#dc2626',
    accent: '#b8941f',
    empty: 'rgba(100, 116, 139, 0.12)',
  },
};

const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Compact value label for a unit: +221K, $1.2M, 62%, +9.0. */
export function formatValue(v, unit) {
  const x = n(v);
  if (x == null) return '–';
  const abs = Math.abs(x);
  const sign = x > 0 ? '+' : x < 0 ? '−' : '';
  const compact = (a) =>
    a >= 1e12
      ? `${(a / 1e12).toFixed(1)}T`
      : a >= 1e9
        ? `${(a / 1e9).toFixed(1)}B`
        : a >= 1e6
          ? `${(a / 1e6).toFixed(1)}M`
          : a >= 1e3
            ? `${Math.round(a / 1e3)}K`
            : `${Math.round(a)}`;
  switch (unit) {
    case 'usd':
    case 'usd_per_1pct':
      return `${sign}$${compact(abs)}`;
    case 'usd_total':
      return `$${compact(abs)}`;
    case 'probability':
      return `${Math.round(x * 100)}%`;
    case 'robust_z':
    case 'score':
      return `${sign}${abs.toFixed(1)}`;
    case 'contracts':
      return compact(abs);
    default:
      return `${sign}${compact(abs)}`;
  }
}

const shortDate = (iso) => {
  const [, m, d] = String(iso).split('-');
  return m && d ? `${Number(m)}/${Number(d)}` : String(iso);
};

/** options.exposure -> heatmap (strikes x expirations). */
export function exposureChart(d) {
  return {
    kind: 'heatmap',
    title: `${d.ticker} · ${d.label}`,
    subtitle: `Underlying ${d.spot != null ? `$${d.spot.toFixed(2)}` : 'price unavailable'} · ${d.strikes.length} strikes × ${d.expirations.length} expirations · total ${formatValue(d.total, d.unit)}`,
    source: 'Ezana API · options data via Alpaca · open interest as of the prior session',
    note:
      d.coverage?.contracts_missing_greeks > 0
        ? `${d.coverage.contracts_missing_greeks} of ${d.coverage.contracts} contracts had no greek and are not counted.`
        : null,
    unit: d.unit,
    rows: d.strikes.map((s) => `$${Number.isInteger(s) ? s : s.toFixed(1)}`),
    cols: d.expirations.map(shortDate),
    values: d.cells.map((row) => row.map((c) => (c ? n(c.value) : null))),
    diverging: d.unit !== 'contracts',
    rowHighlight:
      d.spot != null && d.strikes.length
        ? d.strikes.reduce(
            (best, s, i) => (Math.abs(s - d.spot) < Math.abs(d.strikes[best] - d.spot) ? i : best),
            0,
          )
        : null,
  };
}

/** alpha.procurement_acceleration rows -> horizontal diverging bars of robust z. */
export function procurementChart(rows, meta = {}) {
  return {
    kind: 'bars',
    horizontal: true,
    diverging: true,
    title: `Procurement acceleration · FY${meta.fiscal_year ?? ''}`,
    subtitle: "Federal obligations vs each company's own history (robust z). q-values in the data.",
    source: 'Ezana API · USAspending obligations · descriptive signal',
    unit: 'robust_z',
    categories: rows.map((r) => r.entity?.ticker),
    values: rows.map((r) => n(r.value)),
  };
}

/** congress.insider_flow rows -> horizontal diverging bars of flow score. */
export function insiderFlowChart(rows, params = {}) {
  return {
    kind: 'bars',
    horizontal: true,
    diverging: true,
    title: `Congressional flow · last ${params.days ?? 90} days`,
    subtitle: 'Flow score: -100 all selling to +100 all buying, by disclosure date',
    source: 'Ezana API · House Clerk and Senate disclosures',
    unit: 'score',
    categories: rows.map((r) => r.ticker),
    values: rows.map((r) => n(r.flow_score)),
  };
}

/** contracts.ticker -> columns of obligations by fiscal year (oldest first). */
export function contractsChart(d) {
  const years = [...(d.by_fiscal_year || [])].sort((a, b) => a.fiscal_year - b.fiscal_year);
  return {
    kind: 'bars',
    horizontal: false,
    diverging: years.some((y) => n(y.amount) < 0),
    title: `${d.ticker} · federal contract obligations by fiscal year`,
    subtitle: years.some((y) => y.complete === false)
      ? 'Lighter bar: fiscal year still being reported'
      : 'Net obligations, all agencies',
    source: 'Ezana API · USAspending',
    unit: 'usd',
    categories: years.map((y) => `FY${String(y.fiscal_year).slice(2)}`),
    values: years.map((y) => n(y.amount)),
    incomplete: years.map((y) => y.complete === false),
  };
}

/** predictions.market_history rows -> probability line. */
export function marketHistoryChart(rows, id) {
  const pts = [...rows]
    .filter((r) => r.at && n(r.probability) != null)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .map((r) => ({ x: r.at, y: n(r.probability) }));
  return {
    kind: 'line',
    title: `Prediction market ${id}`,
    subtitle: pts.length
      ? `Implied probability, ${pts[0].x.slice(0, 10)} to ${pts[pts.length - 1].x.slice(0, 10)}`
      : 'No history in this window',
    source: 'Ezana API · Polymarket and Kalshi snapshots',
    unit: 'probability',
    points: pts,
    yDomain: [0, 1],
  };
}
