/**
 * Pure helpers behind the Industry Layout components. No I/O, unit tested in
 * scripts/check-industry-layout.mjs. Every figure here comes from a registry
 * row that carries source_url and as_of; nothing is estimated, and an empty
 * input always yields an empty output (the component's empty state).
 */

/** Metric ids the overview tiles look for, in display order. */
export const KPI_METRICS = [
  { id: 'industry_sales', label: 'Industry sales' },
  { id: 'global_sales_share', label: 'Share of global sales' },
  { id: 'manufacturing_capacity_share', label: 'Share of global capacity' },
  { id: 'employment', label: 'Direct employment' },
  { id: 'rd_spend', label: 'R&D spend' },
  { id: 'capex', label: 'Capital expenditure' },
];

export const MEASURE_TYPES = ['observed', 'estimated', 'forecast', 'announced'];

/** The latest approved, non-superseded row per (metric, dimension, period). */
export function currentMetrics(metrics) {
  const superseded = new Set((metrics || []).map((m) => m.supersedes).filter(Boolean));
  return (metrics || []).filter(
    (m) => (m.review_status == null || m.review_status === 'approved') && !superseded.has(m.id),
  );
}

/** The newest row for one metric id with no dimension (the headline). */
export function headline(metrics, id) {
  const rows = currentMetrics(metrics)
    .filter((m) => m.metric === id && (!m.dimension || !Object.keys(m.dimension).length))
    .sort((a, b) => String(b.as_of || '').localeCompare(String(a.as_of || '')));
  return rows[0] || null;
}

/** Rows of one metric split by a dimension key, e.g. company or end_market. */
export function byDimension(metrics, id, key) {
  return currentMetrics(metrics)
    .filter((m) => m.metric === id && m.dimension && m.dimension[key] != null)
    .map((m) => ({ ...m, key: String(m.dimension[key]) }))
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
}

/** Stage columns for the value chain: upstream inputs separate from the
 *  main flow, each with its company count under the active filters. */
export function chainLayout(stages, companies) {
  const count = (id) => (companies || []).filter((c) => c.stage_id === id).length;
  const sorted = [...(stages || [])].sort((a, b) => a.ord - b.ord);
  return {
    upstream: sorted.filter((s) => s.is_upstream_input).map((s) => ({ ...s, n: count(s.id) })),
    flow: sorted.filter((s) => !s.is_upstream_input).map((s) => ({ ...s, n: count(s.id) })),
  };
}

/** Which stages feed which, for the chain's "feeds" captions. */
export function feedsOf(links, stageId) {
  return (links || []).filter((l) => l.from_stage === stageId).map((l) => l.to_stage);
}

/** The cross-filter: stage, state and business model, any combination. */
export function applyFilters(registry, f = {}) {
  const companies = (registry?.companies || []).filter(
    (c) => (!f.stage || c.stage_id === f.stage) && (!f.model || c.business_model === f.model),
  );
  const tickers = new Set(companies.map((c) => c.ticker).filter(Boolean));
  const names = new Set(companies.map((c) => c.company_name));
  const facilities = approved(registry?.facilities).filter(
    (x) =>
      (!f.state || x.state_code === f.state) &&
      (!f.stage ||
        x.stage_id === f.stage ||
        (!x.stage_id && (tickers.has(x.ticker) || names.has(x.company_name)))) &&
      (!f.model || tickers.has(x.ticker) || names.has(x.company_name)),
  );
  const risks = approved(registry?.risks).filter((r) => !f.stage || r.stage_id === f.stage);
  return { companies, facilities, risks };
}

export function approved(rows) {
  return (rows || []).filter((r) => r.review_status == null || r.review_status === 'approved');
}

/** Facilities per state, for the tile map. */
export function facilitiesByState(facilities) {
  const out = {};
  for (const f of facilities || []) {
    if (!f.state_code) continue;
    out[f.state_code] = (out[f.state_code] || 0) + 1;
  }
  return out;
}

/**
 * Incentives per state, each award counted ONCE per state however many of
 * that state's sites it is split across (spec: never sum the same award once
 * per site). `facilities[].awards` carries { id, amount_usd, source, status }.
 */
export function incentivesByState(facilities, { source = null } = {}) {
  const seen = new Map(); // state -> Set(award id)
  const totals = {};
  for (const f of facilities || []) {
    for (const a of f.awards || []) {
      if (source && a.source !== source) continue;
      const st = f.state_code;
      if (!st || a.amount_usd == null) continue;
      if (!seen.has(st)) seen.set(st, new Set());
      if (seen.get(st).has(a.id)) continue;
      seen.get(st).add(a.id);
      totals[st] = (totals[st] || 0) + Number(a.amount_usd);
    }
  }
  return totals;
}

/**
 * Investment pipeline. Private investment and CHIPS incentives are separate
 * series and are never added together. Private investment takes the MAX
 * announced figure per project_group (phases of one project restate the
 * same money); incentives dedupe by award id and split by status.
 */
export function investmentPipeline(facilities) {
  const byGroup = new Map();
  for (const f of facilities || []) {
    const v = Number(f.announced_investment_usd);
    if (!Number.isFinite(v) || v <= 0) continue;
    const g = f.project_group || f.id || `${f.company_name}:${f.city}`;
    byGroup.set(g, Math.max(byGroup.get(g) || 0, v));
  }
  const privateUsd = [...byGroup.values()].reduce((a, b) => a + b, 0);
  const awards = new Map();
  for (const f of facilities || [])
    for (const a of f.awards || []) if (a?.id) awards.set(`${a.source}:${a.id}`, a);
  const incentives = { final: 0, proposed: 0, obligated: 0 };
  for (const a of awards.values()) {
    const v = Number(a.amount_usd) || 0;
    if (a.source === 'usaspending') incentives.obligated += v;
    else if (a.status === 'final') incentives.final += v;
    else if (a.status === 'proposed') incentives.proposed += v;
  }
  return { privateUsd, projects: byGroup.size, incentives, awards: awards.size };
}

/** "$4.7B" style, mono in the UI. Null in, null out. */
export function usdCompact(n) {
  const v = Number(n);
  if (n == null || !Number.isFinite(v)) return null;
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

/** A metric value with its unit, e.g. 12% or $264.6B. */
export function formatMetric(m) {
  if (!m) return null;
  const v = Number(m.value);
  if (!Number.isFinite(v)) return null;
  if (m.unit === 'usd') return usdCompact(v);
  if (m.unit === 'pct' || m.unit === '%') return `${v.toFixed(v < 10 ? 1 : 0)}%`;
  if (m.unit === 'people' || m.unit === 'count') return v.toLocaleString('en-US');
  return `${v.toLocaleString('en-US')}${m.unit ? ` ${m.unit}` : ''}`;
}
