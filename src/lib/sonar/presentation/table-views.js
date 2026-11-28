/**
 * The tabular equivalent of every Sonar research visualization (Nov 28 2026). Each chart in
 * the library offers a table view with the same figures, for screen readers, for exact
 * values and for export. One function per component, all reading the normalized payload, so
 * the chart and its table can never disagree.
 *
 * -> { columns: [{ key, label, type, unit? }], rows: [{ id, ...values }] }
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-presentation.mjs.
 */
import { num } from './contracts';

const unitType = (unit) => {
  const u = String(unit || '').toLowerCase();
  if (u === 'percent' || u === '%') return 'percent';
  if (u === 'usd' || u === 'money' || u === 'currency') return 'money';
  return 'number';
};

function matrix(p) {
  const d = p.data || {};
  const series = d.series?.length ? d.series : [{ key: 'value', label: p.metric || 'Value' }];
  return {
    columns: [
      { key: 'period', label: 'Period', type: 'date' },
      ...series.map((s) => ({ key: s.key, label: s.label, type: unitType(p.unit), unit: p.unit })),
    ],
    rows: (d.columns || []).map((c, i) => {
      const row = { id: `${c.period}-${i}`, period: c.period };
      for (const s of series) row[s.key] = num(c[s.key]);
      return row;
    }),
  };
}

function ranking(p) {
  const snaps = p.data?.snapshots || [];
  const periods = snaps.map((s) => String(s.period));
  const byId = new Map();
  snaps.forEach((s, si) =>
    (s.rows || []).forEach((r) => {
      const id = String(r.id || r.label);
      if (!byId.has(id)) byId.set(id, { id, label: r.label });
      byId.get(id)[`p${si}`] = num(r.value);
    }),
  );
  const last = periods.length - 1;
  return {
    columns: [
      { key: 'label', label: p.data?.entityLabel || 'Name', type: 'text' },
      ...periods.map((per, i) => ({
        key: `p${i}`,
        label: per,
        type: unitType(p.unit),
        unit: p.unit,
      })),
    ],
    rows: [...byId.values()].sort(
      (a, b) => (num(b[`p${last}`]) ?? -Infinity) - (num(a[`p${last}`]) ?? -Infinity),
    ),
  };
}

function breakdown(p) {
  const parts = (p.data?.parts || []).filter((x) => num(x.value) !== null);
  const total = num(p.data?.total) ?? parts.reduce((a, x) => a + num(x.value), 0);
  const exclusive = Boolean(p.data?.exclusive);
  return {
    columns: [
      { key: 'label', label: 'Category', type: 'text' },
      { key: 'value', label: p.metric || 'Value', type: unitType(p.unit), unit: p.unit },
      ...(exclusive ? [{ key: 'share', label: 'Share', type: 'percent' }] : []),
    ],
    rows: parts.map((x) => ({
      id: x.key,
      label: x.label,
      value: num(x.value),
      ...(exclusive ? { share: total ? (num(x.value) / total) * 100 : null } : {}),
    })),
  };
}

function heatmap(p) {
  const d = p.data || {};
  return {
    columns: [
      { key: 'label', label: 'Name', type: 'text' },
      { key: 'group', label: 'Group', type: 'text' },
      {
        key: 'area',
        label: d.areaMeasure?.label || 'Size',
        type: unitType(d.areaMeasure?.unit),
        unit: d.areaMeasure?.unit,
      },
      {
        key: 'color',
        label: d.colorMeasure?.label || 'Colour',
        type: unitType(d.colorMeasure?.unit),
        unit: d.colorMeasure?.unit,
      },
    ],
    rows: (d.tiles || []).map((t, i) => ({
      id: t.id || `${t.label}-${i}`,
      label: t.label,
      group: t.group || null,
      area: num(t.area),
      color: num(t.color),
    })),
  };
}

function timeline(p) {
  const d = p.data || {};
  const events = new Map((d.events || []).map((e) => [String(e.x), e.label]));
  return {
    columns: [
      { key: 'x', label: 'Period', type: 'date' },
      { key: 'y', label: p.metric || 'Value', type: unitType(p.unit), unit: p.unit },
      { key: 'event', label: 'Event', type: 'text' },
    ],
    rows: (d.series || []).map((pt, i) => ({
      id: `${pt.x}-${i}`,
      x: pt.x,
      y: num(pt.y),
      event: events.get(String(pt.x)) || null,
    })),
  };
}

function securities(p) {
  return {
    columns: [
      { key: 'ticker', label: 'Ticker', type: 'ticker' },
      { key: 'name', label: 'Company', type: 'text' },
      { key: 'price', label: 'Price', type: 'money' },
      { key: 'changePct', label: 'Change', type: 'percent', signed: true },
    ],
    rows: (p.data?.rows || []).map((r) => ({
      id: r.ticker,
      ticker: r.ticker,
      name: r.name || null,
      price: num(r.price),
      changePct: num(r.changePct),
    })),
  };
}

const VIEWS = {
  'financial-activity-matrix': matrix,
  'ranking-evolution': ranking,
  'exposure-breakdown': breakdown,
  'investment-universe-heatmap': heatmap,
  'research-activity-timeline': timeline,
  'research-securities-monitor': securities,
  'financial-research-table': (p) => ({ columns: p.data?.columns || [], rows: p.data?.rows || [] }),
  /* Council cards that reuse a library implementation share its table view. */
  'council-portfolio-exposure': breakdown,
  'research-coverage-matrix': (p) => ({ columns: p.data?.columns || [], rows: p.data?.rows || [] }),
};

/** The table view of a payload, or null when its component has none. */
export function tableView(payload) {
  const fn = VIEWS[payload?.componentId];
  return fn ? fn(payload) : null;
}

/**
 * A one-paragraph text equivalent for screen readers: what the chart shows, its period and
 * its extremes. Never more than the figures the payload carries.
 */
export function textSummary(payload) {
  const t = tableView(payload);
  if (!t || !t.rows.length) return null;
  const valueCol = t.columns.find(
    (c) => c.type !== 'text' && c.type !== 'date' && c.type !== 'ticker',
  );
  const labelCol = t.columns.find(
    (c) => c.type === 'text' || c.type === 'date' || c.type === 'ticker',
  );
  const what = payload.title || payload.metric || 'This chart';
  const period = payload.period?.label ? ` for ${payload.period.label}` : '';
  if (!valueCol || !labelCol) return `${what}${period}: ${t.rows.length} rows.`;
  const vals = t.rows.filter((r) => num(r[valueCol.key]) !== null);
  if (!vals.length) return `${what}${period}: no values were returned.`;
  const hi = vals.reduce((a, r) => (num(r[valueCol.key]) > num(a[valueCol.key]) ? r : a));
  const lo = vals.reduce((a, r) => (num(r[valueCol.key]) < num(a[valueCol.key]) ? r : a));
  const missing = t.rows.length - vals.length;
  return `${what}${period}: ${t.rows.length} rows. Highest ${hi[labelCol.key]} at ${num(hi[valueCol.key]).toLocaleString('en-US')}; lowest ${lo[labelCol.key]} at ${num(lo[valueCol.key]).toLocaleString('en-US')}.${missing ? ` ${missing} with no value.` : ''}`;
}
